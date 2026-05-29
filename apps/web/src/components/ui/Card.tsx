'use client';
/**
 * Card — AutoBazaarPro Design System
 *
 * Usage:
 *   <Card>...</Card>
 *   <Card variant="premium" hover>...</Card>
 *   <Card variant="glass">...</Card>
 *   <CardStat label="Active Listings" value="142" delta="+12" up />
 *
 * Compound usage:
 *   <Card>
 *     <CardHeader title="Settings" action={<Button>Edit</Button>} />
 *     <CardBody>...</CardBody>
 *     <CardFooter>...</CardFooter>
 *   </Card>
 */

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CardVariant = 'default' | 'premium' | 'glass' | 'flat';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?:   boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// ─── Variant map ──────────────────────────────────────────────────────────────
const variantClasses: Record<CardVariant, string> = {
  default: 'card',
  premium: 'card-premium',
  glass:   'card-glass',
  flat:    'card-flat',
};

const paddingClasses = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  variant = 'default',
  hover   = false,
  padding = 'none',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantClasses[variant],
        hover && 'card-hover cursor-pointer',
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── CardHeader ───────────────────────────────────────────────────────────────
interface CardHeaderProps {
  title?:     ReactNode;
  subtitle?:  ReactNode;
  action?:    ReactNode;
  icon?:      ReactNode;
  className?: string;
  children?:  ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
  children,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 px-6 pt-6 pb-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--gold-subtle)] flex items-center justify-center text-[var(--gold)]">
            {icon}
          </div>
        )}
        <div>
          {title && (
            <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── CardBody ─────────────────────────────────────────────────────────────────
interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
}

export function CardBody({ padding = 'md', className, children, ...props }: CardBodyProps) {
  return (
    <div
      className={cn(
        padding === 'sm' ? 'px-4 py-3'
          : padding === 'lg' ? 'px-8 py-7'
          : 'px-6 py-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── CardFooter ───────────────────────────────────────────────────────────────
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right' | 'between';
}

export function CardFooter({ align = 'right', className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-6 py-4 border-t border-[var(--border-subtle)]',
        align === 'center'  && 'justify-center',
        align === 'right'   && 'justify-end',
        align === 'between' && 'justify-between',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── CardStat ─────────────────────────────────────────────────────────────────
interface CardStatProps {
  label:      string;
  value:      ReactNode;
  delta?:     string;
  up?:        boolean;
  down?:      boolean;
  icon?:      ReactNode;
  className?: string;
}

export function CardStat({ label, value, delta, up, down, icon, className }: CardStatProps) {
  return (
    <div className={cn('card-stat', className)}>
      <div className="flex items-center justify-between">
        <span className="card-stat__label">{label}</span>
        {icon && (
          <span className="text-[var(--gold)] opacity-70">{icon}</span>
        )}
      </div>
      <span className="card-stat__value tabular-nums">{value}</span>
      {delta && (
        <span
          className={cn(
            'card-stat__delta',
            up   && 'card-stat__delta--up',
            down && 'card-stat__delta--down',
            !up && !down && 'text-[var(--text-muted)]',
          )}
        >
          {up   && <TrendingUp  size={14} aria-hidden />}
          {down && <TrendingDown size={14} aria-hidden />}
          {delta}
        </span>
      )}
    </div>
  );
}
