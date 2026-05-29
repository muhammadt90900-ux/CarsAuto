'use client';
// components/ui/Input.tsx — Enterprise input system
import { cn } from '@auto-bazaar-pro/utils';
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
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input-base w-full',
            leftIcon  && 'pl-10',
            rightIcon && 'pr-10',
            error     && 'border-[rgba(220,38,38,0.55)] focus:border-[rgba(220,38,38,0.75)] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-[#ef4444] flex items-center gap-1">⚠ {error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
});
