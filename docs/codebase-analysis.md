# Any Code 代码库分析与静态审计报告（v5.9.8）

> 本报告基于当前工作区代码进行静态阅读与本地命令检查（不包含运行时动态调试），重点覆盖项目结构、核心业务链路、以及安全/质量风险点。

## 1. 范围与方法

### 1.1 覆盖范围
- 前端：`src/`（React + TypeScript + Vite + Tailwind）
- 后端：`src-tauri/`（Tauri v2 + Rust）
- 关键配置：`package.json`、`vite.config.ts`、`src-tauri/tauri.conf.json`、`src-tauri/capabilities/default.json`

### 1.2 分析方法（思路概述）
- 先用目录与入口文件定位整体架构：前端入口、后端入口、核心配置。
- 再按业务域分解：会话/项目管理、三引擎执行、流式事件、成本追踪、翻译、中间件与 MCP、窗口管理。
- 最后对高风险接口与配置进行静态审计：权限边界、外部进程执行、SQL/文件路径、敏感信息处理、依赖漏洞。

### 1.3 运行的本地静态检查命令
- TypeScript 类型检查：`npx --no-install tsc -p tsconfig.json --noEmit`
- Rust 编译检查：`cargo check`（`src-tauri/`）
- Node 依赖审计：`npm audit --omit=dev`（runtime 依赖）

> 说明：尝试安装并运行 `cargo-audit` 进行 Rust 依赖 CVE 扫描，但在本环境网络超时未完成安装。

## 2. 项目结构与入口

### 2.1 顶层结构
- 前端源码：`src/`
- Tauri 后端：`src-tauri/`
- 构建产物：`dist/`（注意：通常不建议入库；以仓库实际策略为准）
- 其他：`docs/`、`scripts/`

### 2.2 前端入口与顶层 Provider
- 入口：`src/main.tsx`
  - `AppWrapper`：根据 URL 参数区分主窗口与独立会话窗口（`isSessionWindow()`），并异步初始化 `toolRegistry`（`initializeToolRegistry`）。
- 主组件：`src/App.tsx`
  - Provider 链：`UpdateProvider` → `OutputCacheProvider` → `NavigationProvider` → `ProjectProvider` → `TabProvider` → `AppLayout` → `ViewRouter`

### 2.3 后端入口与命令注册
- 后端入口：`src-tauri/src/main.rs`
  - 统一 `invoke_handler(tauri::generate_handler![...])` 注册大量 Tauri 命令。
  - 初始化全局状态：`ProcessRegistryState`、`ClaudeProcessState`、`CodexProcessState`、`GeminiProcessState`、以及 SQLite `AgentDb`。

## 3. 运行时架构（关键链路）

整体调用链（典型）：
1) 前端 UI 触发（发送 Prompt / 切换引擎 / 取消执行等）  
2) 通过 `src/lib/api.ts` 调用 `invoke('xxx', payload)`  
3) Rust 后端命令执行：文件系统/配置读写/启动 CLI 子进程  
4) 后端通过 Tauri Event `emit` 流式推送（stdout/stderr 解析为 JSON/JSONL）  
5) 前端通过 `@tauri-apps/api/event.listen` 监听事件，写入 `MessagesContext` / Tab 状态  
6) UI 组件渲染消息（Markdown/工具调用/成本统计/翻译等）

## 4. 业务域深挖

### 4.1 项目与会话管理

#### 4.1.1 Claude 项目与会话
- 后端项目模型：`src-tauri/src/commands/claude/models.rs`（`Project`, `Session`）
- Claude 会话落盘：`~/.claude/projects/{encode_project_path(project_path)}/{session_id}.jsonl`
- 前端加载入口：`src/contexts/ProjectContext.tsx`
  - `loadProjects()`：`api.listProjects()` 并结合 `api.listCodexSessions()` 计算“最后活跃时间”
  - `selectProject()`：`api.getProjectSessions(project.id, project.path)`（Claude/Codex） + `api.listGeminiSessions(project.path)`（Gemini，前端转换为统一 `Session`）

#### 4.1.2 Codex 会话
- 会话目录：`~/.codex/sessions/...`（按日期层级组织，具体由 `get_codex_sessions_dir` 抽象；Windows/WSL 通过 UNC 访问）
- 后端入口：`src-tauri/src/commands/codex/session.rs`
  - `list_codex_sessions` / `load_codex_session_history` / `delete_codex_session`

#### 4.1.3 Gemini 会话
- Gemini CLI 数据目录：`~/.gemini`
- 会话目录：`~/.gemini/tmp/{sha256(project_path)}/chats/*.json`（见 `hash_project_path` / `get_gemini_sessions_dir`）
- 配置文件：`~/.anycode/gemini.json`（`api_key`、`env` 等可能包含敏感信息）
- 后端入口：`src-tauri/src/commands/gemini/config.rs`、`src-tauri/src/commands/gemini/session.rs`

