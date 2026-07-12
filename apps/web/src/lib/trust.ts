// apps/web/src/lib/trust.ts
//
// Trust & Safety Prompt 6/7 frontend wiring.
//
// UserBadge (backend) only stores a `code` (see packages/types/src/user.ts's
// comment — no label/icon columns, unlike DealerBadge). This file is the
// single place that maps a badge code to how it's displayed, so every
// consumer (listing seller card, profile header, dashboard) renders badges
// identically instead of each re-inventing the label/icon/color.
//
// Codes must match apps/worker/src/modules/badges/badge-award.service.ts's
// MANAGED_BADGE_CODES exactly.

import { ShieldCheck, Star, Zap, Award, LucideIcon } from 'lucide-react';

export interface BadgeDisplay {
  label: string;
  icon: LucideIcon;
  color: string; // text/icon color
  bg: string;    // chip background
}

export const BADGE_DISPLAY: Record<string, BadgeDisplay> = {
  ID_VERIFIED: {
    label: 'ID Verified',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
  },
  TOP_RATED: {
    label: 'Top Rated',
    icon: Star,
    color: 'text-[var(--gold)]',
    bg: 'bg-[rgba(201,168,76,0.1)] border-[rgba(201,168,76,0.25)]',
  },
  FAST_RESPONDER: {
    label: 'Fast Responder',
    icon: Zap,
    color: 'text-sky-400',
    bg: 'bg-sky-400/10 border-sky-400/20',
  },
  TRUSTED_SELLER: {
    label: 'Trusted Seller',
    icon: Award,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10 border-violet-400/20',
  },
};

export function getBadgeDisplay(code: string): BadgeDisplay {
  return (
    BADGE_DISPLAY[code] ?? {
      label: code,
      icon: ShieldCheck,
      color: 'text-white/40',
      bg: 'bg-white/[0.05] border-white/[0.09]',
    }
  );
}

// ── Trust score → tier ──────────────────────────────────────────────────────
// PER PROMPT INSTRUCTION ("Trust Score shown as a small badge tier, not a
// raw number — raw fraud/risk numbers stay admin-only, same as today"):
// TrustScore itself (0-100) is not admin-only info by nature — it's already
// a rolled-up, safe-to-show number (see trust-score.util.ts's header on the
// backend for why the raw FraudScore never leaves the server). But the doc
// still asked for a tier presentation rather than the number, so this is
// the single mapping every "show trust" surface should use instead of
// printing trustScore directly.

export interface TrustTier {
  label: string;
  color: string;
  bg: string;
}

export function getTrustTier(trustScore: number | undefined | null): TrustTier | null {
  if (trustScore === undefined || trustScore === null) return null;
  if (trustScore >= 85) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' };
  if (trustScore >= 70) return { label: 'Good',       color: 'text-[var(--gold)]', bg: 'bg-[rgba(201,168,76,0.1)] border-[rgba(201,168,76,0.25)]' };
  if (trustScore >= 50) return { label: 'Fair',        color: 'text-sky-400',      bg: 'bg-sky-400/10 border-sky-400/20' };
  return { label: 'New / Limited History', color: 'text-white/40', bg: 'bg-white/[0.05] border-white/[0.09]' };
}
