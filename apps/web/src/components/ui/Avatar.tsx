'use client';
/**
 * Avatar — AutoBazaarPro Design System
 *
 * Usage:
 *   <Avatar src="/photo.jpg" alt="Ali Hassan" size="md" />
 *   <Avatar initials="AH" size="lg" goldRing />
 *   <AvatarGroup avatars={[…]} max={4} />
 */

import Image from 'next/image';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?:       string | null;
  alt?:       string;
  initials?:  string;
  size?:      AvatarSize;
  goldRing?:  boolean;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'avatar-xs',
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
};

const sizePx: Record<AvatarSize, number> = {
  xs: 24, sm: 32, md: 40, lg: 52, xl: 68,
};

export function Avatar({ src, alt = '', initials, size = 'md', goldRing, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'avatar',
        sizeClasses[size],
        goldRing && 'ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--surface-0)]',
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={sizePx[size]}
          height={sizePx[size]}
          className="w-full h-full object-cover"
        />
      ) : initials ? (
        <span aria-label={alt}>{initials.slice(0, 2).toUpperCase()}</span>
      ) : (
        <User size={sizePx[size] * 0.5} aria-hidden />
      )}
    </span>
  );
}

// ─── AvatarGroup ─────────────────────────────────────────────────────────────
interface AvatarGroupItem {
  src?:      string | null;
  alt?:      string;
  initials?: string;
}

interface AvatarGroupProps {
  avatars:    AvatarGroupItem[];
  max?:       number;
  size?:      AvatarSize;
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const shown   = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className={cn('flex items-center', className)}>
      {shown.map((a, i) => (
        <Avatar
          key={i}
          src={a.src}
          alt={a.alt}
          initials={a.initials}
          size={size}
          className="-ml-2 first:ml-0 ring-2 ring-[var(--surface-0)]"
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'avatar',
            sizeClasses[size],
            '-ml-2 ring-2 ring-[var(--surface-0)] bg-[var(--ink-600)] text-[var(--text-muted)]',
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
