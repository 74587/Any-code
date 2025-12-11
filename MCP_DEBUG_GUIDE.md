# MCP 多应用配置读取调试指南

## 📋 问题现象

根据截图，当前状态：
- **总计**：6 个服务器
- **Claude**: 0 个 ❌
- **Codex**: 0 个 ❌
- **Gemini**: 6 个 ✅

**问题**：Claude 和 Codex 的配置未被正确读取。

---

## 🔍 诊断步骤

### 步骤 1：检查配置文件是否存在

运行应用，查看日志输出，应该看到类似：

```
[INFO] 开始获取统一的 MCP 服务器视图
[INFO] 从 Claude 读取到 X 个 MCP 服务器
[INFO] 从 Gemini 读取到 6 个 MCP 服务器
[INFO] 配置读取完成 - Claude: X 个, Codex: 0 个, Gemini: 6 个
```

### 步骤 2：手动检查配置文件

#### Windows 路径：
```powershell
# Claude 配置
type %USERPROFILE%\.claude.json
type %USERPROFILE%\.claude\settings.json

# Codex 配置（路径待确认）
type %USERPROFILE%\.codex\settings.toml

# Gemini 配置
type %USERPROFILE%\.gemini\settings.json
```

#### Linux/Mac 路径：
```bash
# Claude 配置
cat ~/.claude.json
cat ~/.claude/settings.json

# Gemini 配置
cat ~/.gemini/settings.json
```

### 步骤 3：检查配置文件格式

正确的 Claude 配置格式：
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["server.js"],
      "env": {}
    }
  }
}
```

---

## 🐛 可能的问题

### 问题 1：配置文件不存在

**原因**：从未在 Claude/Codex 中配置过 MCP 服务器

**解决方案**：
1. 打开 Claude Desktop 或 Codex
2. 在其 MCP 设置中添加服务器
3. 或使用"导入"功能将 Gemini 的配置导入到 Claude

### 问题 2：配置文件路径错误

**当前路径逻辑** (`claude_mcp.rs`第 18-26 行):
```rust
fn user_config_path() -> PathBuf {
    let home_dir = dirs::home_dir().expect("Failed to get home directory");

    // 优先使用 ~/.claude/settings.json
    let new_path = home_dir.join(".claude").join("settings.json");
    if new_path.exists() {
        return new_path;
    }

    // 回退到 ~/.claude.json
    home_dir.join(".claude.json")
}
```

**检查**：
- 确认 `dirs::home_dir()` 返回正确的用户目录
- 在 Windows 上应该是 `C:\Users\<用户名>`
- 在 Linux/Mac 上应该是 `/home/<用户名>`

### 问题 3：读取权限问题

**检查权限**：
```powershell
# Windows
icacls %USERPROFILE%\.claude.json
icacls %USERPROFILE%\.gemini\settings.json
```

### 问题 4：JSON 解析错误

**可能原因**：配置文件格式不正确

**检查**：
1. 使用 JSON 验证器验证文件格式
2. 查看日志中的解析错误信息

---

## 🔧 修复方案

### 方案 1：添加详细日志

在 `claude_mcp.rs` 的 `read_mcp_servers_map()` 中添加日志：

```rust
pub fn read_mcp_servers_map() -> Result<HashMap<String, Value>, String> {
    let path = user_config_path();

    log::info!("尝试读取 Claude 配置文件: {}", path.display());

    if !path.exists() {
        log::warn!("Claude 配置文件不存在: {}", path.display());
        return Ok(HashMap::new());
    }

    log::info!("Claude 配置文件存在，开始读取...");

    let root = read_json_value(&path)?;

    log::info!("Claude 配置文件已解析");

    let servers = root
        .get("mcpServers")
        .and_then(|v| v.as_object())
        .map(|(obj| obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
        .unwrap_or_default();

    log::info!("从 Claude 配置读取到 {} 个服务器", servers.len());

    Ok(servers)
}
```

### 方案 2：验证配置文件内容

添加测试命令读取并打印配置：

```rust
#[tauri::command]
pub async fn mcp_debug_read_claude_config() -> Result<String, String> {
    let path = crate::claude_mcp::user_config_path();
    if !path.exists() {
        return Ok(format!("配置文件不存在: {:?}", path));
    }

    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(format!("文件内容：\n{}", content)),
        Err(e) => Err(format!("读取失败: {}", e)),
    }
}
```

### 方案 3：手动同步配置

如果 Claude 配置存在但未被识别，手动同步：

```typescript
// 前端调用
const servers = await api.mcpImportFromApp("claude");
console.log("Imported from Claude:", servers);
```

---

## ✅ 验证修复

修复后，应该看到：

```
头部显示：
6 个服务器 · Claude: 6 · Codex: 0 · Gemini: 6

每个服务器的开关：
auggie-mcp      Claude ☑  Codex ☐  Gemini ☑
Context7        Claude ☑  Codex ☐  Gemini ☑
...
```

---

## 🚀 快速修复建议

1. **运行应用并查看日志**
   - 查找 `[INFO] 配置读取完成` 日志
   - 确认每个应用读取的服务器数量

2. **手动检查配置文件**
   - 确认 Claude 配置文件存在
   - 确认包含 `mcpServers` 字段

3. **使用导入功能**
   - 如果配置文件格式不对，使用"导入"功能重新导入

4. **重启应用**
   - 有时需要重启应用重新加载配置

---

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. 应用日志输出
2. Claude 配置文件的内容（脱敏后）
3. 操作系统信息

我们会尽快帮您解决！
