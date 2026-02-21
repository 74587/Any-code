/**
 * Task Management Widgets - Claude Code 任务管理工具
 *
 * 支持 TaskCreate, TaskUpdate, TaskList, TaskGet 工具的渲染
 */

import React from "react";
import { CheckCircle2, Clock, Circle, Plus, List, Eye, Trash2 } from "lucide-react";
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
}) => {
  return (
    <div className="flex items-center gap-2 py-1">
      <Plus className="h-4 w-4 text-primary" />
      <span className="text-xs text-muted-foreground">创建任务</span>
      {subject && (
        <span className="text-xs font-medium truncate max-w-[400px]">{subject}</span>
      )}
      {!subject && description && (
        <span className="text-xs text-muted-foreground truncate max-w-[400px]">{description}</span>
      )}
      {!subject && !description && activeForm && (
        <span className="text-xs text-muted-foreground italic">{activeForm}</span>
      )}
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
  const displayStatus = status || "pending";

  // Try to extract subject from result if not in input
  const displaySubject = subject
    || result?.content?.subject
    || activeForm
    || (typeof result?.content === 'string' ? result.content : null);

  return (
    <div className="flex items-center gap-2 py-1">
      {statusIcons[displayStatus] || statusIcons.pending}
      <span className="text-xs text-muted-foreground">任务</span>
      {taskId && (
        <Badge variant="outline" className="text-xs px-1.5 py-0">#{taskId}</Badge>
      )}
      <Badge
        variant="outline"
        className={cn("text-xs px-1.5 py-0", statusColors[displayStatus])}
      >
        {statusLabels[displayStatus] || displayStatus}
      </Badge>
      {displaySubject && (
        <span className="text-xs text-muted-foreground truncate max-w-[300px]">{displaySubject}</span>
      )}
    </div>
  );
};

// ============================================================================
// TaskList Widget
// ============================================================================

export interface TaskListWidgetProps {
  result?: any;
}

export const TaskListWidget: React.FC<TaskListWidgetProps> = () => {
  return (
    <div className="flex items-center gap-2 py-1">
      <List className="h-4 w-4 text-primary" />
      <span className="text-xs text-muted-foreground">查看任务列表</span>
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

export const TaskGetWidget: React.FC<TaskGetWidgetProps> = ({ taskId }) => {
  return (
    <div className="flex items-center gap-2 py-1">
      <Eye className="h-4 w-4 text-primary" />
      <span className="text-xs text-muted-foreground">查看任务</span>
      {taskId && (
        <Badge variant="outline" className="text-xs px-1.5 py-0">#{taskId}</Badge>
      )}
    </div>
  );
};