### 4.2 三引擎执行与统一消息模型

#### 4.2.1 前端统一执行入口
- UI 执行组件：`src/components/ClaudeCodeSession.tsx`
  - 使用 `usePromptExecution` 统一分发 Claude/Codex/Gemini 执行逻辑
- 核心 Hook：`src/hooks/usePromptExecution.ts`
  - 关键点：
    - 根据 `executionEngine` 分支注册不同事件监听器，并支持 “session-specific channel” 隔离
    - Codex 使用 `new CodexEventConverter()`（会话级实例，避免多 Tab 共享污染）
    - Gemini 监听 `gemini-session-init` 后再切换到 `gemini-output:{sessionId}` 等专用通道

#### 4.2.2 Claude 执行（后端）
- 命令：`src-tauri/src/commands/claude/cli_runner.rs`
  - `execute_claude_code` / `continue_claude_code` / `resume_claude_code` / `cancel_claude_execution`
  - 已采用 **stdin 传递 prompt**（避免命令行长度限制与转义问题）
- 主要事件：
  - 输出：`claude-output`、`claude-output:{session_id}`
  - 错误：`claude-error`、`claude-error:{session_id}`
  - 状态：`claude-session-state`
  - 完成：`claude-complete`

#### 4.2.3 Codex 执行（后端）
- 命令：`src-tauri/src/commands/codex/session.rs`
  - `execute_codex` / `resume_codex` / `resume_last_codex` / `cancel_codex`
  - stdout 读取 JSONL，每行透传给前端；prompt 同样通过 stdin
- 主要事件：
  - 初始化：`codex-session-init`（前端据此绑定到 session-specific 通道）
  - 输出：`codex-output`、`codex-output:{session_id}`
  - 完成：`codex-complete`、`codex-complete:{session_id}`

#### 4.2.4 Gemini 执行（后端）
- 命令：`src-tauri/src/commands/gemini/session.rs`
  - `execute_gemini` / `cancel_gemini` / `check_gemini_installed`
  - 输出解析：`src-tauri/src/commands/gemini/parser.rs` 将 Gemini JSONL 事件转换为近似 `ClaudeStreamMessage` 的 JSON
- 主要事件：
  - 初始化：`gemini-session-init`
  - CLI session id（真实 Gemini 会话 ID）：`gemini-cli-session-id`
  - 输出：`gemini-output`、`gemini-output:{session_id}`
  - 错误：`gemini-error`、`gemini-error:{session_id}`
  - 完成：`gemini-complete`、`gemini-complete:{session_id}`
  - 取消：`gemini-cancelled`、`gemini-cancelled:{session_id}`

#### 4.2.5 统一消息类型
- 前端统一消息类型：`src/types/claude.ts`（`ClaudeStreamMessage`）
  - 支持 `codexMetadata`、`geminiMetadata` 等扩展字段用于来源标识/兼容转换

### 4.3 成本/用量追踪
- 前端会话内实时计算：
  - `src/lib/tokenExtractor.ts`、`src/lib/pricing.ts`、`src/lib/sessionCost.ts`
  - `src/hooks/useSessionCostCalculation.ts`
- 后端全局统计：
  - `src-tauri/src/commands/usage.rs`：解析 Claude JSONL 生成聚合统计（by_model/by_date/by_project）
- SQLite `usage_entries` 表：
  - 定义位于 `src-tauri/src/commands/storage.rs:init_database`（注意：目前与 `usage.rs` 的 JSONL 解析逻辑并行存在，统计口径可能不一致）

### 4.4 翻译中间件
- 前端：`src/lib/translationMiddleware.ts`（队列/速率限制/缓存）
- 后端：`src-tauri/src/commands/translator.rs`
  - 配置文件：`~/.claude/translation_config.json`（`api_key` 明文）
  - 缓存键：`from:to:text`（当前为全文作为 key，且无显式最大容量；存在内存增长风险）

### 4.5 MCP 与上下文增强（acemcp）
- 后端：`src-tauri/src/commands/acemcp.rs`
  - 通过嵌入 sidecar（Node `.cjs`）启动 MCP server，并提供 `preindex_project`/`enhance_prompt_with_context` 等命令
- 前端触发：`src/contexts/ProjectContext.tsx` 中 `api.preindexProject(project.path)`（后台索引）

### 4.6 多窗口（SessionWindow）
- 前端：`src/lib/windowManager.ts`（`createSessionWindow`/`emitWindowSyncEvent`/`window-sync`）
- 后端：`src-tauri/src/commands/window.rs`（窗口创建/聚焦/广播）

## 5. 静态审计发现（重点）

### 5.1 高风险（建议优先处理）

