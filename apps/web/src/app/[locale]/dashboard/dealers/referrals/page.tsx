'use client';
// apps/web/src/app/[locale]/dashboard/dealers/referrals/page.tsx
// Seller Dashboard — Referral & Rewards System

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  Copy, Check, Share2, Users, UserCheck, Clock, XCircle,
  Gift, Crown, Award, Loader2, Sparkles,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { referralsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const BADGE_ICONS: Record<string, React.ElementType> = {
  GOLD_PARTNER: Award,
  VIP_DEALER: Crown,
  AMBASSADOR: Sparkles,
};

export default function ReferralsPage() {
  const t = useTranslations('referral');
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.referrals.myDashboard(),
    queryFn: () => referralsApi.getMyDashboard(),
    staleTime: 30_000,
  });

  const handleCopy = useCallback(() => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data?.referralCode]);

  const handleShare = useCallback(() => {
    if (!data?.referralCode) return;
    const text = `${t('shareMessage')}: ${data.referralCode}`;
    if (navigator.share) {
      navigator.share({ title: 'CarsAuto', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data?.referralCode, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
        {t('notDealerYet')}
      </div>
    );
  }

  const progressPct = data.nextMilestone
    ? Math.min(100, (data.successfulReferrals / data.nextMilestone.milestone) * 100)
    : 100;

  return (
    <div className="space-y-6" dir={locale === 'ku' || locale === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-semibold text-white">{t('title')}</h1>
        <p className="text-sm text-white/50 mt-1">{t('subtitle')}</p>
      </div>

      {/* Referral code card */}
      <div className="rounded-2xl border border-[rgba(201,168,76,0.3)] bg-gradient-to-br from-[var(--gold-subtle)] to-transparent p-6">
        <p className="text-xs uppercase tracking-wide text-[var(--gold-light)] mb-2">{t('yourCode')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider">
            {data.referralCode ?? '—'}
          </span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 px-3 py-1.5 text-sm text-white transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? t('copied') : t('copy')}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-light)] px-3 py-1.5 text-sm font-medium text-[var(--ink-950)] transition"
          >
            <Share2 className="w-4 h-4" />
            {t('share')}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label={t('totalReferrals')} value={data.totalReferrals} />
        <StatCard icon={UserCheck} label={t('successfulReferrals')} value={data.successfulReferrals} accent />
        <StatCard icon={Clock} label={t('pendingReferrals')} value={data.pendingReferrals} />
        <StatCard icon={XCircle} label={t('rejectedReferrals')} value={data.rejectedReferrals} />
        <StatCard icon={Gift} label={t('premiumMonthsEarned')} value={data.premiumMonthsEarned} accent />
      </div>

      {/* Progress to next reward */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-white">{t('nextReward')}</h2>
          <span className="text-sm text-white/60">
            {data.nextMilestone
              ? t('remainingReferrals', { count: data.nextMilestone.remaining })
              : t('allRewardsUnlocked')}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ul className="mt-5 space-y-2 text-sm text-white/60">
          <li className={cn(data.successfulReferrals >= 3 && 'text-[var(--gold-light)]')}>• {t('milestone3')}</li>
          <li className={cn(data.successfulReferrals >= 10 && 'text-[var(--gold-light)]')}>• {t('milestone10')}</li>
          <li className={cn(data.successfulReferrals >= 25 && 'text-[var(--gold-light)]')}>• {t('milestone25')}</li>
          <li className={cn(data.successfulReferrals >= 50 && 'text-[var(--gold-light)]')}>• {t('milestone50')}</li>
          <li className={cn(data.successfulReferrals >= 100 && 'text-[var(--gold-light)]')}>• {t('milestone100')}</li>
        </ul>
      </div>

      {/* Badges */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-sm font-medium text-white mb-4">{t('yourBadges')}</h2>
        {data.badges.length === 0 ? (
          <p className="text-sm text-white/40">{t('noBadgesYet')}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.badges.map((b) => {
              const Icon = BADGE_ICONS[b.code] ?? Award;
              return (
                <div key={b.code} className="flex items-center gap-2 rounded-xl border border-[rgba(201,168,76,0.3)] bg-[var(--gold-subtle)] px-4 py-2">
                  <Icon className="w-4 h-4 text-[var(--gold-light)]" />
                  <span className="text-sm text-white">{b.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-sm font-medium text-white mb-4">{t('history')}</h2>
        {data.history.length === 0 ? (
          <p className="text-sm text-white/40">{t('noHistory')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/[0.06]">
                {data.history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-3 pr-4 text-white/80">{h.referredUser?.name ?? '—'}</td>
                    <td className="py-3 pr-4 text-white/40 whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleDateString(locale)}
                    </td>
                    <td className="py-3">
                      <StatusPill status={h.status} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: number; accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <Icon className={cn('w-5 h-5 mb-2', accent ? 'text-[var(--gold)]' : 'text-white/40')} />
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: (key: string) => string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: t('statusPending'),   cls: 'bg-blue-400/10 text-blue-300' },
    QUALIFIED: { label: t('statusQualified'), cls: 'bg-emerald-400/10 text-emerald-300' },
    REJECTED:  { label: t('statusRejected'),  cls: 'bg-red-400/10 text-red-300' },
    SUSPENDED: { label: t('statusSuspended'), cls: 'bg-amber-400/10 text-amber-300' },
  };
  const s = map[status] ?? map.PENDING;
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', s.cls)}>{s.label}</span>;
}
