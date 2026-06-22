'use client';
// components/ui/Input.tsx — Enterprise input system (Accessibility-enhanced)
import { cn } from '@cars-auto/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightIcon, className, id, ...props },
  ref
) {
  const inputId   = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId   = inputId ? `${inputId}-error` : undefined;
  const hintId    = inputId ? `${inputId}-hint`  : undefined;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-[#ef4444]" aria-hidden="true">*</span>
          )}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          aria-required={props.required}
          className={cn(
            'input-base w-full',
            !!leftIcon  && 'pl-10',
            !!rightIcon && 'pr-10',
            !!error     && 'border-[rgba(220,38,38,0.55)] focus:border-[rgba(220,38,38,0.75)] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs text-[#ef4444] flex items-center gap-1"
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      )}
    </div>
  );
});
