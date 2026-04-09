'use client';

import {
  forwardRef,
  useCallback,
  useId,
  type TextareaHTMLAttributes,
} from 'react';
import clsx from 'clsx';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      autoResize = false,
      maxLength,
      showCount = false,
      className,
      id,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const charCount = typeof value === 'string' ? value.length : 0;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (autoResize) {
          const el = e.currentTarget;
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
        }
        onChange?.(e);
      },
      [autoResize, onChange],
    );

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          className={clsx(
            'w-full min-h-[5rem] rounded-lg border bg-bg-input px-3 py-2 text-sm text-text-primary',
            'placeholder:text-text-muted resize-y',
            'transition-colors duration-150',
            'focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            autoResize && 'resize-none overflow-hidden',
            error
              ? 'border-accent-red focus:border-accent-red focus:ring-accent-red'
              : 'border-border',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />
        <div className="flex items-center justify-between">
          <div>
            {error && (
              <p id={`${textareaId}-error`} className="text-xs text-accent-red">
                {error}
              </p>
            )}
            {!error && helperText && (
              <p
                id={`${textareaId}-helper`}
                className="text-xs text-text-muted"
              >
                {helperText}
              </p>
            )}
          </div>
          {showCount && maxLength && (
            <p
              className={clsx(
                'text-xs',
                charCount >= maxLength ? 'text-accent-red' : 'text-text-muted',
              )}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
