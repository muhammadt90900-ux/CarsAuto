'use client';
// apps/web/src/app/[locale]/dashboard/dealer/page.tsx
// Dealer analytics & management dashboard

import { useState, useEffect } from 'react';
import {
  BarChart2, Eye, Phone, MessageCircle, TrendingUp,
  Star, Users, AlertCircle, CheckCircle2, Settings,
  ChevronRight, Plus, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@cars-auto/utils';

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, delta, icon: Icon, color = 'text-[var(--gold-light)]',
}: {
  label: string; value: string | number; delta?: number; icon: any; color?: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.7rem] text-white/40 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center">
          <Icon className={cn('w-4 h-4', color)} />
        </div>
      </div>
      <div className={cn('text-3xl font-black', color)}>{value}</div>
      {delta !== undefined && (
        <div className={cn('text-xs font-semibold', delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs last period
        </div>
      )}
    </div>
  );
}

// ── Simple bar chart ──────────────────────────────────────────────────────

function MiniBarChart({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="p-4 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
      <div className="text-[0.7rem] text-white/40 uppercase tracking-wider mb-3">{label}</div>
      <div className="flex items-end gap-1 h-16">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-[rgba(201,168,76,0.6)] to-[var(--gold-light)]/40 hover:from-[var(--gold)] hover:to-[var(--gold-light)] transition-colors cursor-default"
            style={{ height: `${(v / max) * 100}%`, minHeight: 2 }}
            title={String(v)}
          />
        ))}
      </div>
      <div className="flex justify-between text-[0.6rem] text-white/20 mt-1.5">
        <span>30d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DealerDashboardPage() {
  const params  = useParams();
  const locale  = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<7 | 30 | 90>(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dealers/me/analytics?days=${period}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period]);

  const totals = data?.totals ?? {};
  const analytics: any[] = data?.analytics ?? [];

  // Build chart series
  const series = (field: string) => {
    const today = new Date();
    return Array.from({ length: Math.min(period, 30) }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (period - 1 - i));
      const iso = d.toISOString().split('T')[0];
      const row = analytics.find((a: any) => a.date?.startsWith(iso));
      return row ? row[field] ?? 0 : 0;
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-white text-2xl">Dealer Analytics</h1>
          <p className="text-white/40 text-sm mt-0.5">Track your showroom performance</p>
        </div>
        <div className="flex items-center gap-2">
          {([7, 30, 90] as const).map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                period === d
                  ? 'bg-[rgba(201,168,76,0.2)] border-[rgba(201,168,76,0.4)] text-[var(--gold-light)]'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:border-white/20',
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#0d1b2e] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Profile Views"    value={totals.profileViews ?? 0}   icon={Eye}            color="text-[var(--gold-light)]" />
            <StatCard label="Listing Views"    value={totals.listingViews ?? 0}   icon={BarChart2}      color="text-blue-400" />
            <StatCard label="Leads (Contact)"  value={totals.newLeads ?? 0}       icon={Users}          color="text-emerald-400" />
            <StatCard label="WhatsApp Clicks"  value={totals.whatsappClicks ?? 0} icon={MessageCircle}  color="text-[#25D366]" />
            <StatCard label="Phone Clicks"     value={totals.phoneClicks ?? 0}    icon={Phone}          color="text-purple-400" />
            <StatCard label="Contact Clicks"   value={totals.contactClicks ?? 0}  icon={TrendingUp}     color="text-orange-400" />
            <StatCard label="New Reviews"      value={totals.newReviews ?? 0}     icon={Star}           color="text-yellow-400" />
            <StatCard label="Impressions"      value={totals.searchImpressions ?? 0} icon={Eye}         color="text-sky-400" />
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniBarChart data={series('profileViews')}  label="Profile Views (daily)" />
            <MiniBarChart data={series('listingViews')}  label="Listing Views (daily)" />
            <MiniBarChart data={series('newLeads')}      label="New Leads (daily)" />
            <MiniBarChart data={series('whatsappClicks')} label="WhatsApp Clicks (daily)" />
          </div>
        </>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Settings,
            label: 'Edit Showroom',
            desc: 'Update profile, photos, hours',
            href: `/${locale}/dashboard/dealer/settings`,
            color: 'text-[var(--gold)]',
            bg: 'bg-[var(--gold-subtle)]',
          },
          {
            icon: Plus,
            label: 'Add Listing',
            desc: 'Post a new vehicle or part',
            href: `/${locale}/dashboard/listings`,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
          },
          {
            icon: Zap,
            label: 'Upgrade Plan',
            desc: 'More listings, analytics & priority',
            href: `/${locale}/dashboard/subscription`,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
          },
        ].map(a => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-4 p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07] hover:border-white/[0.14] transition-all group"
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', a.bg)}>
              <a.icon className={cn('w-5 h-5', a.color)} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-sm">{a.label}</div>
              <div className="text-xs text-white/40">{a.desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
          </Link>
        ))}
      </div>

      {/* ── Subscription status ── */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[var(--gold-subtle)] to-transparent border border-[rgba(201,168,76,0.2)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(201,168,76,0.15)] flex items-center justify-center">
            <Zap className="w-6 h-6 text-[var(--gold)]" />
          </div>
          <div className="flex-1">
            <div className="font-display font-bold text-white">Unlock Premium Analytics</div>
            <div className="text-sm text-white/50 mt-0.5">Upgrade to Business plan for advanced insights, lead scoring, and priority placement.</div>
          </div>
          <Link
            href="/dashboard/subscription"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e] font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
