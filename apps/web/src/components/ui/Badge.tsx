'use client';
/**
 * Badge — AutoBazaarPro Design System
 *
 * Usage:
 *   <Badge variant="gold">Premium</Badge>
 *   <Badge variant="success" dot>Active</Badge>
 *   <Badge variant="error">Sold</Badge>
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'gold' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  variant?:   BadgeVariant;
  size?:      BadgeSize;
  dot?:       boolean;
  icon?:      ReactNode;
  className?: string;
  children:   ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  gold:    'badge-gold',
  success: 'badge-success',
  warning: 'badge-warning',
  error:   'badge-error',
  info:    'badge-info',
  neutral: 'badge-neutral',
};

const dotColors: Record<BadgeVariant, string> = {
  gold:    'bg-[var(--gold)]',
  success: 'bg-[var(--status-success)]',
  warning: 'bg-[var(--status-warning)]',
  error:   'bg-[var(--status-error)]',
  info:    'bg-[var(--status-info)]',
  neutral: 'bg-[var(--text-muted)]',
};

export function Badge({
  variant   = 'neutral',
  size      = 'md',
  dot       = false,
  icon,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        variantClasses[variant],
        size === 'sm' && 'text-[0.60rem] px-2 py-[2px]',
        className,
      )}
    >
      {dot && (
        <span
          className={cn('inline-block w-[5px] h-[5px] rounded-full shrink-0', dotColors[variant])}
          aria-hidden
        />
      )}
      {icon && <span className="shrink-0" aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}
