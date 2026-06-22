// components/ui/Badge.tsx — Enterprise badge system
import { cn } from '@cars-auto/utils';
import { HTMLAttributes } from 'react';

type Variant = 'gold' | 'green' | 'blue' | 'red' | 'purple' | 'grey' | 'outline';
type Size    = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  dot?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  gold:    'bg-[rgba(201,168,76,0.14)] text-[#c9a84c] border-[rgba(201,168,76,0.25)]',
  green:   'bg-[rgba(22,163,74,0.12)] text-[#16a34a] border-[rgba(22,163,74,0.22)]',
  blue:    'bg-[rgba(37,99,235,0.12)] text-[#3b82f6] border-[rgba(37,99,235,0.22)]',
  red:     'bg-[rgba(220,38,38,0.12)] text-[#ef4444] border-[rgba(220,38,38,0.22)]',
  purple:  'bg-[rgba(168,85,247,0.12)] text-[#a855f7] border-[rgba(168,85,247,0.22)]',
  grey:    'bg-[rgba(100,116,139,0.12)] text-[#64748b] border-[rgba(100,116,139,0.22)]',
  outline: 'bg-transparent text-[var(--text-muted)] border-[var(--border-default)]',
};

const SIZES: Record<Size, string> = {
  sm: 'text-[9px] tracking-[0.14em] px-2 py-0.5',
  md: 'text-[10px] tracking-[0.12em] px-2.5 py-0.5',
};

const DOT_COLORS: Record<Variant, string> = {
  gold:    'bg-[#c9a84c]',
  green:   'bg-[#16a34a]',
  blue:    'bg-[#3b82f6]',
  red:     'bg-[#ef4444]',
  purple:  'bg-[#a855f7]',
  grey:    'bg-[#64748b]',
  outline: 'bg-[#64748b]',
};

export function Badge({ variant = 'grey', size = 'sm', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold uppercase rounded-full border',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_COLORS[variant])} />}
      {children}
    </span>
  );
}
