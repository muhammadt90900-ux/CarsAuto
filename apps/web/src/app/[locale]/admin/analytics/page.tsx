'use client';
// apps/web/src/app/[locale]/admin/analytics/page.tsx
// Admin: analytics dashboard with charts, funnels, geo, and revenue breakdown

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Users, Car, DollarSign,
  Eye, BarChart2, Globe, Clock, Activity, ChevronDown,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';

// ─── Mock data ────────────────────────────────────────────────────────────────
const PERIODS = ['7d', '30d', '90d', '1y'] as const;
type Period = typeof PERIODS[number];

const MONTHLY = [
  { month: 'Jan', revenue: 11200, users: 3100, listings: 1820, views: 48000 },
  { month: 'Feb', revenue: 14800, users: 3600, listings: 2100, views: 55000 },
  { month: 'Mar', revenue: 13200, users: 3400, listings: 1960, views: 52000 },
  { month: 'Apr', revenue: 18400, users: 4200, listings: 2450, views: 68000 },
  { month: 'May', revenue: 22000, users: 4900, listings: 2810, views: 79000 },
  { month: 'Jun', revenue: 26500, users: 5400, listings: 3100, views: 91000 },
];

const TOP_MAKES = [
  { make: 'Toyota',    count: 4821, pct: 100 },
  { make: 'Kia',       count: 3210, pct: 66  },
  { make: 'Hyundai',   count: 2980, pct: 62  },
  { make: 'BMW',       count: 2540, pct: 53  },
  { make: 'Mercedes',  count: 2310, pct: 48  },
  { make: 'Lexus',     count: 1870, pct: 39  },
  { make: 'Nissan',    count: 1650, pct: 34  },
];

const TOP_REGIONS = [
  { region: 'Sulaymaniyah', listings: 8420, pct: 100, flag: '🏙️' },
  { region: 'Erbil',        listings: 7120, pct: 85,  flag: '🏙️' },
  { region: 'Duhok',        listings: 4310, pct: 51,  flag: '🏙️' },
  { region: 'Kirkuk',       listings: 2980, pct: 35,  flag: '🏙️' },
  { region: 'Baghdad',      listings: 1640, pct: 19,  flag: '🏙️' },
];

const TRAFFIC_SOURCES = [
  { source: 'Organic Search', sessions: 32400, pct: 44, color: '#22c55e' },
  { source: 'Direct',         sessions: 18200, pct: 25, color: '#3b82f6' },
  { source: 'Social Media',   sessions: 12100, pct: 16, color: '#c9a84c' },
  { source: 'Referral',       sessions: 6800,  pct: 9,  color: '#8b5cf6' },
  { source: 'Email',          sessions: 4400,  pct: 6,  color: '#f43f5e' },
];

