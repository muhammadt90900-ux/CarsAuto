'use client';
// apps/web/src/app/[locale]/admin/reports/page.tsx
// Admin: user-submitted reports — listings, dealers, and content flags

import { useState } from 'react';
import {
  Flag, Search, Eye, CheckCircle2, XCircle, Loader2,
  AlertTriangle, MessageSquare, Car, Store, ChevronLeft,
  ChevronRight, Clock, ExternalLink,
} from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';

type ReportType   = 'LISTING' | 'DEALER' | 'USER' | 'MESSAGE';
type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
type ReportReason = 'FRAUD' | 'SPAM' | 'INAPPROPRIATE' | 'MISPRICED' | 'DUPLICATE' | 'OTHER';

interface Report {
  id: string;
  type: ReportType;
  reason: ReportReason;
  status: ReportStatus;
  targetTitle: string;
  targetId: string;
  reportedBy: string;
  description: string;
  createdAt: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const REPORTS: Report[] = Array.from({ length: 28 }, (_, i) => ({
  id:  `RPT${String(1000 + i).padStart(5, '0')}`,
  type: (['LISTING', 'DEALER', 'USER', 'MESSAGE'] as ReportType[])[i % 4],
  reason: (['FRAUD', 'SPAM', 'INAPPROPRIATE', 'MISPRICED', 'DUPLICATE', 'OTHER'] as ReportReason[])[i % 6],
  status: (['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as ReportStatus[])[i % 4],
  targetTitle: ['Toyota Land Cruiser 2023','BMW X5 Elite','AutoCity Dealer','John D.','Spam Message',
                'Lexus LX570','Premium Cars Ltd','Fake Listing','Test User','Duplicate Ad'][i % 10],
  targetId: `TGT${i}`,
  reportedBy: ['Ahmad K.','Sara M.','Omar F.','Layla T.','Hassan R.'][i % 5],
  description: 'The listing price seems fraudulent and does not match the actual vehicle condition described. Multiple users have flagged this listing.',
  createdAt: `${Math.floor(i / 4) + 1}d ago`,
  priority: (['HIGH', 'MEDIUM', 'LOW'] as const)[i % 3],
}));

const TYPE_STYLES: Record<ReportType, { label: string; icon: any; color: string }> = {
  LISTING: { label: 'Listing',  icon: Car,            color: '#3b82f6' },
  DEALER:  { label: 'Dealer',   icon: Store,          color: '#c9a84c' },
  USER:    { label: 'User',     icon: AlertTriangle,  color: '#f59e0b' },
  MESSAGE: { label: 'Message',  icon: MessageSquare,  color: '#8b5cf6' },
};

const STATUS_STYLES: Record<ReportStatus, { label: string; text: string; bg: string; dot: string }> = {
  OPEN:         { label: 'Open',         text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
  UNDER_REVIEW: { label: 'Under Review', text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  dot: 'bg-yellow-400'  },
  RESOLVED:     { label: 'Resolved',     text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  DISMISSED:    { label: 'Dismissed',    text: 'text-white/30',    bg: 'bg-white/[0.05]',   dot: 'bg-white/20'    },
};

const PRIORITY_STYLES: Record<string, { text: string; bg: string }> = {
  HIGH:   { text: 'text-red-400',     bg: 'bg-red-400/10'     },
  MEDIUM: { text: 'text-yellow-400',  bg: 'bg-yellow-400/10'  },
  LOW:    { text: 'text-white/40',    bg: 'bg-white/[0.04]'   },
};

const PAGE_SIZE = 10;

export default function AdminReportsPage() {
  const [reports, setReports]   = useState<Report[]>(REPORTS);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter]     = useState<ReportType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('OPEN');
  const [page, setPage]                 = useState(1);
  const [detail, setDetail]             = useState<Report | null>(null);
  const [acting, setActing]             = useState<string | null>(null);

  const filtered = reports.filter(r => {
    const matchSearch = !search || r.targetTitle.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === 'ALL' || r.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resolve = async (id: string, action: 'resolve' | 'dismiss' | 'review') => {
    setActing(id);
    await new Promise(r => setTimeout(r, 600));
    setReports(prev => prev.map(r =>
      r.id === id
        ? { ...r, status: action === 'resolve' ? 'RESOLVED' : action === 'dismiss' ? 'DISMISSED' : 'UNDER_REVIEW' }
        : r
    ));
    setActing(null);
    setDetail(null);
  };

  const counts = {
    OPEN:         reports.filter(r => r.status === 'OPEN').length,
    UNDER_REVIEW: reports.filter(r => r.status === 'UNDER_REVIEW').length,
    RESOLVED:     reports.filter(r => r.status === 'RESOLVED').length,
    DISMISSED:    reports.filter(r => r.status === 'DISMISSED').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight">Reports</h1>
          <p className="text-white/40 text-sm mt-0.5">Review and action user-submitted reports</p>
        </div>
        {counts.OPEN > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-400/10 border border-red-400/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">{counts.OPEN} open reports</span>
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {([['ALL', 'All', null], ['OPEN', 'Open', counts.OPEN], ['UNDER_REVIEW', 'In Review', counts.UNDER_REVIEW], ['RESOLVED', 'Resolved', counts.RESOLVED], ['DISMISSED', 'Dismissed', counts.DISMISSED]] as [string, string, number | null][]).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => { setStatusFilter(val as any); setPage(1); }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
              statusFilter === val
                ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] border-transparent'
                : 'bg-[#0d1b2e] border-white/[0.07] text-white/50 hover:text-white/80',
            )}
          >
            {label}
            {count != null && count > 0 && (
              <span className={cn(
                'w-5 h-5 rounded-full text-[0.62rem] font-black flex items-center justify-center',
                statusFilter === val ? 'bg-[#0d1b2e] text-[#c9a84c]' : 'bg-white/[0.08] text-white/60',
              )}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by report ID or target…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07]">
          {(['ALL', 'LISTING', 'DEALER', 'USER', 'MESSAGE'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                typeFilter === t
                  ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {t === 'ALL' ? 'All' : TYPE_STYLES[t as ReportType].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              {['ID', 'Target', 'Type', 'Reason', 'Priority', 'Status', 'Reporter', 'Age', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((report, i) => {
              const typeStyle   = TYPE_STYLES[report.type];
              const statusStyle = STATUS_STYLES[report.status];
              const priorityStyle = PRIORITY_STYLES[report.priority];
              const TypeIcon = typeStyle.icon;
              const isActing = acting === report.id;

              return (
                <tr
                  key={report.id}
                  className={cn(
                    'border-b border-white/[0.05] last:border-0 transition-colors cursor-pointer',
                    i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]',
                    'hover:bg-[#c9a84c]/[0.03]',
                  )}
                  onClick={() => setDetail(report)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-white/30">{report.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-white">{report.targetTitle}</p>
                    <p className="text-[0.68rem] text-white/30">#{report.targetId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold" style={{ color: typeStyle.color }}>
                      <TypeIcon className="w-3 h-3" />
                      {typeStyle.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50 capitalize">{report.reason.toLowerCase()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[0.68rem] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider', priorityStyle.bg, priorityStyle.text)}>
                      {report.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">{report.reportedBy}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-white/30">
                      <Clock className="w-3 h-3" />
                      {report.createdAt}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {report.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => resolve(report.id, 'review')}
                            disabled={isActing}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[0.68rem] font-semibold hover:bg-yellow-400/20 transition-all disabled:opacity-40"
                          >
                            {isActing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Eye className="w-2.5 h-2.5" />}
                            Review
                          </button>
                        </>
                      )}
                      {(report.status === 'OPEN' || report.status === 'UNDER_REVIEW') && (
                        <>
                          <button
                            onClick={() => resolve(report.id, 'resolve')}
                            disabled={isActing}
                            className="p-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20 transition-all disabled:opacity-40"
                            title="Resolve"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => resolve(report.id, 'dismiss')}
                            disabled={isActing}
                            className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/40 hover:text-white/70 transition-all disabled:opacity-40"
                            title="Dismiss"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
          <p className="text-xs text-white/30">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setDetail(null)}>
          <div className="w-full sm:w-[480px] h-[80vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-[#0d1b2e] border border-white/[0.12] overflow-auto"
               onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Report Details</h3>
                <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Report ID</span>
                  <span className="font-mono text-xs text-white">{detail.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Target</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    {detail.targetTitle}
                    <ExternalLink className="w-3 h-3 text-white/30" />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Reason</span>
                  <span className="text-sm text-white capitalize">{detail.reason.toLowerCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Priority</span>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md uppercase', PRIORITY_STYLES[detail.priority].bg, PRIORITY_STYLES[detail.priority].text)}>
                    {detail.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Reported by</span>
                  <span className="text-sm text-white">{detail.reportedBy}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-white/40 mb-2">Description</p>
                <p className="text-sm text-white/70 leading-relaxed">{detail.description}</p>
              </div>

              {(detail.status === 'OPEN' || detail.status === 'UNDER_REVIEW') && (
                <div className="flex gap-3">
                  <button
                    onClick={() => resolve(detail.id, 'resolve')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-400/25 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolve
                  </button>
                  <button
                    onClick={() => resolve(detail.id, 'dismiss')}
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
