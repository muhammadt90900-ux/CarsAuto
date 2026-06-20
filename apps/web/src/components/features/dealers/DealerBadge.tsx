// components/features/dealers/DealerBadge.tsx
// Reusable badge pill for dealer tiers and achievement badges

import { cn } from '@auto-bazaar-pro/utils';
import { CheckCircle2, Shield, Zap, Award, Star, Crown } from 'lucide-react';

// ── Tier badge ─────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  PLATINUM: {
    label: 'Platinum',
    gradient: 'from-[#e8e0c8] to-[#c9a84c]',
    text: 'text-[#7a5c1e]',
    icon: '💎',
  },
  GOLD: {
    label: 'Gold',
    gradient: 'from-[#fde68a] to-[#f59e0b]',
    text: 'text-[#78350f]',
    icon: '⭐',
  },
  STANDARD: {
    label: 'Standard',
    gradient: 'from-[#bfdbfe] to-[#3b82f6]',
    text: 'text-[#1e40af]',
    icon: '✓',
  },
  BASIC: {
    label: 'Basic',
    gradient: 'from-white/10 to-white/5',
    text: 'text-white/40',
    icon: '',
  },
} as const;

export function DealerTierBadge({
  tier,
  size = 'sm',
}: {
  tier: keyof typeof TIER_CONFIG;
  size?: 'xs' | 'sm' | 'md';
}) {
  const cfg = TIER_CONFIG[tier];
  if (!cfg || tier === 'BASIC') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold bg-gradient-to-r',
        cfg.gradient, cfg.text,
        size === 'xs' && 'px-2 py-0.5 text-[0.6rem]',
        size === 'sm' && 'px-2.5 py-1 text-[0.68rem]',
        size === 'md' && 'px-3 py-1.5 text-xs',
      )}
    >
      {cfg.icon && <span>{cfg.icon}</span>}
      {cfg.label}
    </span>
  );
}

// ── Achievement badge ─────────────────────────────────────────────────────

const BADGE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  TOP_RATED:       { label: 'Top Rated',       icon: '⭐', color: 'text-[#e8cc7a]', bg: 'bg-[#c9a84c]/10', border: 'border-[#c9a84c]/20' },
  FAST_RESPONDER:  { label: 'Fast Responder',  icon: '⚡', color: 'text-sky-300',   bg: 'bg-sky-400/10',   border: 'border-sky-400/20'   },
  TRUSTED_SELLER:  { label: 'Trusted Seller',  icon: '🛡️', color: 'text-emerald-300', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  MOST_REVIEWED:   { label: 'Most Reviewed',   icon: '💬', color: 'text-purple-300', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  NEW_DEALER:      { label: 'New Dealer',      icon: '🌟', color: 'text-blue-300',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20'   },
  PREMIUM_STOCK:   { label: 'Premium Stock',   icon: '💎', color: 'text-[#e8cc7a]', bg: 'bg-[#c9a84c]/10', border: 'border-[#c9a84c]/20' },
};

export function DealerAchievementBadge({
  code,
  label,
  icon,
  size = 'sm',
}: {
  code: string;
  label: string;
  icon?: string | null;
  size?: 'xs' | 'sm' | 'md';
}) {
  const cfg = BADGE_CONFIG[code] ?? {
    label,
    icon: icon ?? '🏅',
    color: 'text-white/60',
    bg: 'bg-white/[0.06]',
    border: 'border-white/[0.1]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold',
        cfg.bg, cfg.border, cfg.color,
        size === 'xs' && 'px-2 py-0.5 text-[0.6rem]',
        size === 'sm' && 'px-2.5 py-1 text-[0.68rem]',
        size === 'md' && 'px-3 py-1.5 text-xs',
      )}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ── Verified dealer pill ───────────────────────────────────────────────────

export function VerifiedDealerBadge({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        'bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[#e8cc7a]',
        size === 'xs' && 'px-2 py-0.5 text-[0.6rem]',
        size === 'sm' && 'px-2.5 py-1 text-[0.68rem]',
        size === 'md' && 'px-3 py-1.5 text-xs',
      )}
    >
      <CheckCircle2 className={cn(size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      Verified Dealer
    </span>
  );
}
