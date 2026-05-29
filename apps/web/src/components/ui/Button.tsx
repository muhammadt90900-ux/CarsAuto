'use client';
/**
 * Button — AutoBazaarPro Design System
 *
 * Usage:
 *   <Button variant="primary" size="md">Browse Cars</Button>
 *   <Button variant="ghost"   size="sm" loading>Saving…</Button>
 *   <Button variant="primary" asChild><Link href="/cars">Browse</Link></Button>
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'icon';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  /** Render as a different element (e.g. an anchor) */
  asChild?: boolean;
}

// ─── Variant map ──────────────────────────────────────────────────────────────
const variantClasses: Record<ButtonVariant, string> = {
  primary:   'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost:     'btn btn-ghost',
  outline:   'btn btn-outline',
  danger:    'btn btn-danger',
  icon:      'btn btn-icon',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
  xl: 'btn-xl',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant  = 'primary',
      size     = 'md',
      loading  = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          loading  && 'relative cursor-wait',
          className,
        )}
        {...props}
      >
        {/* Left icon or spinner */}
        {loading ? (
          <Loader2
            className="animate-spin"
            size={size === 'xs' || size === 'sm' ? 14 : 16}
            aria-hidden
          />
        ) : (
          leftIcon && <span className="shrink-0" aria-hidden>{leftIcon}</span>
        )}

        {/* Label */}
        <span className={cn(loading && 'opacity-70')}>{children}</span>

        {/* Right icon (hidden while loading) */}
        {!loading && rightIcon && (
          <span className="shrink-0" aria-hidden>{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
