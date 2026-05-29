'use client';
/**
 * Skeleton — AutoBazaarPro Design System
 *
 * Usage:
 *   <Skeleton width="100%" height={20} />
 *   <Skeleton circle size={48} />
 *   <SkeletonCard />       — full listing card placeholder
 *   <SkeletonText lines={3} />
 */

import { cn } from '@/lib/utils';

// ─── Base skeleton ────────────────────────────────────────────────────────────
interface SkeletonProps {
  width?:     number | string;
  height?:    number | string;
  circle?:    boolean;
  size?:      number;           // shorthand for circle width=height
  rounded?:   boolean;          // full pill rounding
  className?: string;
}

export function Skeleton({
  width,
  height,
  circle,
  size,
  rounded,
  className,
}: SkeletonProps) {
  return (
    <span
      className={cn(
        'skeleton block',
        circle  && 'skeleton-circle',
        rounded && '!rounded-full',
        className,
      )}
      style={{
        width:  size ?? width,
        height: size ?? height,
        borderRadius: circle || rounded ? '9999px' : undefined,
      }}
      aria-hidden="true"
    />
  );
}

// ─── Text skeleton ────────────────────────────────────────────────────────────
export function SkeletonText({
  lines     = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          // Last line is shorter for natural look
          width={i === lines - 1 ? '65%' : '100%'}
          className="rounded"
        />
      ))}
    </div>
  );
}

// ─── Card skeleton ────────────────────────────────────────────────────────────
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden border border-[var(--border-default)]',
        className,
      )}
      aria-hidden
    >
      {/* Image */}
      <Skeleton width="100%" height={200} className="rounded-none" />
      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton width={120} height={12} className="rounded" />
          <Skeleton width={60}  height={20} rounded />
        </div>
        <Skeleton width="85%" height={18} className="rounded" />
        <SkeletonText lines={2} />
        <div className="flex items-center justify-between pt-1">
          <Skeleton width={80}  height={22} className="rounded" />
          <Skeleton width={100} height={34} className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Stat card skeleton ───────────────────────────────────────────────────────
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'card-stat',
        className,
      )}
      aria-hidden
    >
      <Skeleton width={90}  height={10} className="rounded" />
      <Skeleton width={120} height={28} className="rounded" />
      <Skeleton width={70}  height={10} className="rounded" />
    </div>
  );
}

// ─── Table row skeleton ───────────────────────────────────────────────────────
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr aria-hidden>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={14} width={i === 0 ? 160 : 90} className="rounded" />
        </td>
      ))}
    </tr>
  );
}
