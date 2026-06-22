'use client';
// app/[locale]/admin/audit-logs/page.tsx
// Fetches real audit-log rows from GET /admin/audit-logs (paginated).
// Zero mock data — shows clean empty state when the log is empty.

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Shield, Search, Download, ChevronLeft, ChevronRight,
  Filter, UserCheck, UserX, Car, Store, Settings,
  Trash2, Edit3, Eye, Key, Bell, DollarSign,
  AlertTriangle, CheckCircle2, Clock, RefreshCw,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';

type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

const SEVERITY_CONFIG: Record<Severity, { label: string; dot: string; text: string; bg: string }> = {
  INFO:     { label: 'Info',     dot: 'bg-blue-400',   text: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  WARNING:  { label: 'Warning',  dot: 'bg-amber-400',  text: 'text-amber-400',  bg: 'bg-amber-400/10'  },
  CRITICAL: { label: 'Critical', dot: 'bg-red-500',    text: 'text-red-400',    bg: 'bg-red-500/10'    },
};

// Icon lookup for known action types
const ACTION_ICONS: Record<string, React.ElementType> = {
  USER_BANNED:          UserX,
  USER_VERIFIED:        UserCheck,
  USER_ROLE_CHANGED:    Key,
  LISTING_APPROVED:     CheckCircle2,
  LISTING_REMOVED:      Trash2,
  LISTING_UPDATED:      Edit3,
  LISTING_VIEWED:       Eye,
  DEALER_VERIFIED:      Store,
  DEALER_SUSPENDED:     Store,
  SYSTEM_CONFIG_UPDATE: Settings,
  PAYMENT_REFUNDED:     DollarSign,
  ADMIN_LOGIN:          Shield,
  BULK_LISTINGS_DELETE: Trash2,
};

function ActionIcon({ action }: { action: string }) {
  const Icon = ACTION_ICONS[action] ?? AlertTriangle;
  return <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />;
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Shield className="w-7 h-7 text-white/20" />
      </div>
      <p className="text-sm font-semibold text-white/40 mb-1">No audit events yet</p>
      <p className="text-xs text-white/20 mb-5 max-w-xs">
        Admin and system actions will appear here as they happen.
      </p>
      <button
        onClick={onRefresh}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                   border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Check again
      </button>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const [search,   setSearch]   = useState('');
  const [severity, setSeverity] = useState<Severity | 'ALL'>('ALL');
  const [action,   setAction]   = useState('');
  const [page,     setPage]     = useState(1);

  const queryParams = new URLSearchParams({
    page:  String(page),
    limit: String(PAGE_SIZE),
    ...(severity !== 'ALL' && { severity }),
    ...(action && { action }),
  }).toString();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', page, severity, action],
    queryFn:  () => api.get(`/admin/audit-logs?${queryParams}`).then(r => r.data),
    staleTime: 15_000,
  });

  const logs: any[]  = data?.data  ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;

  // Client-side search filter (for quick UX without extra API round-trips)
  const filtered = search
    ? logs.filter(l =>
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.actor?.toLowerCase().includes(search.toLowerCase()) ||
        l.target?.toLowerCase().includes(search.toLowerCase()) ||
        l.details?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const exportCsv = () => {
    const rows = [
      ['ID','Action','Actor','Target','Severity','IP','Timestamp','Details'],
      ...filtered.map(l => [
        l.id, l.action, l.actor, l.target ?? '',
        l.severity, l.ip ?? '', l.createdAt ?? '', l.details ?? '',
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-5 lg:p-7 space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#c9a84c]" />
            Audit Logs
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} total events`}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!filtered.length}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                     border border-white/10 text-white/50 hover:text-white hover:border-white/20
                     disabled:opacity-30 transition-all"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action, actor, target…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07]
                       text-white text-sm placeholder:text-white/25 focus:outline-none
                       focus:border-[#c9a84c]/40 transition-colors"
          />
        </div>

        {/* Severity */}
        <select
          value={severity}
          onChange={e => { setSeverity(e.target.value as any); setPage(1); }}
          className="h-10 px-3 rounded-xl bg-[#0d1b2e] border border-white/[0.07]
                     text-white text-sm focus:outline-none focus:border-[#c9a84c]/40"
        >
          <option value="ALL">All Severities</option>
          {(Object.keys(SEVERITY_CONFIG) as Severity[]).map(s => (
            <option key={s} value={s}>{SEVERITY_CONFIG[s].label}</option>
          ))}
        </select>

        <button
          onClick={() => refetch()}
          className="h-10 w-10 rounded-xl bg-[#0d1b2e] border border-white/[0.07]
                     text-white/40 hover:text-white hover:border-white/20 transition-all
                     flex items-center justify-center"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#080f1c] overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({length: 8}).map((_,i) => (
              <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-10 text-center text-red-400 text-sm">
            Failed to load audit logs.{' '}
            <button onClick={() => refetch()} className="underline">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onRefresh={refetch} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Severity','Action','Actor','Target','IP','Time','Details'].map(h => (
                    <th key={h}
                        className="px-4 py-3 text-start text-[10px] font-bold uppercase
                                   tracking-widest text-white/25">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((log: any) => {
                  const sev = SEVERITY_CONFIG[log.severity as Severity] ?? SEVERITY_CONFIG.INFO;
                  const ts  = log.createdAt
                    ? new Date(log.createdAt).toLocaleString('en-GB', {
                        day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit',
                      })
                    : '—';
                  return (
                    <tr key={log.id}
                        className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full',
                          sev.text, sev.bg,
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', sev.dot)} />
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-white/70 font-mono text-xs">
                          <ActionIcon action={log.action ?? ''} />
                          {log.action ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        <div>{log.actor ?? '—'}</div>
                        {log.actorRole && (
                          <div className="text-white/30 text-[10px]">{log.actorRole}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs font-mono">{log.target ?? '—'}</td>
                      <td className="px-4 py-3 text-white/30 text-xs font-mono">{log.ip ?? '—'}</td>
                      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{ts}</td>
                      <td className="px-4 py-3 text-white/40 text-xs max-w-[220px] truncate"
                          title={log.details ?? ''}>
                        {log.details ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">
              Page {page} of {pages} · {total.toLocaleString()} events
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                           border border-white/10 text-white/40 hover:text-white
                           disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                           border border-white/10 text-white/40 hover:text-white
                           disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