1) **Tauri 权限面过宽（能力配置 + CSP）**
- 能力配置：`src-tauri/capabilities/default.json`
  - `fs:allow-read/write/remove`、`http:default` 允许 `http(s)://*:*`、`shell:allow-open` 等均为广泛授权
- CSP：`src-tauri/tauri.conf.json` 中 `script-src 'unsafe-eval'`、`connect-src https://* http://*`、`assetProtocol.scope ["**"]`
- 风险：一旦前端出现 XSS/供应链注入，可能直接读写本地文件、执行外部打开、并向任意域名出站请求（数据外泄/RCE 链路变短）。
- 建议：按功能拆分 capability（最小授权），将网络与文件范围缩到可信域/目录；生产构建移除 `unsafe-eval`（如必须保留，需评估依赖并替换相关实现）。

2) **任意 SQL 执行接口**
- `src-tauri/src/commands/storage.rs:storage_execute_sql` 接收任意 SQL，SELECT/非 SELECT 都可执行。
- 风险：在宽权限模型下，若前端被注入或恶意脚本调用该命令，可破坏/窃取本地数据库数据（并可能联动其他能力进行外泄）。
- 建议：默认仅允许只读 SELECT；或增加“强确认 + 只对开发模式开放”；同时对 `PRAGMA`/`ATTACH`/`DROP` 等危险语句做拦截。

3) **外部命令执行（Hook/MCP 等）**
- `src-tauri/src/commands/enhanced_hooks.rs` 存在 `Command::new(\"bash\").arg(\"-c\").arg(&hook.command)`（可执行用户自定义命令）。
- MCP/Sidecar/CLI 执行同样属于强能力模块。
- 建议：对“执行任意命令”功能增加显式风险提示、权限开关、以及在 UI/配置层做“默认关闭 + 白名单”。

### 5.2 中风险

1) **敏感信息落盘为明文**
- Gemini：`~/.anycode/gemini.json`（可能包含 `api_key`、`env`）
- 翻译：`~/.claude/translation_config.json`（包含 `api_key`）
- Codex：`~/.codex/workbench_config.json`（provider key 可能存在，需结合 `src-tauri/src/commands/wsl_utils.rs` 与 codex config 实现确认）
- 建议：使用系统密钥链/安全存储（Windows Credential Manager、macOS Keychain、Linux Secret Service）或 Tauri 官方安全存储方案。

2) **日志泄露风险（已做最小修复）**
- 问题：`execute_codex`/`execute_gemini` 曾 `{:?}` 打印 `options`，可能包含 prompt / api key；翻译模块 debug 日志打印原文与译文。
- 修复：已将日志改为仅打印非敏感元信息（长度/布尔标记等）。
  - `src-tauri/src/commands/codex/session.rs`
  - `src-tauri/src/commands/gemini/session.rs`
  - `src-tauri/src/commands/translator.rs`

3) **npm runtime 依赖存在 4 个 Moderate 漏洞**
- 摘要：`npm audit --omit=dev` 结果为 `moderate=4`
- 涉及包：`prismjs`（GHSA-x7hr-w5r2-h6wg）、`mdast-util-to-hast`（GHSA-4fh9-h7wg-q85m）、以及链路影响到 `refractor`/`react-syntax-highlighter`
- 建议：评估升级到修复版本；由于本应用为 Tauri 桌面应用，前端漏洞的危害面通常更大，优先级建议上调。

### 5.3 低风险/质量问题

1) **Rust 编译警告（unused import / dead code）**
- `cargo check` 输出存在多处未使用导入与死代码（例如 MCP 模块、Gemini parser helpers 等）。
- 建议：在功能稳定后做一次 `cargo fix`/清理以减少维护成本与潜在误用。

2) **前端 `src/lib/api.ts` 文件过大**
- 该文件集中包含大量 `invoke` 封装与类型定义（约数千行），可维护性与可测试性受影响。
- 建议：按业务域拆分（projects/sessions/engines/storage/translator/mcp/window 等）。

## 6. 建议的整改优先级（可执行清单）

P0（安全底线）
- 收紧 `src-tauri/capabilities/default.json`（至少将 `http` 与 `fs` 限制到实际需要范围）
- 生产 CSP 移除或替代 `unsafe-eval`（评估依赖后逐步替换）
- 将 `storage_execute_sql` 改为只读或 gated（开发模式/强确认）

P1（敏感信息与供应链）
- 将 `api_key` 等敏感信息迁移到系统安全存储（并提供导入/迁移脚本）
- 升级 `prismjs`、`mdast-util-to-hast` 及相关链路依赖到修复版本

P2（工程质量）
- 清理 `cargo check` 警告与未使用代码/导入
- 拆分 `src/lib/api.ts`，为核心命令封装添加最小单元测试（如果仓库已有测试体系）

