// apps/web/src/components/trust/TrustScoreChip.tsx
'use client';

import { ShieldQuestion } from 'lucide-react';
import { getTrustTier } from '@/lib/trust';
import { cn } from '@cars-auto/utils';

/** Shows the trust score as a tier chip ("Excellent" / "Good" / ...), never the raw 0-100 number — per Trust & Safety Prompt 7's frontend instruction. */
export function TrustScoreChip({ trustScore, size = 'sm' }: { trustScore?: number | null; size?: 'sm' | 'md' }) {
  const tier = getTrustTier(trustScore);
  if (!tier) return null;

  return (
    <span
      className={cn(
        'flex items-center gap-1 rounded-full border font-semibold',
        tier.color,
        tier.bg,
        size === 'sm' ? 'text-[0.65rem] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      )}
    >
      <ShieldQuestion className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} aria-hidden />
      {tier.label}
    </span>
  );
}
