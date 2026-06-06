'use client';
// app/[locale]/dashboard/page.tsx — UX-Improved: action prompts, quick actions, activity feed

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  TrendingUp, Eye, Car, MessageSquare, DollarSign,
  ArrowUpRight, ArrowDownRight, Plus, ChevronRight,
  Clock, CheckCircle2, AlertCircle, Zap, Star, Bell
} from 'lucide-react';

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
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
  const c = colorMap[color] ?? '#c9a84c';
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
                    bg-white dark:bg-[#0b1525] p-5 space-y-4
                    hover:border-[#c9a84c]/25 dark:hover:border-[#c9a84c]/20
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
      <MiniSparkline values={sparkline} color={color} />
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');

  const stats = [
    { labelKey: 'totalViews',    value: '24,891', change: '+18.2%', trend: 'up',   icon: Eye,           color: 'blue',    iconBg: 'bg-blue-500/10 text-blue-500',     sparkline: [40,55,45,70,65,80,90,85,95] },
    { labelKey: 'activeListings',value: '12',     change: '+3',     trend: 'up',   icon: Car,           color: 'emerald', iconBg: 'bg-emerald-500/10 text-emerald-500',sparkline: [6,8,7,9,10,10,11,12,12] },
    { labelKey: 'newMessages',   value: '38',     change: '-4.1%',  trend: 'down', icon: MessageSquare, color: 'violet',  iconBg: 'bg-violet-500/10 text-violet-500',  sparkline: [50,44,48,42,45,40,38,42,38] },
    { labelKey: 'revenue',       value: '$3,240', change: '+22.5%', trend: 'up',   icon: DollarSign,    color: 'amber',   iconBg: 'bg-amber-500/10 text-amber-500',    sparkline: [1200,1500,1350,1800,2100,2400,2800,3000,3240] },
  ];

  const recentListings = [
    { id: 1, name: 'Toyota Camry 2022',  price: '$18,500', views: 342, status: 'active',  daysLeft: 28 },
    { id: 2, name: 'BMW 3 Series 2021',  price: '$28,900', views: 198, status: 'active',  daysLeft: 15 },
    { id: 3, name: 'Honda CR-V 2023',    price: '$24,200', views: 87,  status: 'pending', daysLeft: null },
    { id: 4, name: 'Mercedes C200 2020', price: '$31,000', views: 521, status: 'active',  daysLeft: 6 },
  ];

  const quickActions = [
    { label: 'Post a Listing', icon: Plus,  href: `/${locale}/dashboard/listings`, color: 'text-[#c9a84c] bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20', primary: true },
    { label: 'View Messages',  icon: MessageSquare, href: `/${locale}/dashboard/messages`, color: 'text-violet-400 bg-violet-500/10 hover:bg-violet-500/15', badge: '3' },
    { label: 'Notifications',  icon: Bell,  href: `/${locale}/dashboard/notifications`, color: 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/15', badge: '5' },
    { label: 'My Favorites',   icon: Star,  href: `/${locale}/dashboard/favorites`, color: 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/15' },
  ];

  const activityFeed = [
    { icon: Eye,           color: 'text-blue-400',    text: 'Toyota Camry viewed 12 times today', time: '2m ago' },
    { icon: MessageSquare, color: 'text-violet-400',  text: 'New inquiry on BMW 3 Series', time: '18m ago' },
    { icon: CheckCircle2,  color: 'text-emerald-400', text: 'Mercedes C200 listing approved', time: '1h ago' },
    { icon: AlertCircle,   color: 'text-amber-400',   text: 'Honda CR-V pending review', time: '3h ago' },
    { icon: Zap,           color: 'text-[#c9a84c]',   text: 'Subscription renews in 6 days', time: '5h ago' },
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
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Good morning — here's what's happening today
          </p>
        </div>
        <Link
          href={`/${locale}/dashboard/listings`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-bold
                     bg-[#c9a84c] text-[#050b14] hover:bg-[#d4b45a]
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
                              ? 'border-[#c9a84c]/30 hover:border-[#c9a84c]/50'
                              : 'border-gray-100 dark:border-white/[0.06] hover:border-transparent'}`}>
            <Icon className="w-5 h-5" aria-hidden />
            {label}
            {badge && (
              <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center
                               text-[10px] font-bold rounded-full bg-[#e94560] text-white">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Stats grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.labelKey} {...s} t={t} />)}
      </div>

      {/* ── Bottom 2-col ─────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent listings — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-white/[0.07]
                        bg-white dark:bg-[#0b1525] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b
                          border-gray-100 dark:border-white/[0.07]">
            <h2 className="font-bold text-gray-900 dark:text-white">Recent Listings</h2>
            <Link href={`/${locale}/dashboard/listings`}
                  className="text-xs text-[#c9a84c] font-semibold hover:text-[#d4b45a] transition-colors
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
                          <span className={`ml-2 font-semibold ${urgentRenew ? 'text-amber-500' : 'text-gray-400'}`}>
                            · {listing.daysLeft}d left
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-bold text-[#c9a84c]">{listing.price}</p>
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
              href={`/${locale}/dashboard/listings`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold
                         border border-dashed border-gray-200 dark:border-white/[0.10]
                         text-gray-400 dark:text-white/30 hover:border-[#c9a84c]/40 hover:text-[#c9a84c]
                         transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> Add new listing
            </Link>
          </div>
        </div>

        {/* Activity feed — 1/3 */}
        <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                        bg-white dark:bg-[#0b1525] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b
                          border-gray-100 dark:border-white/[0.07]">
            <h2 className="font-bold text-gray-900 dark:text-white">Activity</h2>
            <Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden />
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {activityFeed.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                                 bg-gray-100 dark:bg-white/5 ${item.color} mt-0.5`}>
                  <item.icon className="w-3.5 h-3.5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 dark:text-white/70 leading-snug">{item.text}</p>
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upsell / tip banner ──────────────────────────────── */}
      <div className="rounded-2xl p-5 flex items-center justify-between gap-4
                      bg-gradient-to-r from-[#c9a84c]/10 to-[#9e6e1e]/5
                      border border-[#c9a84c]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-[#c9a84c]" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Boost your listings</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Featured listings get 5× more views. Upgrade to Premium now.
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/dashboard/subscription`}
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold
                     bg-[#c9a84c] text-[#050b14] hover:bg-[#d4b45a] transition-all duration-200
                     shadow-[0_4px_16px_rgba(201,168,76,0.35)]"
        >
          Upgrade <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
