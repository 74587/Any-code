/**
 * SuggestionOverlay Component
 *
 * 在输入框中显示灰色的建议文字叠加层
 * 类似 Claude Code 2.0.67 的 Prompt Suggestions 功能
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { PromptSuggestion } from '../hooks/usePromptSuggestion';

interface SuggestionOverlayProps {
  /** 当前建议 */
  suggestion: PromptSuggestion | null;
  /** 用户当前输入 */
  currentPrompt: string;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 计算建议中应该显示的补全部分
 */
function getCompletionText(suggestion: string, currentPrompt: string): string {
  const trimmedPrompt = currentPrompt.trim();

  // 如果用户没有输入，显示完整建议
  if (!trimmedPrompt) {
    return suggestion;
  }

  // 如果建议以用户输入开头（不区分大小写），显示剩余部分
  const suggestionLower = suggestion.toLowerCase();
  const promptLower = trimmedPrompt.toLowerCase();

  if (suggestionLower.startsWith(promptLower)) {
    return suggestion.slice(trimmedPrompt.length);
  }

  // 否则显示完整建议（作为替代）
  return suggestion;
}

/**
 * SuggestionOverlay - 建议文字叠加层
 */
export const SuggestionOverlay: React.FC<SuggestionOverlayProps> = ({
  suggestion,
  currentPrompt,
  isLoading = false,
  className,
}) => {
  // 如果没有建议或正在加载，不显示
  if (!suggestion || isLoading) {
    return null;
  }

  const completionText = getCompletionText(suggestion.text, currentPrompt);

  // 如果没有补全文本，不显示
  if (!completionText) {
    return null;
  }

  // 判断是否为完整替代（用户输入与建议不匹配）
  const isFullReplacement = completionText === suggestion.text && currentPrompt.trim().length > 0;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-start",
        "px-3 py-2 text-sm",
        "overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {/* 占位：与用户输入等宽的透明区域 */}
      {!isFullReplacement && currentPrompt && (
        <span className="invisible whitespace-pre-wrap break-words">
          {currentPrompt}
        </span>
      )}

      {/* 建议文本 */}
      <span
        className={cn(
          "whitespace-pre-wrap break-words",
          isFullReplacement
            ? "text-muted-foreground/40 italic" // 完整替代用斜体
            : "text-muted-foreground/50", // 补全用正常样式
        )}
      >
        {isFullReplacement ? `💡 ${completionText}` : completionText}
      </span>
    </div>
  );
};

/**
 * SuggestionHint - Tab 提示组件
 */
interface SuggestionHintProps {
  visible: boolean;
  className?: string;
}

export const SuggestionHint: React.FC<SuggestionHintProps> = ({
  visible,
  className,
}) => {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute right-12 bottom-2",
        "flex items-center gap-1",
        "text-xs text-muted-foreground/60",
        "pointer-events-none select-none",
        "transition-opacity duration-200",
        className
      )}
    >
      <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 font-mono text-[10px]">
        Tab
      </kbd>
      <span>接受</span>
    </div>
  );
};

export default SuggestionOverlay;
