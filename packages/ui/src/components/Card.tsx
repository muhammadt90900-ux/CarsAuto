// packages/ui/src/components/Card.tsx
import React from 'react';
import { cn } from '@auto-bazaar-pro/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, glass }) => {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 shadow-md',
        glass
          ? 'bg-white/10 backdrop-blur-xl border border-white/20'
          : 'bg-white dark:bg-[#1a1a2e] border border-gray-100',
        className,
      )}
    >
      {children}
    </div>
  );
};
