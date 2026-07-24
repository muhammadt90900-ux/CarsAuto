'use client';
// app/[locale]/dashboard/seller-home.tsx — Seller/Dealer dashboard — UX-Improved: action prompts, quick actions, activity feed

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { listingsApi, chatApi, notificationsApi, accountingApi, inventoryApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  TrendingUp, Eye, Car, MessageSquare,
  ArrowUpRight, Plus, ChevronRight,
  CheckCircle2, AlertCircle, Zap, Star, Bell,
  ArrowDownRight, Wallet, PackageX, Receipt
} from 'lucide-react';

function MiniSparkline({ values, color }: { values?: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const h = 40, w = 88;
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
  ).join(' ');
  const colorMap: Record<string, string> = {
    blue: '#3b82f6', emerald: '#10b981', violet: '#8b5cf6', amber: '#f59e0b',
  };
  const c = colorMap[color] ?? 'var(--gold)';
  // Fill area
  const fillPts = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} aria-hidden className="opacity-80">
      <defs>
        <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#g-${color})`} />
      <polyline points={pts} fill="none" stroke={c} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ labelKey, value, change, trend, icon: Icon, color, iconBg, sparkline, t }: any) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                    bg-white dark:bg-[var(--ink-750)] p-5 space-y-4
                    hover:border-[rgba(201,168,76,0.25)] dark:hover:border-[rgba(201,168,76,0.2)]
                    transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="w-4.5 h-4.5" aria-hidden />
        </div>
        <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full
          ${trend === 'up'
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400'}`}>
          {trend === 'up'
            ? <ArrowUpRight className="w-3 h-3" aria-hidden />
            : <ArrowDownRight className="w-3 h-3" aria-hidden />}
          {change}
        </span>
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t(labelKey as any)}</p>
      </div>
      {sparkline && sparkline.length >= 2 && <MiniSparkline values={sparkline} color={color} />}
    </div>
  );
}

