'use client';
// components/admin/AdminDashboardClient.tsx
// All data now comes from real API endpoints — zero hardcoded mock values.
//   GET /admin/stats     → KPI cards
//   GET /admin/analytics → 6-month chart
//   GET /admin/listings  → recent listings table (limit 8, status=PENDING first)

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  TrendingUp, TrendingDown, Users, Car, Package, Store,
  DollarSign, Eye, CheckCircle2, XCircle, Clock, BarChart3,
  ArrowUpRight, Shield, Bell, RefreshCw,
  ShieldCheck, FileWarning, ClipboardList, Crown,
} from 'lucide-react';

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchStats    = () => api.get('/admin/stats').then(r => r.data);
const fetchAnalytics= () => api.get('/admin/analytics').then(r => r.data);
const fetchListings = () => api.get('/admin/listings?limit=8&sort=newest').then(r => r.data);

// ── Status config (lookup, not mock data) ─────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: 'Active',   color: 'var(--status-success)', bg: 'rgba(22,163,74,0.12)'   },
  PENDING:  { label: 'Pending',  color: 'var(--status-warning)', bg: 'rgba(217,119,6,0.12)'   },
  REJECTED: { label: 'Rejected', color: 'var(--status-error)', bg: 'rgba(220,38,38,0.12)'   },
  SOLD:     { label: 'Sold',     color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  EXPIRED:  { label: 'Expired',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

// ── Empty / Loading helpers ───────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="card-premium p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-2xl bg-white/5" />
        <div className="h-5 w-16 rounded-full bg-white/5" />
      </div>
      <div className="space-y-2">
        <div className="h-7 w-28 rounded bg-white/5" />
        <div className="h-3 w-20 rounded bg-white/5" />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
        <BarChart3 className="w-6 h-6 text-white/20" />
      </div>
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { label: string; listings: number; users: number }[] }) {
  if (!data?.length) return <EmptyState message="No chart data yet" />;
  const maxVal = Math.max(...data.flatMap(d => [d.listings, d.users]), 1);
  return (
    <div className="flex items-end gap-2 h-32 pt-4">
      {data.map(d => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex gap-0.5 items-end" style={{ height: 80 }}>
            <div
              className="flex-1 rounded-t-sm bg-[rgba(201,168,76,0.7)] transition-all duration-500"
              style={{ height: `${(d.listings / maxVal) * 80}px` }}
              title={`${d.listings} listings`}
            />
            <div
              className="flex-1 rounded-t-sm bg-blue-500/50 transition-all duration-500"
              style={{ height: `${(d.users / maxVal) * 80}px` }}
              title={`${d.users} users`}
            />
          </div>
          <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminDashboardClient() {
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'>('30d');
  const params   = useParams();
  const locale   = Array.isArray(params?.locale) ? params.locale[0] : (params?.locale ?? 'ku');

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchStats, staleTime: 30_000 });

  const {
    data: chartData,
    isLoading: chartLoading,
  } = useQuery({ queryKey: ['admin', 'analytics'], queryFn: fetchAnalytics, staleTime: 60_000 });

  const {
    data: listingsData,
    isLoading: listingsLoading,
  } = useQuery({ queryKey: ['admin', 'listings', 'recent'], queryFn: fetchListings, staleTime: 30_000 });

  const recentListings: any[] = listingsData?.data ?? listingsData ?? [];

  const fmtNum = (v: number | undefined) =>
    v !== undefined && v !== null
      ? new Intl.NumberFormat('en-US').format(v)
      : '—';

  // ── KPI cards built from real stats ─────────────────────────────────────
  const kpis = [
    { key: 'totalUsers',     label: 'Total Users',       value: stats?.totalUsers,     icon: Users,      color: '#22c55e' },
    { key: 'totalListings',  label: 'Total Listings',    value: stats?.totalListings,  icon: Car,        color: '#3b82f6' },
    { key: 'activeListings', label: 'Active Listings',   value: stats?.activeListings, icon: Eye,        color: 'var(--gold)' },
    { key: 'totalReports',   label: 'Open Reports',      value: stats?.totalReports,   icon: FileWarning,color: '#ef4444' },
    { key: 'totalDealers',   label: 'Total Dealers',     value: stats?.totalDealers,   icon: Store,      color: '#8b5cf6' },
    { key: 'activeSubscriptions', label: 'Premium Dealers', value: stats?.activeSubscriptions, icon: Crown, color: 'var(--gold)' },
    { key: 'totalRevenue',  label: 'Total Revenue',     value: stats?.totalRevenue,   icon: DollarSign, color: 'var(--status-success)', isCurrency: true },
    { key: 'bannedUsers',   label: 'Banned / Suspended', value: (stats?.bannedUsers ?? 0) + (stats?.suspendedUsers ?? 0), icon: Shield, color: 'var(--status-error)' },
  ];

  // ── Quick actions using real pending counts ──────────────────────────────
  const quickActions = [
    { label: 'Review Pending Listings', count: stats?.pendingListings, color: 'var(--status-warning)', icon: Clock,        href: `/${locale}/admin/moderation`     },
    { label: 'Open User Reports',       count: stats?.totalReports,    color: 'var(--status-error)', icon: FileWarning,  href: `/${locale}/admin/reports`        },
    { label: 'Manage Users',            count: stats?.totalUsers,      color: '#22c55e', icon: Users,        href: `/${locale}/admin/users`          },
    { label: 'Pending Dealers',         count: stats?.pendingDealers,  color: '#8b5cf6', icon: Store,        href: `/${locale}/admin/dealers`        },
    { label: 'Featured Listings',       count: stats?.featuredListings,color: 'var(--gold)', icon: Shield,       href: `/${locale}/admin/featured`       },
    { label: 'Transactions',            count: null,                   color: '#3b82f6', icon: DollarSign,   href: `/${locale}/admin/transactions`   },
  ];

  // ── Feature cards using real counts ─────────────────────────────────────
  const featureCards = [
    { label: 'User Management',   desc: stats?.totalUsers    ? `${fmtNum(stats.totalUsers)} accounts`     : 'Manage accounts', icon: Users,        color: '#22c55e', href: `/${locale}/admin/users`         },
    { label: 'Dealers',           desc: stats?.totalDealers  ? `${fmtNum(stats.totalDealers)} registered`  : 'Manage dealers',  icon: Store,        color: '#8b5cf6', href: `/${locale}/admin/dealers`       },
    { label: 'Listings',          desc: stats?.totalListings ? `${fmtNum(stats.totalListings)} total`      : 'Manage listings', icon: Car,          color: '#3b82f6', href: `/${locale}/admin/listings`      },
    { label: 'Reports',           desc: stats?.totalReports  ? `${fmtNum(stats.totalReports)} open`        : 'No open reports', icon: FileWarning,  color: '#ef4444', href: `/${locale}/admin/reports`       },
    { label: 'Transactions',      desc: 'Payments across all gateways',                                   icon: DollarSign,  color: 'var(--status-success)', href: `/${locale}/admin/transactions`  },
    { label: 'Subscriptions',     desc: stats?.activeSubscriptions ? `${fmtNum(stats.activeSubscriptions)} active` : 'Premium dealer plans', icon: Crown, color: 'var(--gold)', href: `/${locale}/admin/subscriptions` },
    { label: 'Analytics',         desc: 'Listings & users over time',                                     icon: BarChart3,    color: '#3b82f6', href: `/${locale}/admin/analytics`     },
    { label: 'Audit Logs',        desc: 'Full action history',                                            icon: ClipboardList,color: '#8b5cf6', href: `/${locale}/admin/audit-logs`    },
    { label: 'Moderation',        desc: stats?.pendingListings ? `${fmtNum(stats.pendingListings)} pending` : 'Nothing pending', icon: ShieldCheck,  color: '#f59e0b', href: `/${locale}/admin/moderation`    },
    { label: 'Notifications',     desc: 'Send platform-wide alerts',                                     icon: Bell,         color: '#f43f5e', href: `/${locale}/admin/notifications` },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Platform overview · live data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-[var(--border-default)] bg-white dark:bg-[var(--ink-750)]">
            {(['7d','30d','90d'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 sm:px-4 py-2 text-xs font-semibold transition-colors
                  ${period === p
                    ? 'bg-[var(--gold-subtle)] text-[var(--gold)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}>
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetchStats()}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold
                       bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)]
                       text-[var(--text-muted)] hover:text-[var(--gold)] hover:border-[var(--border-gold)] transition-all">
            <RefreshCw className="w-3.5 h-3.5"/><span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {statsLoading
          ? Array.from({length:8}).map((_,i) => <KpiSkeleton key={i} />)
          : kpis.map(({ key, label, value, icon: Icon, color, isCurrency }) => (
            <div key={key} className="card-premium p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                     style={{ background:`${color}15`, border:`1px solid ${color}22` }}>
                  <Icon className="w-5 h-5" style={{ color }}/>
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                  {isCurrency ? `$${fmtNum(value)}` : fmtNum(value)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
              </div>
            </div>
          ))
        }
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {quickActions.map(({ label, count, color, icon: Icon, href }) => (
            <Link key={label} href={href}
              className="card-premium p-4 flex flex-col gap-2.5 hover:border-opacity-50 transition-all group">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background:`${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                {count !== null && count !== undefined && (
                  <span className="text-lg font-black" style={{ color }}>
                    {fmtNum(count)}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] leading-tight group-hover:text-[var(--text-primary)] transition-colors">
                {label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Chart + Recent listings */}
      <div className="grid xl:grid-cols-3 gap-6">

        {/* Chart 2/3 */}
        <div className="xl:col-span-2 card-premium p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[var(--text-primary)]">Platform Growth</h2>
            <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[rgba(201,168,76,0.7)] inline-block"/>Listings</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/50 inline-block"/>Users</span>
            </div>
          </div>
          {chartLoading
            ? <div className="h-32 animate-pulse bg-white/5 rounded-xl" />
            : <MiniBarChart data={chartData ?? []} />
          }
        </div>

        {/* Feature cards 1/3 */}
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-3">
          {featureCards.slice(0, 3).map(({ label, desc, icon: Icon, color, href }) => (
            <Link key={label} href={href}
              className="card-premium p-4 flex items-center gap-3 hover:border-opacity-50 transition-all group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background:`${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{label}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{desc}</p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors ml-auto flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent listings */}
      <div className="card-premium overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="font-bold text-[var(--text-primary)]">Recent Listings</h2>
          <Link href={`/${locale}/admin/moderation`}
            className="text-xs text-[var(--gold)] font-semibold hover:text-[var(--gold-light)] transition-colors flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {listingsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({length:5}).map((_,i) => (
                <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : recentListings.length === 0 ? (
            <EmptyState message="No listings yet" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {['Title','Seller','Price','Status','Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-start text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {recentListings.map((l: any) => {
                  const s = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.ACTIVE;
                  const title = l.titleEn ?? l.titleKu ?? `Listing ${l.id}`;
                  const seller = l.user?.name ?? l.seller ?? '—';
                  const price = l.price ? `$${new Intl.NumberFormat('en-US').format(Number(l.price))}` : '—';
                  const date = l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—';
                  return (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 font-medium text-[var(--text-primary)] max-w-[180px] truncate">{title}</td>
                      <td className="px-5 py-3 text-[var(--text-muted)]">{seller}</td>
                      <td className="px-5 py-3 font-bold text-[var(--gold)]">{price}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ color: s.color, background: s.bg }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-muted)] text-xs">{date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Feature nav grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {featureCards.map(({ label, desc, icon: Icon, color, href }) => (
          <Link key={label} href={href}
            className="card-premium p-4 flex flex-col gap-2 hover:border-opacity-50 transition-all group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background:`${color}15` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] leading-tight">{label}</p>
            <p className="text-[10px] text-[var(--text-muted)] leading-snug">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
