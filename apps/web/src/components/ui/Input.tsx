'use client';
/**
 * Input / Textarea / Select — AutoBazaarPro Design System
 *
 * Usage:
 *   <Input placeholder="Search..." leftIcon={<Search />} />
 *   <Textarea label="Description" hint="Max 500 chars" />
 *   <Select label="Category" options={[…]} />
 *
 *   <Field label="Email" error={errors.email?.message} required>
 *     <Input type="email" {...register('email')} />
 *   </Field>
 */

import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

// ─── Field wrapper ────────────────────────────────────────────────────────────
interface FieldProps {
  label?:    string;
  hint?:     string;
  error?:    string;
  required?: boolean;
  children:  ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('field', className)}>
      {label && (
        <label>
          {label}
          {required && <span className="text-status-error ml-1" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error  && <p className="error" role="alert">{error}</p>}
      {!error && hint && <p className="hint">{hint}</p>}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
  leftIcon?:  ReactNode;
  rightIcon?: ReactNode;
  error?:     boolean;
  /** Shorthand: wrap in a Field with label/hint/error */
  label?:    string;
  hint?:     string;
  errorMsg?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      inputSize = 'md',
      leftIcon,
      rightIcon,
      error,
      label,
      hint,
      errorMsg,
      className,
      ...props
    },
    ref,
  ) => {
    const sizeClass = inputSize === 'sm' ? 'input-sm' : inputSize === 'lg' ? 'input-lg' : '';
    const hasError  = error || !!errorMsg;

    const inputEl = (
      <div className="input-wrapper">
        {leftIcon  && <span className="input-icon-left"  aria-hidden>{leftIcon}</span>}
        {rightIcon && <span className="input-icon-right" aria-hidden>{rightIcon}</span>}
        <input
          ref={ref}
          className={cn(
            'input',
            sizeClass,
            leftIcon  && 'input-has-icon-left',
            rightIcon && 'input-has-icon-right',
            hasError  && 'input-error',
            className,
          )}
          aria-invalid={hasError ? true : undefined}
          {...props}
        />
      </div>
    );

    if (label || hint || errorMsg) {
      return (
        <Field label={label} hint={hint} error={errorMsg} required={props.required}>
          {inputEl}
        </Field>
      );
    }
    return inputEl;
  },
);
Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:    string;
  hint?:     string;
  errorMsg?: string;
  error?:    boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, errorMsg, error, className, ...props }, ref) => {
    const hasError = error || !!errorMsg;

    const el = (
      <textarea
        ref={ref}
        className={cn('textarea', hasError && 'input-error', className)}
        aria-invalid={hasError ? true : undefined}
        {...props}
      />
    );

    if (label || hint || errorMsg) {
      return (
        <Field label={label} hint={hint} error={errorMsg} required={props.required}>
          {el}
        </Field>
      );
    }
    return el;
  },
);
Textarea.displayName = 'Textarea';

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options:   SelectOption[];
  placeholder?: string;
  label?:    string;
  hint?:     string;
  errorMsg?: string;
  error?:    boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, label, hint, errorMsg, error, className, ...props }, ref) => {
    const hasError = error || !!errorMsg;

    const el = (
      <select
        ref={ref}
        className={cn('input select', hasError && 'input-error', className)}
        aria-invalid={hasError ? true : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    );

    if (label || hint || errorMsg) {
      return (
        <Field label={label} hint={hint} error={errorMsg} required={props.required}>
          {el}
        </Field>
      );
    }
    return el;
  },
);
Select.displayName = 'Select';

// ─── Checkbox ─────────────────────────────────────────────────────────────────
interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  hint?:     string;
  errorMsg?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, errorMsg, className, ...props }, ref) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        ref={ref}
        className={cn('checkbox mt-0.5', className)}
        {...props}
      />
      {(label || hint) && (
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>}
          {hint  && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
          {errorMsg && <span className="text-xs text-[var(--status-error)]">{errorMsg}</span>}
        </div>
      )}
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';
