import React, { useRef, forwardRef, useImperativeHandle } from 'react';

interface UnifiedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  children?: React.ReactNode; // For buttons/icons
  className?: string;
}

export interface UnifiedInputRef {
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
  selectionStart: number;
}

const UnifiedInput = forwardRef<UnifiedInputRef, UnifiedInputProps>(({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  onKeyDown,
  children,
  className = ""
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    setSelectionRange: (start: number, end: number) => {
      textareaRef.current?.setSelectionRange(start, end);
    },
    get selectionStart() {
      return textareaRef.current?.selectionStart || 0;
    }
  }));

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
    onKeyDown?.(e);
  };

  return (
    <div className={`flex-1 relative ${className}`}>
      {/* Slack-style input container */}
      <div className="flex items-end bg-white border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-sm">
        {/* Left side buttons/icons */}
        {children && (
          <div className="flex items-center space-x-1 px-3 py-2">
            {children}
          </div>
        )}
        
        {/* Text input */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-3 py-3 border-0 resize-none focus:ring-0 focus:outline-none text-sm placeholder-gray-500 leading-5 bg-transparent"
            style={{
              minHeight: '44px',
              maxHeight: '200px',
            }}
          />
        </div>
      </div>
    </div>
  );
});

UnifiedInput.displayName = 'UnifiedInput';

export default UnifiedInput;
