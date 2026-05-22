// apps/web/src/app/[locale]/dashboard/page.tsx
'use client';

import { TrendingUp, TrendingDown, Eye, Car, MessageSquare, DollarSign, Star, Heart, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

const stats = [
  {
    label: 'Total Views',
    value: '24,891',
    change: '+18.2%',
    trend: 'up',
    icon: Eye,
    color: 'blue',
    bg: 'from-blue-500/10 to-blue-600/5',
    iconBg: 'bg-blue-500/10 text-blue-500',
    sparkline: [40, 55, 45, 70, 65, 80, 90, 85, 95],
  },
  {
    label: 'Active Listings',
    value: '12',
    change: '+3 this week',
    trend: 'up',
    icon: Car,
    color: 'emerald',
    bg: 'from-emerald-500/10 to-emerald-600/5',
    iconBg: 'bg-emerald-500/10 text-emerald-500',
    sparkline: [6, 8, 7, 9, 10, 10, 11, 12, 12],
  },
  {
    label: 'New Messages',
    value: '38',
    change: '-4.1%',
    trend: 'down',
    icon: MessageSquare,
    color: 'violet',
    bg: 'from-violet-500/10 to-violet-600/5',
    iconBg: 'bg-violet-500/10 text-violet-500',
    sparkline: [50, 44, 48, 42, 45, 40, 38, 42, 38],
  },
  {
    label: 'Revenue',
    value: '$3,240',
    change: '+22.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'amber',
    bg: 'from-amber-500/10 to-amber-600/5',
    iconBg: 'bg-amber-500/10 text-amber-500',
    sparkline: [1200, 1500, 1350, 1800, 2100, 2400, 2800, 3000, 3240],
  },
];

const recentListings = [
  { id: 1, name: 'Toyota Camry 2022', price: '$18,500', views: 342, status: 'ACTIVE', favorites: 12 },
  { id: 2, name: 'BMW 3 Series 2021', price: '$28,900', views: 198, status: 'ACTIVE', favorites: 8 },
  { id: 3, name: 'Honda CR-V 2023', price: '$24,200', views: 87, status: 'PENDING', favorites: 3 },
  { id: 4, name: 'Mercedes C200 2020', price: '$31,000', views: 521, status: 'ACTIVE', favorites: 24 },
];

const recentActivity = [
  { action: 'New message on Toyota Camry', time: '2m ago', type: 'message' },
  { action: 'BMW 3 Series got 5 new views', time: '15m ago', type: 'view' },
  { action: 'Received 5-star review', time: '1h ago', type: 'review' },
  { action: 'Honda CR-V approved', time: '3h ago', type: 'approved' },
];

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const h = 36;
  const w = 80;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    emerald: '#10b981',
    violet: '#8b5cf6',
    amber: '#f59e0b',
  };
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline
        points={pts}
        fill="none"
        stroke={colorMap[color] ?? '#e94560'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardOverview() {
  return (
    <div className="p-5 lg:p-7 space-y-6 min-h-full bg-gray-50/50 dark:bg-transparent">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Good morning 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Here's what's happening with your listings today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 outline-none cursor-pointer">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>This year</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.bg} border border-gray-100 dark:border-white/5 p-4 bg-white dark:bg-[#0f0f1a]/80 backdrop-blur-sm group hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-8 h-8 rounded-xl ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                <Sparkline values={stat.sparkline} color={stat.color} />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            <div className="flex items-center gap-1 mt-2">
              {stat.trend === 'up' ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-400" />
              )}
              <span className={`text-[11px] font-semibold ${stat.trend === 'up' ? 'text-emerald-500' : 'text-red-400'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Listings Table */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f1a]/80 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-white/5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Listings</h2>
            <button className="text-xs text-[#e94560] font-medium hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-white/5">
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Car</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">Price</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-3 hidden md:table-cell">Views</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {recentListings.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm">🚗</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white text-xs">{l.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs font-bold text-[#e94560]">{l.price}</td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Eye className="w-3 h-3" />
                        {l.views}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        l.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${l.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f1a]/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="p-4 space-y-1">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-default">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${
                  item.type === 'message' ? 'bg-blue-50 dark:bg-blue-500/10' :
                  item.type === 'view' ? 'bg-purple-50 dark:bg-purple-500/10' :
                  item.type === 'review' ? 'bg-amber-50 dark:bg-amber-500/10' :
                  'bg-emerald-50 dark:bg-emerald-500/10'
                }`}>
                  {item.type === 'message' ? '💬' : item.type === 'view' ? '👁' : item.type === 'review' ? '⭐' : '✅'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">{item.action}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats summary */}
          <div className="px-4 pb-4">
            <div className="rounded-xl bg-gradient-to-br from-[#e94560]/10 to-[#e94560]/5 border border-[#e94560]/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-3.5 h-3.5 text-[#e94560]" />
                <p className="text-xs font-semibold text-gray-800 dark:text-white">Avg. Rating</p>
              </div>
              <p className="text-2xl font-black text-[#e94560]">4.8</p>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-3 h-3 ${s <= 4 ? 'text-[#e94560] fill-[#e94560]' : 'text-gray-300'}`} />
                ))}
                <span className="text-[10px] text-gray-400 ml-1">from 48 reviews</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
