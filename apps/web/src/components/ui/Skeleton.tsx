// components/ui/Skeleton.tsx
import { cn } from '@cars-auto/utils';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
  count?: number;
}

export function Skeleton({ className, width, height, rounded = 'rounded-lg', count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={cn('skeleton', rounded, className)}
          style={{ width: width || '100%', height: height || '1rem' }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="0.875rem" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#0b1525] border border-[var(--border-default)] shadow-[var(--shadow-sm)]">
      <Skeleton height="13rem" rounded="rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton height="1rem" width="75%" />
        <Skeleton height="0.75rem" width="50%" />
        <div className="flex gap-2 pt-1">
          <Skeleton height="0.75rem" width="33%" rounded="rounded-full" />
          <Skeleton height="0.75rem" width="33%" rounded="rounded-full" />
        </div>
        <div className="h-px bg-[var(--border-subtle)]" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton height="1.5rem" width="40%" />
          <Skeleton height="2rem" width="2rem" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height="h-4" />
        </td>
      ))}
    </tr>
  );
}
