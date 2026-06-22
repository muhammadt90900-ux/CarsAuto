'use client';
// apps/web/src/components/features/sell/SellFormField.tsx
// Labelled field wrapper with error display.

import { ReactNode } from 'react';
import { cn } from '@cars-auto/utils';

interface SellFormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
}

export function SellFormField({
  label,
  children,
  error,
  required,
  optional,
  className,
}: SellFormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        {label}
        {required && <span className="text-[var(--gold)]">*</span>}
        {optional && <span className="text-[var(--text-faint)] normal-case font-normal tracking-normal text-[11px]">(optional)</span>}
      </label>
      {children}
      {error && (
        <p className="text-[#ef4444] text-xs flex items-center gap-1 mt-0.5">
          <span>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}
