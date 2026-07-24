'use client';
// apps/web/src/app/[locale]/admin/subscriptions/page.tsx
// Admin: manage premium dealers (DealerSubscription) and individual
// listing-plan subscribers (Subscription). Backed by real
// /admin/subscriptions/dealers and /admin/subscriptions/users.
//
// NOTE: DealerSubscription.status uses the uppercase SubscriptionStatus
// enum (ACTIVE/PAST_DUE/CANCELLED/TRIALING), while the per-user
// Subscription.status is a separate lowercase convention
// (active/past_due/cancelled/trialing/inactive) — see schema.prisma. The
// two tabs below intentionally use different casing for their filters.

import { useState, useEffect, useCallback } from 'react';
import {
  Crown, Users, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  Star, Zap, ShieldCheck, Car,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

type DealerPlan   = 'FREE' | 'STARTER' | 'BUSINESS' | 'ENTERPRISE';
type DealerStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING';

interface DealerSub {
  id: string;
  plan: DealerPlan;
  status: DealerStatus;
  amount?: string | number | null;
  currency: string;
  currentPeriodEnd?: string | null;
  maxListings: number;
  featuredSlots: number;
  analyticsEnabled: boolean;
  prioritySupport: boolean;
  dealer?: { id: string; slug: string; nameEn: string; user?: { name: string; email: string } };
}

interface UserSub {
  id: string;
  plan: string;
  status: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  user?: { id: string; name: string; email: string; role: string };
}

const PLAN_STYLES: Record<DealerPlan, { bg: string; text: string }> = {
  FREE:       { bg: 'bg-white/[0.06]',       text: 'text-white/40' },
  STARTER:    { bg: 'bg-blue-400/15',        text: 'text-blue-300' },
  BUSINESS:   { bg: 'bg-purple-400/15',       text: 'text-purple-300' },
  ENTERPRISE: { bg: 'bg-[rgba(201,168,76,0.15)]',       text: 'text-[var(--gold)]' },
};

const DEALER_STATUS_STYLES: Record<DealerStatus, { label: string; text: string; bg: string; dot: string }> = {
  ACTIVE:    { label: 'Active',    text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  PAST_DUE:  { label: 'Past Due',  text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
  CANCELLED: { label: 'Cancelled', text: 'text-white/30',    bg: 'bg-white/[0.05]',   dot: 'bg-white/20'    },
  TRIALING:  { label: 'Trialing',  text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
};

const PAGE_SIZE = 20;
type Tab = 'dealers' | 'users';

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState<Tab>('dealers');

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display font-black text-white text-2xl tracking-tight">Subscriptions</h1>
        <p className="text-white/40 text-sm mt-0.5">Premium dealer plans and individual listing subscriptions</p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07] w-fit">
        {([
          ['dealers', 'Premium Dealers', Crown],
          ['users',   'User Plans',      Users],
        ] as [Tab, string, any][]).map(([val, label, Icon]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === val ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700' : 'text-white/40 hover:text-white/70',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'dealers' ? <DealerSubsPanel /> : <UserSubsPanel />}
    </div>
  );
}

function DealerSubsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [subs, setSubs]       = useState<DealerSub[]>([]);
  const [total, setTotal]     = useState(0);
  const [planFilter, setPlan] = useState<DealerPlan | 'ALL'>('ALL');
  const [statusFilter, setStatus] = useState<DealerStatus | 'ALL'>('ALL');
  const [page, setPage]       = useState(1);

  const fetchSubs = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (planFilter !== 'ALL') params.set('plan', planFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    api.get(`/admin/subscriptions/dealers?${params.toString()}`)
      .then(r => { setSubs(r.data.data ?? []); setTotal(r.data.total ?? 0); })
      .catch(err => setError(err?.response?.data?.message ?? 'Failed to load dealer subscriptions'))
      .finally(() => setLoading(false));
  }, [page, planFilter, statusFilter]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);
  useEffect(() => { setPage(1); }, [planFilter, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const premiumCount = subs.filter(s => s.plan !== 'FREE').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Plans',  value: total,                                          color: '#3b82f6', icon: Users },
          { label: 'Enterprise',   value: subs.filter(s => s.plan === 'ENTERPRISE').length, color: 'var(--gold)', icon: Crown },
          { label: 'Past Due',     value: subs.filter(s => s.status === 'PAST_DUE').length, color: '#ef4444', icon: AlertTriangle },
          { label: 'Trialing',     value: subs.filter(s => s.status === 'TRIALING').length, color: '#3b82f6', icon: Zap },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-ink-750 border border-white/[0.07] p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${s.color}15`, border: `1px solid ${s.color}22` }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-[0.68rem] text-white/35">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07]">
          {(['ALL', 'FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE'] as const).map(p => (
            <button key={p} onClick={() => setPlan(p)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      planFilter === p ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700' : 'text-white/40 hover:text-white/70')}>
              {p === 'ALL' ? 'All plans' : p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07]">
          {(['ALL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      statusFilter === s ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700' : 'text-white/40 hover:text-white/70')}>
              {s === 'ALL' ? 'All statuses' : DEALER_STATUS_STYLES[s as DealerStatus].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" /></div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-white/40 text-sm">{error}</p>
          <button onClick={fetchSubs} className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all">Retry</button>
        </div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Crown className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No dealer subscriptions found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Dealer', 'Plan', 'Status', 'Renews', 'Benefits'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((sub, i) => {
                const planStyle = PLAN_STYLES[sub.plan] ?? PLAN_STYLES.FREE;
                const statusStyle = DEALER_STATUS_STYLES[sub.status] ?? DEALER_STATUS_STYLES.ACTIVE;
                return (
                  <tr key={sub.id} className={cn('border-b border-white/[0.05] last:border-0', i % 2 === 0 ? 'bg-ink-750' : 'bg-ink-700')}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white">{sub.dealer?.nameEn ?? '—'}</p>
                      <p className="text-[0.68rem] text-white/30">{sub.dealer?.user?.email ?? sub.dealer?.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[0.68rem] font-bold uppercase tracking-wider px-2 py-1 rounded-md', planStyle.bg, planStyle.text)}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                      {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-[0.68rem] text-white/40">
                        <span className="flex items-center gap-1"><Car className="w-3 h-3" />{sub.maxListings}</span>
                        {sub.featuredSlots > 0 && <span className="flex items-center gap-1 text-[var(--gold)]"><Star className="w-3 h-3" />{sub.featuredSlots}</span>}
                        {sub.analyticsEnabled && <span className="flex items-center gap-1 text-blue-300"><Zap className="w-3 h-3" />Analytics</span>}
                        {sub.prioritySupport && <span className="flex items-center gap-1 text-purple-300"><ShieldCheck className="w-3 h-3" />Priority</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">Page {page} of {totalPages || 1} — {total} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserSubsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [subs, setSubs]       = useState<UserSub[]>([]);
  const [total, setTotal]     = useState(0);
  // NOTE: lowercase, matching Subscription.status convention (not the
  // uppercase SubscriptionStatus enum used by dealer subscriptions).
  const [statusFilter, setStatus] = useState<string>('ALL');
  const [page, setPage]       = useState(1);

  const fetchSubs = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    api.get(`/admin/subscriptions/users?${params.toString()}`)
      .then(r => { setSubs(r.data.data ?? []); setTotal(r.data.total ?? 0); })
      .catch(err => setError(err?.response?.data?.message ?? 'Failed to load user subscriptions'))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusBadge = (status: string) => {
    const map: Record<string, { text: string; bg: string; dot: string }> = {
      active:    { text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
      past_due:  { text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
      cancelled: { text: 'text-white/30',    bg: 'bg-white/[0.05]',  dot: 'bg-white/20'    },
      trialing:  { text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
      inactive:  { text: 'text-white/25',    bg: 'bg-white/[0.04]',  dot: 'bg-white/15'    },
    };
    return map[status] ?? map.inactive;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07] w-fit">
        {(['ALL', 'active', 'past_due', 'trialing', 'cancelled', 'inactive'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
                    statusFilter === s ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700' : 'text-white/40 hover:text-white/70')}>
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" /></div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-white/40 text-sm">{error}</p>
          <button onClick={fetchSubs} className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all">Retry</button>
        </div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No user subscriptions found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['User', 'Plan', 'Status', 'Renews', 'Auto-renew'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((sub, i) => {
                const badge = statusBadge(sub.status);
                return (
                  <tr key={sub.id} className={cn('border-b border-white/[0.05] last:border-0', i % 2 === 0 ? 'bg-ink-750' : 'bg-ink-700')}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white">{sub.user?.name ?? '—'}</p>
                      <p className="text-[0.68rem] text-white/30">{sub.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50 uppercase tracking-wide">{sub.plan}</td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit capitalize', badge.bg, badge.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                        {sub.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                      {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {sub.cancelAtPeriodEnd ? 'Cancels at period end' : 'Renews automatically'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">Page {page} of {totalPages || 1} — {total} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
