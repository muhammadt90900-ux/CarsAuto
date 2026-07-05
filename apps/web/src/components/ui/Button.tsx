'use client';
// components/ui/Button.tsx — Enterprise button system
import { cn } from '@cars-auto/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'gold' | 'ghost' | 'outline' | 'danger' | 'link';
type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  gold: `
    bg-gradient-to-r from-gold to-gold-dim
    text-[var(--ink-900)] font-bold border border-gold/40
    shadow-gold-sm
    hover:from-gold-light hover:to-gold
    hover:shadow-gold
    hover:-translate-y-[1px] active:translate-y-0
  `,
  ghost: `
    bg-transparent text-[var(--text-muted)] font-semibold
    border border-[var(--border-default)]
    hover:text-gold hover:border-gold/35 hover:bg-gold/10
  `,
  outline: `
    bg-transparent text-[var(--text-secondary)] font-semibold
    border border-[var(--border-strong)]
    hover:text-[var(--text-primary)] hover:border-gold hover:bg-gold/5
  `,
  danger: `
    bg-status-error/10 text-status-error font-semibold
    border border-status-error/25
    hover:bg-status-error/15 hover:border-status-error/40
  `,
  link: `
    bg-transparent text-gold font-semibold p-0 h-auto border-0
    hover:text-gold-light underline-offset-4 hover:underline
  `,
};

const SIZES: Record<Size, string> = {
  xs: 'h-7  px-3   text-[11px] rounded-lg  gap-1',
  sm: 'h-8  px-4   text-xs     rounded-xl  gap-1.5',
  md: 'h-10 px-5   text-sm     rounded-xl  gap-2',
  lg: 'h-12 px-6   text-base   rounded-xl  gap-2.5',
  xl: 'h-14 px-8   text-lg     rounded-2xl gap-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', loading, fullWidth, leftIcon, rightIcon, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap cursor-pointer',
        'transition-all duration-base',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});