const FUNNEL = [
  { step: 'Visited',       value: 73400, color: '#3b82f6' },
  { step: 'Searched',      value: 51800, color: '#6366f1' },
  { step: 'Viewed Listing',value: 28400, color: '#8b5cf6' },
  { step: 'Contacted',     value: 8200,  color: '#c9a84c' },
  { step: 'Converted',     value: 2100,  color: '#22c55e' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SparkLine({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-20 h-8">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function BarChart({ data, field, color }: { data: typeof MONTHLY; field: keyof typeof MONTHLY[0]; color: string }) {
  const max = Math.max(...data.map(d => d[field] as number));
  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map(d => {
        const h = ((d[field] as number) / max) * 100;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-md transition-all duration-500 hover:opacity-75 cursor-pointer"
              style={{ height: `${h}%`, background: `linear-gradient(180deg,${color},${color}88)` }}
              title={`${d.month}: ${d[field]}`}
            />
            <span className="text-[0.6rem] text-white/30">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [chartTab, setChartTab] = useState<'revenue' | 'users' | 'listings' | 'views'>('revenue');

  const KPIs = [
    { label: 'Total Revenue',    value: '$142,800', change: +8.4,  sparkData: [100, 115, 108, 132, 148, 163], color: '#c9a84c', icon: DollarSign },
    { label: 'Active Users',     value: '50,432',   change: +12.1, sparkData: [310, 360, 340, 420, 490, 540], color: '#22c55e', icon: Users },
    { label: 'Total Listings',   value: '24,187',   change: +5.6,  sparkData: [182, 210, 196, 245, 281, 310], color: '#3b82f6', icon: Car },
    { label: 'Avg Session',      value: '4m 32s',   change: -2.1,  sparkData: [310, 295, 320, 300, 280, 272], color: '#8b5cf6', icon: Clock },
    { label: 'Page Views',       value: '393,000',  change: +18.7, sparkData: [480, 550, 520, 680, 790, 910], color: '#f43f5e', icon: Eye },
    { label: 'Conversion Rate',  value: '2.86%',    change: +0.4,  sparkData: [2.1, 2.3, 2.2, 2.5, 2.7, 2.9], color: '#f59e0b', icon: Activity },
  ];

  const chartColors = { revenue: '#c9a84c', users: '#22c55e', listings: '#3b82f6', views: '#8b5cf6' };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight">Analytics</h1>
          <p className="text-white/40 text-sm mt-0.5">Platform performance and growth metrics</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07]">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === p
                  ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {KPIs.map(kpi => {
          const Icon = kpi.icon;
          const isUp = kpi.change > 0;
          return (
            <div key={kpi.label} className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-5 hover:border-white/[0.12] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}22` }}>
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    'flex items-center gap-1 text-[0.68rem] font-bold px-1.5 py-0.5 rounded-full',
                    isUp ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10',
                  )}>
                    {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(kpi.change)}%
                  </span>
                  <SparkLine data={kpi.sparkData} color={kpi.color} />
                </div>
              </div>
              <p className="text-2xl font-black text-white tabular-nums">{kpi.value}</p>
              <p className="text-[0.7rem] text-white/35 mt-0.5">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Main chart + Traffic sources */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main chart */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0a1525] border border-white/[0.07] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4.5 h-4.5 text-[#c9a84c]" />
              Growth Overview
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              {(['revenue', 'users', 'listings', 'views'] as const).map(tab => (
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
          <BarChart data={MONTHLY} field={chartTab} color={chartColors[chartTab]} />
          <div className="flex items-center justify-between mt-3 text-[0.68rem] text-white/25">
            <span>Last 6 months</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3 h-3" /> All metrics growing
            </span>
          </div>
        </div>

        {/* Traffic sources */}
        <div className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4.5 h-4.5 text-[#c9a84c]" />
            Traffic Sources
          </h2>
          <div className="space-y-3">
            {TRAFFIC_SOURCES.map(src => (
              <div key={src.source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60">{src.source}</span>
                  <span className="text-xs font-bold text-white">{src.sessions.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${src.pct}%`, background: src.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.07] space-y-1">
            {TRAFFIC_SOURCES.map(src => (
              <div key={src.source} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: src.color }} />
                <span className="text-[0.68rem] text-white/40 flex-1">{src.source}</span>
                <span className="text-[0.68rem] font-bold" style={{ color: src.color }}>{src.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion funnel + Top makes + Regions */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Funnel */}
        <div className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-[#c9a84c]" />
            Conversion Funnel
          </h2>
          <div className="space-y-2">
            {FUNNEL.map((step, i) => {
              const widthPct = (step.value / (FUNNEL[0]?.value ?? 1)) * 100;
              const prevValue = i > 0 ? (FUNNEL[i - 1]?.value ?? step.value) : step.value;
              const dropPct = i > 0 ? (((prevValue - step.value) / prevValue) * 100).toFixed(0) : null;
              return (
                <div key={step.step}>
                  {dropPct && (
                    <div className="flex items-center gap-1 py-0.5 px-3 text-[0.6rem] text-white/25">
                      <span>▼</span>
                      <span>{dropPct}% drop-off</span>
                    </div>
                  )}
                  <div className="relative">
                    <div className="h-8 rounded-lg bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center px-3"
                        style={{ width: `${widthPct}%`, background: `${step.color}25`, borderLeft: `3px solid ${step.color}` }}
                      >
                        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: step.color }}>{step.step}</span>
                      </div>
                    </div>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/60">
                      {step.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Makes */}
        <div className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Car className="w-4.5 h-4.5 text-[#c9a84c]" />
            Top Car Makes
          </h2>
          <div className="space-y-3">
            {TOP_MAKES.map((item, i) => (
              <div key={item.make} className="flex items-center gap-3">
                <span className="w-5 text-[0.68rem] font-black text-white/20 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white/70">{item.make}</span>
                    <span className="text-xs font-bold text-white">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg,#c9a84c,#e8cc7a)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Regions */}
        <div className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4.5 h-4.5 text-[#c9a84c]" />
            Top Regions
          </h2>
          <div className="space-y-3">
            {TOP_REGIONS.map((region, i) => (
              <div key={region.region} className="flex items-center gap-3">
                <span className="w-5 text-[0.68rem] font-black text-white/20 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white/70">{region.flag} {region.region}</span>
                    <span className="text-xs font-bold text-white">{region.listings.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${region.pct}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.07] flex items-center justify-between">
            <span className="text-xs text-white/30">5 regions shown</span>
            <button className="flex items-center gap-1 text-xs text-[#c9a84c] hover:underline">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
