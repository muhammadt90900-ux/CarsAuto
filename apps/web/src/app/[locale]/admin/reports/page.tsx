'use client';
// apps/web/src/app/[locale]/admin/reports/page.tsx
// Admin: user-submitted reports — listings, dealers, users, messages, reviews.
// Maps directly onto the real Report model (Report.status is
// 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED'; targetType/targetId are
// polymorphic with no FK, enriched server-side by GET /admin/reports into `target`).

import { useState, useEffect, useCallback } from 'react';
import {
  Flag, Search, CheckCircle2, XCircle, Loader2,
  AlertTriangle, MessageSquare, Car, Store, ChevronLeft,
  ChevronRight, Clock, Star,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

// BUG FIX (Trust & Safety Prompt 7): this page's ReportType/ReportStatus
// were lowercase/incomplete and didn't match what the API actually sends —
// Prisma's ReportStatus enum is 'PENDING' | 'REVIEWING' | 'RESOLVED' |
// 'DISMISSED' (uppercase), and Report.targetType values are 'LISTING' |
// 'USER' | 'DEALER' | 'MESSAGE' | 'REVIEW' (uppercase — REVIEW added by
// Prompt 7). The lowercase values below never matched a real API response,
// so every status tab/badge/filter on this page was silently broken
// (always empty) before this fix — pre-existing, not introduced here.
type ReportType   = 'LISTING' | 'DEALER' | 'USER' | 'MESSAGE' | 'REVIEW';
type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

interface Report {
  id: string;
  targetType: ReportType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  reporter?: { id: string; name: string; email: string } | null;
  target?: {
    id: string;
    titleEn?: string;
    titleKu?: string;
    name?: string;
    email?: string;
    // REVIEW target preview shape — matches admin.service.ts's enrichment
    rating?: number;
    comment?: string;
    reviewer?: { id: string; name: string };
    reviewee?: { id: string; name: string };
  } | null;
}

const TYPE_STYLES: Record<ReportType, { label: string; icon: any; color: string }> = {
  LISTING: { label: 'Listing',  icon: Car,           color: '#3b82f6' },
  DEALER:  { label: 'Dealer',   icon: Store,         color: 'var(--gold)' },
  USER:    { label: 'User',     icon: AlertTriangle, color: '#f59e0b' },
  MESSAGE: { label: 'Message',  icon: MessageSquare, color: '#8b5cf6' },
  REVIEW:  { label: 'Review',   icon: Star,          color: '#ec4899' },
};

const STATUS_STYLES: Record<ReportStatus, { label: string; text: string; bg: string; dot: string }> = {
  PENDING:   { label: 'Pending',   text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
  REVIEWING: { label: 'Reviewing', text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
  RESOLVED:  { label: 'Resolved',  text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  DISMISSED: { label: 'Dismissed', text: 'text-white/30',    bg: 'bg-white/[0.05]',   dot: 'bg-white/20'    },
};

function targetLabel(report: Report): string {
  if (!report.target) return `#${report.targetId.slice(0, 8)}`;
  if (report.targetType === 'LISTING') return report.target.titleEn || report.target.titleKu || 'Untitled listing';
  if (report.targetType === 'REVIEW') {
    const stars = report.target.rating ? `${report.target.rating}★` : '';
    const who = report.target.reviewee?.name ?? '—';
    return `${stars} review of ${who}`.trim();
  }
  return report.target.name || report.target.email || `#${report.targetId.slice(0, 8)}`;
}

const PAGE_SIZE = 10;

export default function AdminReportsPage() {
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [reports, setReports]               = useState<Report[]>([]);
  const [total, setTotal]                   = useState(0);
  const [search, setSearch]                 = useState('');
  const [typeFilter, setTypeFilter]         = useState<ReportType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter]     = useState<ReportStatus | 'ALL'>('PENDING');
  const [page, setPage]                     = useState(1);
  const [detail, setDetail]                 = useState<Report | null>(null);
  const [acting, setActing]                 = useState<string | null>(null);
  // Separate from `error` above (which replaces the whole report list) —
  // a small, non-disruptive toast specifically for resolve/dismiss
  // action failures.
  const [actionError, setActionError]       = useState<string | null>(null);

  const fetchReports = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (typeFilter   !== 'ALL') params.set('targetType', typeFilter);

    api.get(`/admin/reports?${params.toString()}`)
      .then(r => {
        setReports(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Failed to load reports';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [page, typeFilter, statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { setPage(1); }, [typeFilter, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Client-side search over the current page (id, reason, reporter, target)
  const visibleReports = search.trim()
    ? reports.filter(r => {
        const q = search.trim().toLowerCase();
        return (
          r.id.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q) ||
          r.reporter?.name?.toLowerCase().includes(q) ||
          r.reporter?.email?.toLowerCase().includes(q) ||
          targetLabel(r).toLowerCase().includes(q)
        );
      })
    : reports;

  const resolve = async (id: string, action: 'RESOLVED' | 'DISMISSED') => {
    setActing(id);
    setActionError(null);
    try {
      await api.patch(`/admin/reports/${id}/resolve`, { action });
      fetchReports();
    } catch (err: any) {
      // BUG FIX: same class of bug as admin/moderation/page.tsx's act() —
      // this used to mark the report as resolved/dismissed in the catch
      // block, i.e. on failure it told the admin the action worked
      // anyway. Now shows a real error and leaves the report's displayed
      // status untouched.
      setActionError(err?.response?.data?.message ?? `Failed to update report — please try again.`);
    } finally {
      setActing(null);
      setDetail(null);
    }
  };

  const pendingCount   = statusFilter === 'PENDING'   ? total : reports.filter(r => r.status === 'PENDING').length;
  const resolvedCount  = statusFilter === 'RESOLVED'  ? total : reports.filter(r => r.status === 'RESOLVED').length;
  const dismissedCount = statusFilter === 'DISMISSED' ? total : reports.filter(r => r.status === 'DISMISSED').length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight">Reports</h1>
          <p className="text-white/40 text-sm mt-0.5">Review and action user-submitted reports</p>
        </div>
        {statusFilter === 'PENDING' && total > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-400/10 border border-red-400/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">{total} pending reports</span>
          </div>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400/60 hover:text-red-400 transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          ['ALL',       'All',       null],
          ['PENDING',   'Pending',   pendingCount],
          ['RESOLVED',  'Resolved',  resolvedCount],
          ['DISMISSED', 'Dismissed', dismissedCount],
        ] as [string, string, number | null][]).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val as any)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
              statusFilter === val
                ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700 border-transparent'
                : 'bg-ink-700 border-white/[0.07] text-white/50 hover:text-white/80',
            )}
          >
            {label}
            {count != null && count > 0 && (
              <span className={cn(
                'w-5 h-5 rounded-full text-[0.62rem] font-black flex items-center justify-center',
                statusFilter === val ? 'bg-ink-700 text-[var(--gold)]' : 'bg-white/[0.08] text-white/60',
              )}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter this page by reason, reporter, target…"
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-ink-700 border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07]">
          {(['ALL', 'LISTING', 'DEALER', 'USER', 'MESSAGE', 'REVIEW'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                typeFilter === t
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {t === 'ALL' ? 'All' : TYPE_STYLES[t as ReportType].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-white/40 text-sm">{error}</p>
          <button
            onClick={fetchReports}
            className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
          >
            Retry
          </button>
        </div>
      ) : visibleReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Flag className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No reports found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Target', 'Type', 'Reason', 'Status', 'Reporter', 'Age', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((report, i) => {
                const typeStyle   = TYPE_STYLES[report.targetType] ?? TYPE_STYLES.LISTING;
                const statusStyle = STATUS_STYLES[report.status]   ?? STATUS_STYLES.PENDING;
                const TypeIcon    = typeStyle.icon;
                const isActing    = acting === report.id;
                const isOpen      = report.status === 'PENDING';

                return (
                  <tr
                    key={report.id}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 transition-colors cursor-pointer',
                      i % 2 === 0 ? 'bg-ink-750' : 'bg-ink-700',
                      'hover:bg-[rgba(201,168,76,0.03)]',
                    )}
                    onClick={() => setDetail(report)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white max-w-[220px] truncate">{targetLabel(report)}</p>
                      <p className="text-[0.68rem] text-white/30">#{report.targetId.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold" style={{ color: typeStyle.color }}>
                        <TypeIcon className="w-3 h-3" />
                        {typeStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50 max-w-[200px] truncate">{report.reason}</td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{report.reporter?.name ?? report.reporter?.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-white/30">
                        <Clock className="w-3 h-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {isOpen && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => resolve(report.id, 'RESOLVED')}
                            disabled={isActing}
                            className="p-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20 transition-all disabled:opacity-40"
                            title="Resolve"
                          >
                            {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => resolve(report.id, 'DISMISSED')}
                            disabled={isActing}
                            className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/40 hover:text-white/70 transition-all disabled:opacity-40"
                            title="Dismiss"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">
              Page {page} of {totalPages || 1} — {total} total
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
                            page === pg ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700'
                                        : 'text-white/40 hover:text-white hover:bg-white/[0.08]')}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setDetail(null)}>
          <div className="w-full sm:w-[480px] h-[80vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-ink-700 border border-white/[0.12] overflow-auto"
               onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Report Details</h3>
                <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 space-y-3">
                {[
                  ['Report ID',   detail.id],
                  ['Target',      targetLabel(detail)],
                  ['Type',        TYPE_STYLES[detail.targetType]?.label ?? detail.targetType],
                  ['Reason',      detail.reason],
                  ['Reported by', detail.reporter?.name ?? detail.reporter?.email ?? '—'],
                ].map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-white/40 flex-shrink-0">{key}</span>
                    <span className="text-sm font-semibold text-white text-right truncate">{val}</span>
                  </div>
                ))}
              </div>

              {detail.status === 'PENDING' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => resolve(detail.id, 'RESOLVED')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-400/25 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolve
                  </button>
                  <button
                    onClick={() => resolve(detail.id, 'DISMISSED')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/50 text-sm font-semibold hover:bg-white/[0.08] transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
