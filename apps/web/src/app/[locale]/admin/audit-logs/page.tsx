'use client';
// apps/web/src/app/[locale]/admin/audit-logs/page.tsx
// Admin: full audit trail of all admin and system actions

import { useState } from 'react';
import {
  Shield, Search, Download, ChevronLeft, ChevronRight,
  Filter, UserCheck, UserX, Car, Store, Settings,
  Trash2, Edit3, Eye, Key, Bell, DollarSign,
  AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';

type ActionCategory = 'USER' | 'LISTING' | 'DEALER' | 'SYSTEM' | 'AUTH' | 'PAYMENT';

interface AuditLog {
  id: string;
  action: string;
  category: ActionCategory;
  actor: string;
  actorRole: string;
  target: string;
  targetType: string;
  ip: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  details: string;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const ACTIONS = [
  { action: 'USER_BANNED',          category: 'USER',    severity: 'CRITICAL', icon: UserX,       color: '#ef4444', target: 'user:USR00124', details: 'Banned for repeated policy violations' },
  { action: 'LISTING_APPROVED',     category: 'LISTING', severity: 'INFO',     icon: CheckCircle2,color: '#22c55e', target: 'listing:L4521',  details: 'Listing manually approved after review' },
  { action: 'DEALER_VERIFIED',      category: 'DEALER',  severity: 'INFO',     icon: Store,       color: '#c9a84c', target: 'dealer:D0091',  details: 'Dealer tier set to GOLD' },
  { action: 'LISTING_REMOVED',      category: 'LISTING', severity: 'WARNING',  icon: Trash2,       color: '#f59e0b', target: 'listing:L3982',  details: 'Removed: fraudulent price detected' },
  { action: 'USER_ROLE_CHANGED',    category: 'USER',    severity: 'WARNING',  icon: Key,         color: '#8b5cf6', target: 'user:USR00087', details: 'Role changed USER→MODERATOR' },
  { action: 'SYSTEM_CONFIG_UPDATE', category: 'SYSTEM',  severity: 'CRITICAL', icon: Settings,    color: '#ef4444', target: 'config:smtp',   details: 'SMTP settings updated' },
  { action: 'DEALER_SUSPENDED',     category: 'DEALER',  severity: 'WARNING',  icon: Store,       color: '#f59e0b', target: 'dealer:D0043',  details: 'Suspended pending investigation' },
  { action: 'PAYMENT_REFUNDED',     category: 'PAYMENT', severity: 'INFO',     icon: DollarSign,  color: '#22c55e', target: 'payment:P9912', details: 'Full refund issued: $149.00' },
  { action: 'ADMIN_LOGIN',          category: 'AUTH',    severity: 'INFO',     icon: Shield,      color: '#3b82f6', target: 'session',       details: 'Successful admin login from 192.168.1.1' },
  { action: 'BULK_LISTINGS_DELETE', category: 'LISTING', severity: 'CRITICAL', icon: Trash2,       color: '#ef4444', target: 'listings:x12', details: '12 duplicate listings bulk-removed' },
] as const;

const LOGS: AuditLog[] = Array.from({ length: 45 }, (_, i) => {
  const action = ACTIONS[i % ACTIONS.length]!;
  const actors = ['Admin System', 'Sarah K. (Admin)', 'Omar M. (Admin)', 'System Auto', 'Moderator Hana'];
  const minutes = i * 23 + Math.floor(Math.random() * 20);
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return {
    id: `LOG${String(10000 + i).padStart(6, '0')}`,
    action: action.action,
    category: action.category as ActionCategory,
    actor: actors[i % actors.length] ?? 'System',
    actorRole: i % 5 === 0 ? 'SYSTEM' : i % 3 === 0 ? 'MODERATOR' : 'ADMIN',
    target: action.target,
    targetType: action.category,
    ip: `192.168.${Math.floor(i / 10)}.${(i * 7 + 12) % 255}`,
    severity: action.severity as AuditLog['severity'],
    timestamp: hrs > 0 ? `${hrs}h ${mins}m ago` : `${mins}m ago`,
    details: action.details,
  };
});

const CATEGORY_STYLES: Record<ActionCategory, { label: string; color: string; bg: string; icon: any }> = {
  USER:    { label: 'User',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: UserCheck   },
  LISTING: { label: 'Listing', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: Car         },
  DEALER:  { label: 'Dealer',  color: '#c9a84c', bg: 'rgba(201,168,76,0.12)',  icon: Store       },
  SYSTEM:  { label: 'System',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: Settings    },
  AUTH:    { label: 'Auth',    color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   icon: Key         },
  PAYMENT: { label: 'Payment', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: DollarSign  },
};

const SEVERITY_STYLES = {
  INFO:     { label: 'Info',     text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
  WARNING:  { label: 'Warning',  text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  dot: 'bg-yellow-400'  },
  CRITICAL: { label: 'Critical', text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
};

const PAGE_SIZE = 12;

export default function AdminAuditLogsPage() {
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState<ActionCategory | 'ALL'>('ALL');
  const [sevFilter, setSevFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'>('ALL');
  const [page, setPage]           = useState(1);
  const [detail, setDetail]       = useState<AuditLog | null>(null);

  const filtered = LOGS.filter(l => {
    const matchSearch = !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.actor.toLowerCase().includes(search.toLowerCase()) || l.target.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'ALL' || l.category === catFilter;
    const matchSev = sevFilter === 'ALL' || l.severity === sevFilter;
    return matchSearch && matchCat && matchSev;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const actionIcon = (action: string) => {
    const found = ACTIONS.find(a => a.action === action);
    return found ? found.icon : Eye;
  };
  const actionColor = (action: string) => {
    const found = ACTIONS.find(a => a.action === action);
    return found ? found.color : '#94a3b8';
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#c9a84c]" />
            Audit Logs
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Immutable record of all admin and system actions</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all">
          <Download className="w-3.5 h-3.5" />
          Export Logs
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critical Events', count: LOGS.filter(l => l.severity === 'CRITICAL').length, color: '#ef4444', icon: AlertTriangle },
          { label: 'Warning Events',  count: LOGS.filter(l => l.severity === 'WARNING').length,  color: '#f59e0b', icon: Bell          },
          { label: 'Total Events',    count: LOGS.length,                                         color: '#3b82f6', icon: Shield        },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${s.color}15`, border: `1px solid ${s.color}22` }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-white">{s.count}</p>
                <p className="text-[0.68rem] text-white/35">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search actions, actors, targets…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07]">
          {(['ALL', 'USER', 'LISTING', 'DEALER', 'SYSTEM', 'AUTH', 'PAYMENT'] as const).map(c => (
            <button
              key={c}
              onClick={() => { setCatFilter(c); setPage(1); }}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                catFilter === c ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                                : 'text-white/40 hover:text-white/70')}
            >
              {c === 'ALL' ? 'All' : CATEGORY_STYLES[c as ActionCategory].label}
            </button>
          ))}
        </div>
        <select
          value={sevFilter}
          onChange={e => { setSevFilter(e.target.value as any); setPage(1); }}
          className="px-3 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white/70 text-sm focus:outline-none focus:border-[#c9a84c]/40"
        >
          <option value="ALL">All Severities</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Log entries */}
      <div className="space-y-1">
        {paged.map((log) => {
          const catStyle  = CATEGORY_STYLES[log.category];
          const sevStyle  = SEVERITY_STYLES[log.severity];
          const ActionIcon = actionIcon(log.action) as any;
          const aColor    = actionColor(log.action);
          const CatIcon   = catStyle.icon as any;

          return (
            <div
              key={log.id}
              onClick={() => setDetail(log)}
              className={cn(
                'flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                log.severity === 'CRITICAL'
                  ? 'bg-red-950/20 border-red-400/15 hover:bg-red-950/30'
                  : log.severity === 'WARNING'
                  ? 'bg-yellow-950/20 border-yellow-400/10 hover:bg-yellow-950/30'
                  : 'bg-[#0a1525] border-white/[0.05] hover:bg-white/[0.03] hover:border-white/[0.09]',
              )}
            >
              {/* Severity indicator */}
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', sevStyle.dot)} />

              {/* Action icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: `${aColor}15` }}>
                <ActionIcon className="w-3.5 h-3.5" style={{ color: aColor }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-mono font-semibold text-white">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">{log.details}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[0.68rem] text-white/25 flex-shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {log.timestamp}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-[0.68rem] text-white/40">
                    <Shield className="w-2.5 h-2.5" />
                    {log.actor}
                  </span>
                  <span className="text-[0.68rem] text-white/25">→</span>
                  <span className="text-[0.68rem] font-mono text-white/40">{log.target}</span>
                  <span className="text-[0.68rem] text-white/20">{log.ip}</span>

                  {/* Category badge */}
                  <span className="ml-auto flex items-center gap-1 text-[0.62rem] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: catStyle.bg, color: catStyle.color }}>
                    <CatIcon className="w-2.5 h-2.5" />
                    {catStyle.label}
                  </span>
                  <span className={cn('flex items-center gap-1 text-[0.62rem] font-bold px-1.5 py-0.5 rounded-md', sevStyle.bg, sevStyle.text)}>
                    {sevStyle.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-white/30">
          Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pg = page <= 3 ? i + 1 : page + i - 2;
            if (pg < 1 || pg > totalPages) return null;
            return (
              <button key={pg} onClick={() => setPage(pg)}
                      className={cn('w-7 h-7 rounded-lg text-xs font-semibold transition-all',
                        page === pg ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                                    : 'text-white/40 hover:text-white hover:bg-white/[0.08]')}>
                {pg}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setDetail(null)}>
          <div className="w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl bg-[#0d1b2e] border border-white/[0.12] overflow-auto max-h-[80vh]"
               onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Event Details</h3>
                <span className="font-mono text-[0.68rem] text-white/30">{detail.id}</span>
              </div>
              {[
                ['Action',    detail.action.replace(/_/g, ' ')],
                ['Category',  detail.category],
                ['Severity',  detail.severity],
                ['Actor',     `${detail.actor} (${detail.actorRole})`],
                ['Target',    detail.target],
                ['IP Address',detail.ip],
                ['Timestamp', detail.timestamp],
              ].map(([key, val]) => (
                <div key={key} className="flex items-start justify-between gap-4 py-2 border-b border-white/[0.05] last:border-0">
                  <span className="text-xs text-white/35 flex-shrink-0">{key}</span>
                  <span className="text-xs font-medium text-white text-right">{val}</span>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-xs text-white/35 mb-1.5">Details</p>
                <p className="text-sm text-white/70">{detail.details}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
