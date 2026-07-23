'use client';
// apps/web/src/app/[locale]/admin/analytics/page.tsx
//
// HONESTY FIX: this entire page used to be a wall of invented numbers —
// `const MONTHLY = [...]`, `TOP_MAKES`, `TOP_REGIONS`, `TRAFFIC_SOURCES`,
// `FUNNEL`, plus a KPI grid with hand-typed values like "$142,800" and
// fake +8.4% change badges — with zero API calls anywhere in the file.
// An admin reading this page would be making real decisions off numbers
// nobody ever measured.
//
// What actually exists on the backend (verified by reading admin.service.ts):
//   GET /admin/stats     → real lifetime totals: users, listings, active
//                           listings, dealers, active subscriptions,
//                           totalRevenue (sum of COMPLETED payments)
//   GET /admin/analytics → real 6-month {label, listings, users} counts
//
// What does NOT exist anywhere in the backend: session tracking, page
// views, traffic-source attribution, a conversion funnel, or a
// make/region breakdown of listings. Rather than inventing numbers to
// fill those gaps again, this page now shows only what's real and says
// plainly that the rest isn't tracked yet — an honest "not available"
// beats a confident fake number an admin might act on.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Car, DollarSign, BarChart2, Store, CreditCard, Info,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

const fetchStats = () => api.get('/admin/stats').then(r => r.data);
const fetchAnalytics = () => api.get('/admin/analytics').then(r => r.data);

type MonthPoint = { label: string; listings: number; users: number };

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatMoney(n: number | undefined) {
  if (n == null) return '—';
  return `$${n.toLocaleString()}`;
}

function BarChart({ data, field, color }: { data: MonthPoint[]; field: 'listings' | 'users'; color: string }) {
  const max = Math.max(1, ...data.map(d => d[field]));
  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map(d => {
        const h = (d[field] / max) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-md transition-all duration-500 hover:opacity-75 cursor-pointer"
              style={{ height: `${h}%`, background: `linear-gradient(180deg,${color},${color}88)` }}
              title={`${d.label}: ${d[field]}`}
            />
            <span className="text-[0.6rem] text-white/30">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [chartTab, setChartTab] = useState<'listings' | 'users'>('listings');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchStats,
    staleTime: 30_000,
  });
  const { data: monthly, isLoading: chartLoading } = useQuery<MonthPoint[]>({
    queryKey: ['admin', 'analytics'],
    queryFn: fetchAnalytics,
    staleTime: 60_000,
  });

  // Only real, currently-tracked totals. No fake change % or sparklines —
  // those would need historical KPI snapshots that don't exist yet.
  const KPIs = [
    { label: 'Total Revenue',        value: formatMoney(stats?.totalRevenue),                 color: 'var(--gold)', icon: DollarSign },
    { label: 'Total Users',          value: stats?.totalUsers?.toLocaleString() ?? '—',        color: '#22c55e',     icon: Users },
    { label: 'Total Listings',       value: stats?.totalListings?.toLocaleString() ?? '—',     color: '#3b82f6',     icon: Car },
    { label: 'Active Listings',      value: stats?.activeListings?.toLocaleString() ?? '—',    color: '#8b5cf6',     icon: BarChart2 },
    { label: 'Total Dealers',        value: stats?.totalDealers?.toLocaleString() ?? '—',      color: '#f59e0b',     icon: Store },
    { label: 'Active Subscriptions', value: stats?.activeSubscriptions?.toLocaleString() ?? '—', color: '#f43f5e',   icon: CreditCard },
  ];

  const chartColors = { listings: '#3b82f6', users: '#22c55e' };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div>
        <h1 className="font-display font-black text-white text-2xl tracking-tight">Analytics</h1>
        <p className="text-white/40 text-sm mt-0.5">Real platform totals and 6-month growth</p>
      </div>

      {/* KPI Grid — all real, from GET /admin/stats */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {KPIs.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-5 hover:border-white/[0.12] transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                   style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}22` }}>
                <Icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <p className="text-2xl font-black text-white tabular-nums">
                {statsLoading ? '…' : kpi.value}
              </p>
              <p className="text-[0.7rem] text-white/35 mt-0.5">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Growth chart — real, from GET /admin/analytics */}
      <div className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4.5 h-4.5 text-[var(--gold)]" />
            Growth Overview
          </h2>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.05]">
            {(['listings', 'users'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setChartTab(tab)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[0.68rem] font-semibold capitalize transition-all',
                  chartTab === tab
                    ? 'text-white bg-white/[0.10]'
                    : 'text-white/35 hover:text-white/60',
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {chartLoading || !monthly?.length ? (
          <div className="h-32 flex items-center justify-center text-white/25 text-xs">
            {chartLoading ? 'Loading…' : 'Not enough data yet'}
          </div>
        ) : (
          <BarChart data={monthly} field={chartTab} color={chartColors[chartTab]} />
        )}
        <div className="mt-3 text-[0.68rem] text-white/25">Last 6 months</div>
      </div>

      {/* Honest placeholder — was four cards of fully invented numbers
         (traffic sources, conversion funnel, top makes, top regions).
         None of that has a real data source yet, so it's gone rather
         than faked again. */}
      <div className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-6 flex items-start gap-3">
        <Info className="w-4.5 h-4.5 text-white/30 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white/70">Traffic sources, conversion funnel, and top makes/regions aren't tracked yet</p>
          <p className="text-xs text-white/35 mt-1 max-w-2xl">
            These need session/event tracking and a listings breakdown that don't exist on the backend yet.
            This section will be built out once that data is actually being collected, instead of showing
            placeholder numbers.
          </p>
        </div>
      </div>
    </div>
  );
}
