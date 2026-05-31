'use client';
// components/admin/AdminDashboardClient.tsx — Enterprise admin dashboard
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Users, Car, Package, Store,
  DollarSign, Eye, CheckCircle2, XCircle, Clock, BarChart3,
  ArrowUpRight, Shield, Bell, Search, Filter, RefreshCw,
} from 'lucide-react';

const MOCK_STATS = {
  totalListings:   { value: 24_187, change: +8.4,  icon: Car,        color: '#3b82f6' },
  activeUsers:     { value: 50_432, change: +12.1, icon: Users,      color: '#22c55e' },
  totalRevenue:    { value: 142_800, change: +5.3,  icon: DollarSign, color: '#c9a84c' },
  verifiedDealers: { value: 1_243,  change: +3.8,  icon: Store,      color: '#a855f7' },
};

const RECENT_LISTINGS = Array.from({ length: 8 }, (_, i) => ({
  id: `L${1000 + i}`,
  title: ['Toyota Land Cruiser 2023','BMW X5 M50i','Lexus LX570 VIP','KIA Sportage 2023',
          'Mercedes GLE 450','Nissan Patrol 2022','Hyundai Tucson','Ford Explorer 2022'][i],
  seller: ['Ahmad K.','Sara M.','Mohammed H.','Zara A.','Hassan R.','Dina S.','Omar F.','Layla T.'][i],
  price: [85000,72000,95000,24000,78000,65000,26000,45000][i],
  status: ['ACTIVE','PENDING','ACTIVE','REJECTED','ACTIVE','PENDING','ACTIVE','ACTIVE'][i] as any,
  date: `${i + 1}h ago`,
  type: 'CAR',
}));

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: 'Active',   color: '#16a34a', bg: 'rgba(22,163,74,0.12)'   },
  PENDING:  { label: 'Pending',  color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,0.12)'   },
  SOLD:     { label: 'Sold',     color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
};

const CHART_DATA = [
  { month: 'Jan', listings: 1800, users: 3200 },
  { month: 'Feb', listings: 2100, users: 3800 },
  { month: 'Mar', listings: 1950, users: 3500 },
  { month: 'Apr', listings: 2400, users: 4200 },
  { month: 'May', listings: 2800, users: 4900 },
  { month: 'Jun', listings: 3100, users: 5400 },
];

