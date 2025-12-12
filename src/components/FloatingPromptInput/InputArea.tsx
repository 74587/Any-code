import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { FilePicker } from "../FilePicker";
import { SuggestionOverlay, SuggestionHint } from "./components/SuggestionOverlay";
import type { PromptSuggestion } from "./hooks/usePromptSuggestion";

interface InputAreaProps {
  prompt: string;
  disabled?: boolean;
  dragActive: boolean;
  showFilePicker: boolean;
  projectPath?: string;
  filePickerQuery: string;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onExpand: () => void;
  onFileSelect: (file: any) => void;
  onFilePickerClose: () => void;
  // 🔧 Mac 输入法兼容：composition 事件
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
  // 🆕 Prompt Suggestions
  suggestion?: PromptSuggestion | null;
  isSuggestionLoading?: boolean;
}

export const InputArea = forwardRef<HTMLTextAreaElement, InputAreaProps>(({
  prompt,
  disabled,
  dragActive,
  showFilePicker,
  projectPath,
  filePickerQuery,
  onTextChange,
  onKeyDown,
  onPaste,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onExpand,
  onFileSelect,
  onFilePickerClose,
  onCompositionStart,
  onCompositionEnd,
  suggestion,
  isSuggestionLoading,
}, ref) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {/* 🆕 建议叠加层 */}
      <SuggestionOverlay
        suggestion={suggestion ?? null}
        currentPrompt={prompt}
        isLoading={isSuggestionLoading}
      />

      <Textarea
        ref={ref}
        value={prompt}
        onChange={onTextChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        // 🔧 Mac 输入法兼容：监听 composition 事件
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        placeholder={dragActive ? t('promptInput.placeholderDragActive') : t('promptInput.placeholder')}
        disabled={disabled}
        className={cn(
          "min-h-[56px] max-h-[300px] resize-none pr-10 overflow-y-auto",
          "bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20",
          dragActive && "border-primary ring-2 ring-primary/20",
          // 🆕 建议存在时文字颜色正常，让叠加层可见
          suggestion && "caret-primary"
        )}
        rows={1}
        style={{ height: 'auto' }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />

      {/* 🆕 Tab 提示 */}
      <SuggestionHint visible={!!suggestion && !isSuggestionLoading} />

      <Button
        variant="ghost"
        size="icon"
        onClick={onExpand}
        disabled={disabled}
        className="absolute right-1 bottom-1 h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={t('promptInput.expandInput')}
      >
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
      </Button>

      {/* File Picker */}
      <AnimatePresence>
        {showFilePicker && projectPath && projectPath.trim() && (
          <FilePicker
            basePath={projectPath.trim()}
            onSelect={onFileSelect}
            onClose={onFilePickerClose}
            initialQuery={filePickerQuery}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

InputArea.displayName = "InputArea";