// apps/web/src/components/trust/BadgeRow.tsx
'use client';

import { UserBadge } from '@cars-auto/types';
import { getBadgeDisplay } from '@/lib/trust';
import { cn } from '@cars-auto/utils';

/** Renders a row of earned-badge chips. Renders nothing if there are no badges — never shows an empty row. */
export function BadgeRow({ badges, size = 'sm' }: { badges?: UserBadge[] | null; size?: 'sm' | 'md' }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {badges.map((badge) => {
        const display = getBadgeDisplay(badge.code);
        const Icon = display.icon;
        return (
          <span
            key={badge.code}
            title={display.label}
            className={cn(
              'flex items-center gap-1 rounded-full border font-semibold',
              display.color,
              display.bg,
              size === 'sm' ? 'text-[0.65rem] px-2 py-0.5' : 'text-xs px-2.5 py-1',
            )}
          >
            <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} aria-hidden />
            {display.label}
          </span>
        );
      })}
    </div>
  );
}