export function AdminDashboardClient() {
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'>('30d');

  const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);
  const fmtCur = (v: number) => '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Welcome back, Admin · Last updated just now
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-[var(--border-default)] bg-white dark:bg-[#0b1525]">
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
          <button className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold
                             bg-white dark:bg-[#0b1525] border border-[var(--border-default)]
                             text-[var(--text-muted)] hover:text-[var(--gold)] hover:border-[var(--border-gold)] transition-all">
            <RefreshCw className="w-3.5 h-3.5"/><span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {Object.entries(MOCK_STATS).map(([key, stat]) => {
          const Icon = stat.icon;
          const isUp = stat.change > 0;
          return (
            <div key={key} className="card-premium p-5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                     style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}22` }}>
                  <Icon className="w-5 h-5" style={{ color: stat.color }}/>
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full
                  ${isUp ? 'text-[#16a34a] bg-[rgba(22,163,74,0.10)]' : 'text-[#dc2626] bg-[rgba(220,38,38,0.10)]'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                  {Math.abs(stat.change)}%
                </span>
              </div>
              <p className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {key === 'totalRevenue' ? fmtCur(stat.value) : fmtNum(stat.value)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mini bar chart */}
        <div className="lg:col-span-2 card-premium p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--gold)]"/>Growth Overview
            </h2>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]"/>Listings</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"/>Users</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {CHART_DATA.map((d, i) => {
              const maxListings = Math.max(...CHART_DATA.map(x => x.listings));
              const maxUsers    = Math.max(...CHART_DATA.map(x => x.users));
              const lPct = (d.listings / maxListings) * 100;
              const uPct = (d.users / maxUsers) * 100;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5"
                     style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="w-full flex items-end gap-1 h-32">
                    <div className="flex-1 rounded-t-lg transition-all duration-500 hover:opacity-80"
                         style={{ height:`${lPct}%`, background:'linear-gradient(180deg,var(--gold),var(--gold-dim))' }}/>
                    <div className="flex-1 rounded-t-lg transition-all duration-500 hover:opacity-80"
                         style={{ height:`${uPct}%`, background:'linear-gradient(180deg,#3b82f6,#1d4ed8)' }}/>
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)]">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card-premium p-6">
          <h2 className="font-bold text-[var(--text-primary)] mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label:'Review Pending Listings', count: 23, color:'#d97706', icon: Clock },
              { label:'Verify New Dealers',      count: 7,  color:'#a855f7', icon: Store },
              { label:'User Reports',            count: 12, color:'#dc2626', icon: Bell  },
              { label:'Approve Parts',           count: 8,  color:'#3b82f6', icon: Package},
            ].map(a => {
              const Icon = a.icon;
              return (
                <button key={a.label}
                  className="w-full flex items-center justify-between p-3 rounded-xl
                             bg-[var(--surface-50)] dark:bg-white/[0.04]
                             border border-[var(--border-subtle)]
                             hover:border-[var(--border-gold)] hover:bg-[var(--gold-subtle)]
                             transition-all duration-200 group">
                  <span className="flex items-center gap-2.5 text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--gold)]">
                    <Icon className="w-4 h-4" style={{ color: a.color }}/>
                    {a.label}
                  </span>
                  <span className="text-xs font-black rounded-full w-6 h-6 flex items-center justify-center"
                        style={{ background:`${a.color}15`, color:a.color }}>
                    {a.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent listings table */}
      <div className="card-premium overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="font-bold text-[var(--text-primary)]">Recent Listings</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]"/>
              <input placeholder="Search…" className="input-base pl-9 h-8 text-xs w-48"/>
            </div>
            <button className="p-2 rounded-xl border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--gold)] hover:border-[var(--border-gold)] transition-all">
              <Filter className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
        <div className="table-responsive overflow-x-auto">
          <table className="table-base" style={{ minWidth: '600px' }}>
            <thead>
              <tr>
                <th>ID</th><th>Listing</th><th>Seller</th><th>Price</th>
                <th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_LISTINGS.map(l => {
                const sc = STATUS_CONFIG[l.status];
                return (
                  <tr key={l.id} className="group">
                    <td className="font-mono text-[var(--text-muted)] text-xs">{l.id}</td>
                    <td>
                      <p className="font-semibold text-[var(--text-primary)] text-sm">{l.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{l.type}</p>
                    </td>
                    <td className="text-[var(--text-secondary)] text-sm">{l.seller}</td>
                    <td className="font-bold text-[var(--gold)] text-sm">${l.price.toLocaleString()}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                            style={{ background: sc.bg, color: sc.color, border:`1px solid ${sc.color}25` }}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="text-[var(--text-muted)] text-xs">{l.date}</td>
                    <td>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg text-[#16a34a] bg-[rgba(22,163,74,0.08)] hover:bg-[rgba(22,163,74,0.16)] transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5"/>
                        </button>
                        <button className="p-1.5 rounded-lg text-[#dc2626] bg-[rgba(220,38,38,0.08)] hover:bg-[rgba(220,38,38,0.16)] transition-colors">
                          <XCircle className="w-3.5 h-3.5"/>
                        </button>
                        <button className="p-1.5 rounded-lg text-[var(--text-muted)] bg-[var(--surface-100)] hover:bg-[var(--surface-200)] transition-colors">
                          <Eye className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-muted)]">Showing 8 of 243 listings</p>
          <div className="flex gap-1">
            {[1,2,3,'…',31].map((p,i) => (
              <button key={i}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all
                  ${p === 1
                    ? 'bg-[var(--gold)] text-[var(--ink-900)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--gold)] hover:bg-[var(--gold-subtle)]'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
