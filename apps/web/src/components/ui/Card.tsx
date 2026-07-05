// components/ui/Card.tsx
import { cn } from '@cars-auto/utils';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const VARIANTS = {
  default: 'bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-md)]',
  glass:   'bg-gradient-to-br from-ink-750/85 to-ink-800/90 border border-white/[0.07] backdrop-blur-xl',
  flat:    'bg-[var(--surface-50)] border border-[var(--border-subtle)]',
};

const PADDING = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-7',
};

export function Card({ variant = 'default', padding = 'md', hover, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden transition-all duration-expo',
        VARIANTS[variant],
        PADDING[padding],
        hover && 'hover:-translate-y-1 hover:border-gold/28 hover:shadow-[var(--shadow-lg)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-bold text-[var(--text-primary)] text-base leading-tight', className)} {...props}>
      {children}
    </h3>
  );
}
