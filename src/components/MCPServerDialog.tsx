import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api, type MCPServerSpec } from "@/lib/api";

interface MCPServerDialogProps {
  /**
   * 是否打开对话框
   */
  open: boolean;
  /**
   * 关闭对话框的回调
   */
  onClose: () => void;
  /**
   * 引擎名称
   */
  engine: "claude" | "codex" | "gemini";
  /**
   * 编辑模式下的服务器 ID（为空表示新建）
   */
  serverId?: string;
  /**
   * 编辑模式下的服务器规范
   */
  serverSpec?: MCPServerSpec;
  /**
   * 保存成功的回调
   */
  onSaved: () => void;
}

/**
 * MCP 服务器添加/编辑对话框
 */
export const MCPServerDialog: React.FC<MCPServerDialogProps> = ({
  open,
  onClose,
  engine,
  serverId,
  serverSpec,
  onSaved,
}) => {
  const isEditMode = !!serverId;

  // 表单状态
  const [id, setId] = useState("");
  const [type, setType] = useState<"stdio" | "http" | "sse">("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [env, setEnv] = useState<Record<string, string>>({});
  const [cwd, setCwd] = useState("");
  const [headers, setHeaders] = useState<Record<string, string>>({});

  // UI 状态
  const [saving, setSaving] = useState(false);
  const [newArgInput, setNewArgInput] = useState("");
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  // 初始化表单（编辑模式）
  useEffect(() => {
    if (open) {
      if (isEditMode && serverSpec) {
        setId(serverId || "");
        setType((serverSpec.type as "stdio" | "http" | "sse") || "stdio");
        setCommand(serverSpec.command || "");
        setArgs(serverSpec.args || []);
        setUrl(serverSpec.url || "");
        setEnv(serverSpec.env || {});
        setCwd(serverSpec.cwd || "");
        setHeaders(serverSpec.headers || {});
      } else {
        // 新建模式：重置表单
        setId("");
        setType("stdio");
        setCommand("");
        setArgs([]);
        setUrl("");
        setEnv({});
        setCwd("");
        setHeaders({});
      }
    }
  }, [open, isEditMode, serverId, serverSpec]);

  /**
   * 添加参数
   */
  const handleAddArg = () => {
    if (newArgInput.trim()) {
      setArgs([...args, newArgInput.trim()]);
      setNewArgInput("");
    }
  };

  /**
   * 移除参数
   */
  const handleRemoveArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  /**
   * 添加环境变量
   */
  const handleAddEnv = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      setEnv({ ...env, [newEnvKey.trim()]: newEnvValue.trim() });
      setNewEnvKey("");
      setNewEnvValue("");
    }
  };

  /**
   * 移除环境变量
   */
  const handleRemoveEnv = (key: string) => {
    const newEnv = { ...env };
    delete newEnv[key];
    setEnv(newEnv);
  };

  /**
   * 添加请求头
   */
  const handleAddHeader = () => {
    if (newHeaderKey.trim() && newHeaderValue.trim()) {
      setHeaders({ ...headers, [newHeaderKey.trim()]: newHeaderValue.trim() });
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  /**
   * 移除请求头
   */
  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    setHeaders(newHeaders);
  };

  /**
   * 保存服务器
   */
  const handleSave = async () => {
    // 验证
    if (!id.trim()) {
      alert("请输入服务器 ID");
      return;
    }

    if (type === "stdio" && !command.trim()) {
      alert("stdio 类型必须填写 command");
      return;
    }

    if ((type === "http" || type === "sse") && !url.trim()) {
      alert(`${type} 类型必须填写 URL`);
      return;
    }

    setSaving(true);

    try {
      // 构建服务器规范
      const spec: MCPServerSpec = {
        type,
        ...(type === "stdio" && {
          command,
          ...(args.length > 0 && { args }),
          ...(cwd && { cwd }),
          ...(Object.keys(env).length > 0 && { env }),
        }),
        ...((type === "http" || type === "sse") && {
          url,
          ...(Object.keys(headers).length > 0 && { headers }),
        }),
      };

      // 调用 API
      await api.mcpUpsertEngineServer(engine, id.trim(), spec);

      // 成功后关闭对话框并刷新
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save MCP server:", error);
      alert(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "编辑" : "添加"} MCP 服务器 - {engine.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Server ID */}
          <div>
            <Label htmlFor="server-id">服务器 ID *</Label>
            <Input
              id="server-id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="my-mcp-server"
              disabled={isEditMode}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isEditMode ? "编辑模式下无法修改 ID" : "唯一标识符，不可重复"}
            </p>
          </div>

          {/* Transport Type */}
          <div>
            <Label htmlFor="transport-type">传输类型 *</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger id="transport-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">stdio (标准输入输出)</SelectItem>
                <SelectItem value="http">http (HTTP 流式)</SelectItem>
                <SelectItem value="sse">sse (Server-Sent Events)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* stdio 配置 */}
          {type === "stdio" && (
            <>
              {/* Command */}
              <div>
                <Label htmlFor="command">命令 *</Label>
                <Input
                  id="command"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="node"
                />
              </div>

              {/* Args */}
              <div>
                <Label>参数（可选）</Label>
                <div className="space-y-2">
                  {args.map((arg, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={arg} disabled className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArg(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newArgInput}
                      onChange={(e) => setNewArgInput(e.target.value)}
                      placeholder="添加参数..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddArg();
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={handleAddArg}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Working Directory */}
              <div>
                <Label htmlFor="cwd">工作目录（可选）</Label>
                <Input
                  id="cwd"
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="/path/to/working/directory"
                />
              </div>

              {/* Environment Variables */}
              <div>
                <Label>环境变量（可选）</Label>
                <div className="space-y-2">
                  {Object.entries(env).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input value={key} disabled className="flex-1" />
                      <span className="text-muted-foreground">=</span>
                      <Input value={value} disabled className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEnv(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newEnvKey}
                      onChange={(e) => setNewEnvKey(e.target.value)}
                      placeholder="KEY"
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">=</span>
                    <Input
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      placeholder="value"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddEnv();
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={handleAddEnv}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* http/sse 配置 */}
          {(type === "http" || type === "sse") && (
            <>
              {/* URL */}
              <div>
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                />
              </div>

              {/* Headers */}
              <div>
                <Label>请求头（可选）</Label>
                <div className="space-y-2">
                  {Object.entries(headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input value={key} disabled className="flex-1" />
                      <span className="text-muted-foreground">:</span>
                      <Input value={value} disabled className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveHeader(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newHeaderKey}
                      onChange={(e) => setNewHeaderKey(e.target.value)}
                      placeholder="Header-Name"
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">:</span>
                    <Input
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                      placeholder="value"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddHeader();
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={handleAddHeader}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
