/**
 * 上下文窗口使用指示器组件
 *
 * 显示当前会话的上下文窗口使用百分比
 * 参考 Claude Code v2.0.64 的 current_usage 功能
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Layers, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useContextWindowUsage } from '@/hooks/useContextWindowUsage';
import { USAGE_LEVEL_COLORS } from '@/types/contextWindow';
import { cn } from '@/lib/utils';
import type { ClaudeStreamMessage } from '@/types/claude';

export interface ContextWindowIndicatorProps {
  /** 会话消息列表 */
  messages: ClaudeStreamMessage[];
  /** 当前使用的模型 */
  model?: string;
  /** 引擎类型（claude/codex/gemini） */
  engine?: string;
  /** 是否显示（需要有消息时才显示） */
  show?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 上下文窗口使用指示器
 *
 * 显示一个带有进度条和百分比的 Badge，悬停时显示详细信息
 * 支持多引擎（Claude/Codex）
 */
export const ContextWindowIndicator: React.FC<ContextWindowIndicatorProps> = ({
  messages,
  model,
  engine,
  show = true,
  className,
}) => {
  const { t } = useTranslation();
  const [showPopover, setShowPopover] = React.useState(false);

  const usage = useContextWindowUsage(messages, model, engine);
  const colors = USAGE_LEVEL_COLORS[usage.level];

  // 如果没有数据或不显示，返回 null
  if (!show || !usage.hasData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
      className={className}
    >
      <Popover
        open={showPopover}
        onOpenChange={setShowPopover}
        trigger={
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 h-8 cursor-default hover:bg-accent transition-colors border-border/50',
              colors.border
            )}
          >
            <Layers className={cn('h-3 w-3', colors.text)} />
            {/* 迷你进度条 */}
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-300', colors.progress)}
                style={{ width: `${Math.min(usage.percentage, 100)}%` }}
              />
            </div>
            <span className={cn('font-mono text-xs', colors.text)}>
              {usage.formattedPercentage}
            </span>
            <Info className="h-3 w-3 text-muted-foreground ml-0.5" />
          </Badge>
        }
        content={
          <div className="space-y-3">
            {/* 标题 */}
            <div className="font-medium text-sm border-b pb-2 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t('contextWindow.title', '上下文窗口使用情况')}
            </div>

            {/* 进度条 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {t('contextWindow.usage', '使用率')}
                </span>
                <span className={cn('font-mono font-medium', colors.text)}>
                  {usage.formattedPercentage}
                </span>
              </div>
              <Progress
                value={usage.percentage}
                className={cn('h-2', colors.bg)}
              />
              <div className="text-xs text-muted-foreground text-center">
                {usage.formattedTokens}
              </div>
            </div>

            {/* Token 详情 */}
            <div className="space-y-1 text-xs border-t pt-2">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('contextWindow.inputTokens', '输入 Tokens')}:
                </span>
                <span className="font-mono">
                  {usage.breakdown.inputTokens.toLocaleString()}
                </span>
              </div>
              {usage.breakdown.cacheCreationTokens > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {t('contextWindow.cacheCreation', '缓存创建')}:
                  </span>
                  <span className="font-mono">
                    {usage.breakdown.cacheCreationTokens.toLocaleString()}
                  </span>
                </div>
              )}
              {usage.breakdown.cacheReadTokens > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {t('contextWindow.cacheRead', '缓存读取')}:
                  </span>
                  <span className="font-mono">
                    {usage.breakdown.cacheReadTokens.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                <span className="text-muted-foreground">
                  {t('contextWindow.outputTokens', '输出 Tokens')}:
                </span>
                <span className="font-mono text-muted-foreground">
                  {usage.breakdown.outputTokens.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 提示信息 */}
            {usage.level === 'critical' && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {t('contextWindow.criticalWarning', '上下文窗口接近上限，建议开始新会话')}
              </div>
            )}
            {usage.level === 'high' && (
              <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                {t('contextWindow.highWarning', '上下文使用率较高')}
              </div>
            )}
          </div>
        }
        side="top"
        align="center"
        className="w-64"
      />
    </motion.div>
  );
};

export default ContextWindowIndicator;