export default function SellerDashboardHome() {
  const t = useTranslations('dashboard');
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');
  const user = useAuthStore(s => s.user);

  // ── Real data: fetch the user's own listings ─────────────────────────────
  const { data: myListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'my'],
    queryFn:  () => listingsApi.myListings(),
    staleTime: 60_000,
  });

  // ── Real unread counts ───────────────────────────────────────────────────
  const { data: conversations = [] } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn:  chatApi.getConversations,
    staleTime: 30_000,
  });
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn:  notificationsApi.getAll,
    staleTime: 30_000,
  });

  // ── ERP snapshot — only for actual dealer accounts (an ADMIN viewing this
  // page has no Dealer row, so these are gated on role to avoid a 403) ────
  const isDealer = user?.role === 'DEALER';
  const { data: profitLoss } = useQuery({
    queryKey: ['accounting', 'profit-loss', 'monthly'],
    queryFn: () => accountingApi.getProfitLoss({ period: 'monthly' }),
    enabled: isDealer,
    staleTime: 60_000,
  });
  const { data: lowStockItems } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
    enabled: isDealer,
    staleTime: 60_000,
  });

  const unreadMessages = (conversations as any[])
    .reduce((sum: number, c: any) => sum + (c.unreadCount ?? c.unread ?? 0), 0);
  const unreadNotifs = ((notifData as any)?.data ?? notifData ?? [] as any[])
    .filter((n: any) => !n.readAt).length;

  // Activity feed from real notifications (most recent 5 unread)
  const activityItems: any[] = ((notifData as any)?.data ?? notifData ?? [] as any[])
    .slice(0, 5);

  const activeCount = myListings
    ? (myListings as any[]).filter((l: any) => l.status === 'ACTIVE').length
    : null;

  const totalViews = myListings
    ? (myListings as any[]).reduce((sum: number, l: any) => sum + (l.views ?? 0), 0)
    : null;

  // ── Stats — only real values; no fake change % or sparklines ────────────
  const stats = [
    {
      labelKey: 'totalViews',
      value:    listingsLoading ? '—' : (totalViews ?? 0).toLocaleString(),
      icon: Eye, color: 'blue',
      iconBg:    'bg-blue-500/10 text-blue-500',
    },
    {
      labelKey: 'activeListings',
      value:    listingsLoading ? '—' : String(activeCount ?? 0),
      icon: Car, color: 'emerald',
      iconBg:    'bg-emerald-500/10 text-emerald-500',
    },
    {
      labelKey: 'newMessages',
      value:    unreadMessages > 0 ? String(unreadMessages) : '0',
      icon: MessageSquare, color: 'violet',
      iconBg:    'bg-violet-500/10 text-violet-500',
    },
    {
      labelKey: 'notifications',
      value:    unreadNotifs > 0 ? String(unreadNotifs) : '0',
      icon: Bell, color: 'amber',
      iconBg:    'bg-amber-500/10 text-amber-500',
    },
  ];

  // ── Recent listings from real API (last 4) ───────────────────────────────
  const recentListings = myListings
    ? (myListings as any[]).slice(0, 4).map((l: any) => ({
        id:       l.id,
        name:     l.titleEn ?? l.titleKu ?? 'Listing',
        price:    l.price ? `$${Number(l.price).toLocaleString()}` : 'Contact',
        views:    l.views ?? 0,
        status:   (l.status ?? 'active').toLowerCase() as string,
        daysLeft: null as number | null,
      }))
    : [];

  const quickActions = [
    { label: 'Post a Listing', icon: Plus,         href: `/${locale}/dashboard/listings`, color: 'text-[var(--gold)] bg-[var(--gold-subtle)] hover:bg-[rgba(201,168,76,0.2)]', primary: true },
    { label: 'View Messages',  icon: MessageSquare, href: `/${locale}/dashboard/messages`, color: 'text-violet-400 bg-violet-500/10 hover:bg-violet-500/15', badge: unreadMessages > 0 ? String(unreadMessages) : undefined },
    { label: 'Notifications',  icon: Bell,          href: `/${locale}/dashboard/notifications`, color: 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/15', badge: unreadNotifs > 0 ? String(unreadNotifs) : undefined },
    { label: 'My Favorites',   icon: Star,          href: `/${locale}/dashboard/favorites`, color: 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/15' },
  ];

  const statusConfig: Record<string, { label: string; cls: string }> = {
    active:  { label: 'Active',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  };

  return (
    <div className="p-5 lg:p-7 space-y-6">

      {/* ── Welcome header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">
            {user?.name ? `سڵاو، ${user.name}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Good morning — here&apos;s what&apos;s happening today
          </p>
        </div>
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-bold
                     bg-[var(--gold)] text-[var(--ink-900)] hover:bg-[#d4b45a]
                     transition-all duration-200 shadow-[0_4px_16px_rgba(201,168,76,0.35)]"
        >
          <Plus className="w-4 h-4" />
          New Listing
        </Link>
      </div>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(({ label, icon: Icon, href, color, badge, primary }) => (
          <Link key={label} href={href}
                className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl
                            border transition-all duration-200 font-semibold text-xs text-center
                            ${color}
                            ${primary
                              ? 'border-[rgba(201,168,76,0.3)] hover:border-[rgba(201,168,76,0.5)]'
                              : 'border-gray-100 dark:border-white/[0.06] hover:border-transparent'}`}>
            <Icon className="w-5 h-5" aria-hidden />
            {label}
            {badge && (
              <span className="absolute top-2 end-2 w-5 h-5 flex items-center justify-center
                               text-[10px] font-bold rounded-full bg-[#e94560] text-white">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Stats grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {listingsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                                      bg-white dark:bg-[var(--ink-750)] p-5 space-y-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5" />
                <div className="space-y-2">
                  <div className="h-6 w-1/2 bg-gray-100 dark:bg-white/5 rounded" />
                  <div className="h-3 w-3/4 bg-gray-100 dark:bg-white/5 rounded" />
                </div>
              </div>
            ))
          : stats.map(s => <StatCard key={s.labelKey} {...s} t={t} />)
        }
      </div>

      {/* ── ERP snapshot — revenue + low-stock, dealer accounts only ────── */}
      {isDealer && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Link
            href={`/${locale}/dashboard/dealers/accounting`}
            className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                       bg-white dark:bg-[var(--ink-750)] p-5 hover:border-[rgba(201,168,76,0.3)]
                       transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--gold-subtle)] text-[var(--gold-light)]">
                <Wallet className="w-4.5 h-4.5" aria-hidden />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-[var(--gold)] transition-colors" />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-4">
              {profitLoss ? profitLoss.netProfit.toFixed(2) : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Net Profit (this month)</p>
          </Link>

          <Link
            href={`/${locale}/dashboard/dealers/sales`}
            className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                       bg-white dark:bg-[var(--ink-750)] p-5 hover:border-[rgba(201,168,76,0.3)]
                       transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                <Receipt className="w-4.5 h-4.5" aria-hidden />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-[var(--gold)] transition-colors" />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-4">
              {profitLoss ? profitLoss.revenue.toFixed(2) : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Revenue (this month)</p>
          </Link>

          <Link
            href={`/${locale}/dashboard/dealers/inventory`}
            className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                       bg-white dark:bg-[var(--ink-750)] p-5 hover:border-[rgba(201,168,76,0.3)]
                       transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                lowStockItems && lowStockItems.length > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-gray-100 dark:bg-white/5 text-gray-400'
              }`}>
                <PackageX className="w-4.5 h-4.5" aria-hidden />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-[var(--gold)] transition-colors" />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-4">
              {lowStockItems ? lowStockItems.length : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Low / Out of Stock Items</p>
          </Link>
        </div>
      )}

      {/* ── Bottom 2-col ─────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent listings — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-white/[0.07]
                        bg-white dark:bg-[var(--ink-750)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b
                          border-gray-100 dark:border-white/[0.07]">
            <h2 className="font-bold text-gray-900 dark:text-white">Recent Listings</h2>
            <Link href="/dashboard/listings"
                  className="text-xs text-[var(--gold)] font-semibold hover:text-[#d4b45a] transition-colors
                             flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {recentListings.map((listing) => {
              const s = statusConfig[listing.status] ?? statusConfig.active;
              const urgentRenew = listing.daysLeft !== null && listing.daysLeft <= 7;
              return (
                <div key={listing.id}
                     className="flex items-center justify-between px-5 py-3.5
                                hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex-shrink-0
                                    flex items-center justify-center">
                      <Car className="w-4 h-4 text-gray-400" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {listing.name}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Eye className="w-3 h-3" aria-hidden />
                        {listing.views} views
                        {listing.daysLeft !== null && (
                          <span className={`ms-2 font-semibold ${urgentRenew ? 'text-amber-500' : 'text-gray-400'}`}>
                            · {listing.daysLeft}d left
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-bold text-[var(--gold)]">{listing.price}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.07]">
            <Link
              href="/dashboard/listings"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold
                         border border-dashed border-gray-200 dark:border-white/[0.10]
                         text-gray-400 dark:text-white/30 hover:border-[rgba(201,168,76,0.4)] hover:text-[var(--gold)]
                         transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> Add new listing
            </Link>
          </div>
        </div>

        {/* Activity feed — real notifications ─────────────── */}
        <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                        bg-white dark:bg-[var(--ink-750)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b
                          border-gray-100 dark:border-white/[0.07]">
            <h2 className="font-bold text-gray-900 dark:text-white">Activity</h2>
            <Link href={`/${locale}/dashboard/notifications`}
                  className="text-xs text-[var(--gold)] hover:text-[#d4b45a] transition-colors">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {activityItems.length > 0 ? (
              activityItems.map((item: any, i: number) => (
                <div key={item.id ?? i} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                                   bg-gray-100 dark:bg-white/5 text-[var(--gold)] mt-0.5">
                    <Bell className="w-3.5 h-3.5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700 dark:text-white/70 leading-snug">
                      {item.message ?? item.body ?? item.title ?? 'Notification'}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Upsell / tip banner ──────────────────────────────── */}
      <div className="rounded-2xl p-5 flex items-center justify-between gap-4
                      bg-gradient-to-r from-[var(--gold-subtle)] to-[#9e6e1e]/5
                      border border-[rgba(201,168,76,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(201,168,76,0.2)] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-[var(--gold)]" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Boost your listings</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Featured listings get 5× more views. Upgrade to Premium now.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/subscription"
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold
                     bg-[var(--gold)] text-[var(--ink-900)] hover:bg-[#d4b45a] transition-all duration-200
                     shadow-[0_4px_16px_rgba(201,168,76,0.35)]"
        >
          Upgrade <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
