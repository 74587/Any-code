/**
 * Task Management Widgets - Claude Code 任务管理工具
 *
 * 支持 TaskCreate, TaskUpdate, TaskList, TaskGet 工具的渲染
 */

import React from "react";
import { CheckCircle2, Clock, Circle, Plus, RefreshCw, List, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-success" />,
  in_progress: <Clock className="h-4 w-4 text-info animate-pulse" />,
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  deleted: <Trash2 className="h-4 w-4 text-destructive" />,
};

const statusLabels: Record<string, string> = {
  completed: "已完成",
  in_progress: "进行中",
  pending: "待处理",
  deleted: "已删除",
};

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  in_progress: "bg-info/10 text-info border-info/20",
  pending: "bg-muted/10 text-muted-foreground border-muted/20",
  deleted: "bg-destructive/10 text-destructive border-destructive/20",
};

// ============================================================================
// TaskCreate Widget
// ============================================================================

export interface TaskCreateWidgetProps {
  subject?: string;
  description?: string;
  activeForm?: string;
  result?: any;
}

export const TaskCreateWidget: React.FC<TaskCreateWidgetProps> = ({
  subject,
  description,
  activeForm,
  result,
}) => {
  const isError = result?.is_error;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">创建任务</span>
        {isError && (
          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
            失败
          </Badge>
        )}
      </div>
      <div className="p-3 rounded-lg border bg-card/50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {statusIcons.pending}
          </div>
          <div className="flex-1 space-y-1">
            {subject && (
              <p className="text-sm font-medium">{subject}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
            {activeForm && (
              <p className="text-xs text-muted-foreground italic">
                {activeForm}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TaskUpdate Widget
// ============================================================================

export interface TaskUpdateWidgetProps {
  taskId?: string;
  status?: string;
  subject?: string;
  description?: string;
  activeForm?: string;
  result?: any;
}

export const TaskUpdateWidget: React.FC<TaskUpdateWidgetProps> = ({
  taskId,
  status,
  subject,
  activeForm,
  result,
}) => {
  const isError = result?.is_error;
  const displayStatus = status || "pending";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">更新任务</span>
        {taskId && (
          <Badge variant="outline" className="text-xs">#{taskId}</Badge>
        )}
        {isError && (
          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
            失败
          </Badge>
        )}
      </div>
      <div className="p-3 rounded-lg border bg-card/50">
        <div className="flex items-center gap-3">
          <div>{statusIcons[displayStatus] || statusIcons.pending}</div>
          <div className="flex-1">
            {subject && (
              <p className="text-sm font-medium">{subject}</p>
            )}
            {activeForm && (
              <p className="text-xs text-muted-foreground italic">{activeForm}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn("text-xs", statusColors[displayStatus])}
          >
            {statusLabels[displayStatus] || displayStatus}
          </Badge>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TaskList Widget
// ============================================================================

export interface TaskListWidgetProps {
  result?: any;
}

export const TaskListWidget: React.FC<TaskListWidgetProps> = ({ result }) => {
  // Parse tasks from result
  let tasks: any[] = [];
  if (result?.content) {
    if (Array.isArray(result.content)) {
      tasks = result.content;
    } else if (typeof result.content === 'string') {
      try {
        const parsed = JSON.parse(result.content);
        tasks = Array.isArray(parsed) ? parsed : parsed.tasks || [];
      } catch {
        // not JSON
      }
    } else if (result.content.tasks) {
      tasks = result.content.tasks;
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <List className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">任务列表</span>
        <Badge variant="outline" className="text-xs">{tasks.length} 项</Badge>
      </div>
      {tasks.length > 0 ? (
        <div className="space-y-1.5">
          {tasks.map((task: any, idx: number) => (
            <div
              key={task.id || idx}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg border bg-card/50",
                task.status === "completed" && "opacity-60"
              )}
            >
              <div>{statusIcons[task.status] || statusIcons.pending}</div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm truncate",
                  task.status === "completed" && "line-through"
                )}>
                  {task.subject || task.description || `Task #${task.id || idx}`}
                </p>
              </div>
              {task.id && (
                <span className="text-xs text-muted-foreground">#{task.id}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 rounded-lg border bg-card/50 text-sm text-muted-foreground">
          暂无任务
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TaskGet Widget
// ============================================================================

export interface TaskGetWidgetProps {
  taskId?: string;
  result?: any;
}

export const TaskGetWidget: React.FC<TaskGetWidgetProps> = ({ taskId, result }) => {
  // Parse task from result
  let task: any = null;
  if (result?.content) {
    if (typeof result.content === 'object' && !Array.isArray(result.content)) {
      task = result.content;
    } else if (typeof result.content === 'string') {
      try { task = JSON.parse(result.content); } catch { /* not JSON */ }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">查看任务</span>
        {taskId && (
          <Badge variant="outline" className="text-xs">#{taskId}</Badge>
        )}
      </div>
      {task ? (
        <div className="p-3 rounded-lg border bg-card/50 space-y-2">
          <div className="flex items-center gap-3">
            <div>{statusIcons[task.status] || statusIcons.pending}</div>
            <p className="text-sm font-medium flex-1">{task.subject || `Task #${taskId}`}</p>
            <Badge
              variant="outline"
              className={cn("text-xs", statusColors[task.status])}
            >
              {statusLabels[task.status] || task.status}
            </Badge>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground pl-7">{task.description}</p>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-lg border bg-card/50 text-sm text-muted-foreground">
          任务 #{taskId || '?'}
        </div>
      )}
    </div>
  );
};
