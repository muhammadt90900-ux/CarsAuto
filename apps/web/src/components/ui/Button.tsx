'use client';
// components/ui/Button.tsx — Enterprise button system
import { cn } from '@auto-bazaar-pro/utils';
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
    bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e]
    text-[#050b14] font-bold border border-[rgba(201,168,76,0.4)]
    shadow-[0_3px_14px_rgba(201,168,76,0.22)]
    hover:from-[#e8cc7a] hover:to-[#c9a84c]
    hover:shadow-[0_6px_28px_rgba(201,168,76,0.28)]
    hover:-translate-y-[1px] active:translate-y-0
  `,
  ghost: `
    bg-transparent text-[var(--text-muted)] font-semibold
    border border-[var(--border-default)]
    hover:text-[var(--gold)] hover:border-[rgba(201,168,76,0.35)] hover:bg-[rgba(201,168,76,0.08)]
  `,
  outline: `
    bg-transparent text-[var(--text-secondary)] font-semibold
    border border-[var(--border-strong)]
    hover:text-[var(--text-primary)] hover:border-[var(--gold)] hover:bg-[rgba(201,168,76,0.06)]
  `,
  danger: `
    bg-[rgba(220,38,38,0.08)] text-[#ef4444] font-semibold
    border border-[rgba(220,38,38,0.22)]
    hover:bg-[rgba(220,38,38,0.14)] hover:border-[rgba(220,38,38,0.40)]
  `,
  link: `
    bg-transparent text-[var(--gold)] font-semibold p-0 h-auto border-0
    hover:text-[var(--gold-light)] underline-offset-4 hover:underline
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
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2',
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
