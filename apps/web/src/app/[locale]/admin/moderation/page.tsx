'use client';
// apps/web/src/app/[locale]/admin/moderation/page.tsx
// Admin: moderation queue — listings, images, text, AI-assisted flagging

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Eye, CheckCircle2, XCircle, Clock, Search,
  AlertTriangle, Image as ImageIcon, Type, Car, Zap, MoreVertical,
  ChevronLeft, ChevronRight, Loader2, Flag, RefreshCw,
} from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';
import { api } from '@/lib/api';

type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ModerationReason = 'AI_FLAG' | 'USER_REPORT' | 'MANUAL_QUEUE' | 'PRICE_ANOMALY';
type ContentType      = 'LISTING' | 'IMAGE' | 'TEXT' | 'PROFILE';

interface ModerationItem {
  id:            string;
  type:          ContentType;
  reason:        ModerationReason;
  status:        ModerationStatus;
  title:         string;
  submittedBy:   string;
  submittedAt:   string;
  aiScore:       number; // 0–100, higher = more likely problematic
  flags:         string[];
  imageUrl?:     string;
}

const TYPE_STYLES: Record<ContentType, { label: string; icon: any; color: string }> = {
  LISTING: { label: 'Listing', icon: Car,       color: '#3b82f6' },
  IMAGE:   { label: 'Image',   icon: ImageIcon, color: '#8b5cf6' },
  TEXT:    { label: 'Text',    icon: Type,      color: '#22c55e' },
  PROFILE: { label: 'Profile', icon: Eye,       color: '#c9a84c' },
};

const REASON_STYLES: Record<ModerationReason, { label: string; icon: any; color: string }> = {
  AI_FLAG:       { label: 'AI Flagged',    icon: Zap,           color: '#8b5cf6' },
  USER_REPORT:   { label: 'User Report',   icon: Flag,          color: '#f43f5e' },
  MANUAL_QUEUE:  { label: 'Manual Queue',  icon: Clock,         color: '#f59e0b' },
  PRICE_ANOMALY: { label: 'Price Anomaly', icon: AlertTriangle, color: '#f97316' },
};

const STATUS_STYLES: Record<ModerationStatus, { label: string; text: string; bg: string; dot: string }> = {
  PENDING:  { label: 'Pending',  text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  dot: 'bg-yellow-400'  },
  APPROVED: { label: 'Approved', text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  REJECTED: { label: 'Rejected', text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
};

function AiScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 w-16 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[0.68rem] font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function AdminModerationPage() {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [items, setItems]             = useState<ModerationItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState<ModerationStatus | 'ALL'>('PENDING');
  const [typeFilter, setType]         = useState<ContentType | 'ALL'>('ALL');
  const [page, setPage]               = useState(1);
  const [acting, setActing]           = useState<string | null>(null);
  const [preview, setPreview]         = useState<ModerationItem | null>(null);

  const fetchQueue = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    // Default to PENDING unless overridden
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (typeFilter   !== 'ALL') params.set('type',   typeFilter);
    if (search) params.set('search', search);

    api.get(`/admin/moderation?${params.toString()}`)
      .then(r => {
        setItems(r.data.data  ?? r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Failed to load moderation queue';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);
  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setActing(id);
    try {
      await api.patch(`/admin/moderation/${id}/${action}`);
      fetchQueue();
    } catch {
      // Optimistic update
      setItems(prev => prev.map(item =>
        item.id === id
          ? { ...item, status: action === 'approve' ? 'APPROVED' : 'REJECTED' }
          : item
      ));
    } finally {
      setActing(null);
      setPreview(null);
    }
  };

  const pendingCount  = items.filter(i => i.status === 'PENDING').length;
  const highRiskCount = items.filter(i => i.aiScore >= 75 && i.status === 'PENDING').length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#c9a84c]" />
            Moderation
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Review flagged listings, images, and content</p>
        </div>
        <div className="flex items-center gap-3">
          {highRiskCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-400/10 border border-red-400/20">
              <Zap className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">{highRiskCount} high-risk</span>
            </div>
          )}
          <button
            onClick={fetchQueue}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Review', value: total,                                          color: '#f59e0b', icon: Clock        },
          { label: 'High Risk (AI)', value: highRiskCount,                                  color: '#ef4444', icon: Zap          },
          { label: 'Approved',       value: items.filter(i => i.status === 'APPROVED').length, color: '#22c55e', icon: CheckCircle2 },
          { label: 'Rejected',       value: items.filter(i => i.status === 'REJECTED').length, color: '#8b5cf6', icon: XCircle      },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${s.color}15`, border: `1px solid ${s.color}22` }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-white">{s.value}</p>
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
            onChange={e => setSearch(e.target.value)}
            placeholder="Search moderation queue…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07]">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                statusFilter === s ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                                   : 'text-white/40 hover:text-white/70')}
            >
              {s === 'ALL' ? 'All' : STATUS_STYLES[s as ModerationStatus].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07]">
          {(['ALL', 'LISTING', 'IMAGE', 'TEXT', 'PROFILE'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                typeFilter === t ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                                 : 'text-white/40 hover:text-white/70')}
            >
              {t === 'ALL' ? 'All' : TYPE_STYLES[t as ContentType].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-white/40 text-sm">{error}</p>
          <button
            onClick={fetchQueue}
            className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ShieldCheck className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">Queue is empty</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Content', 'Type', 'Reason', 'AI Risk Score', 'Flags', 'Status', 'Submitted', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const typeStyle   = TYPE_STYLES[item.type]   ?? TYPE_STYLES.LISTING;
                const reasonStyle = REASON_STYLES[item.reason] ?? REASON_STYLES.MANUAL_QUEUE;
                const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.PENDING;
                const TypeIcon    = typeStyle.icon as any;
                const ReasonIcon  = reasonStyle.icon as any;
                const isActing    = acting === item.id;

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 transition-colors',
                      item.aiScore >= 75 && item.status === 'PENDING' ? 'bg-red-950/10' : i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]',
                      'hover:bg-[#c9a84c]/[0.03] cursor-pointer',
                    )}
                    onClick={() => setPreview(item)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.aiScore >= 75 && item.status === 'PENDING' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
                        )}
                        <p className="text-sm font-semibold text-white max-w-[220px] truncate">{item.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold" style={{ color: typeStyle.color }}>
                        <TypeIcon className="w-3 h-3" />
                        {typeStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold" style={{ color: reasonStyle.color }}>
                        <ReasonIcon className="w-3 h-3" />
                        {reasonStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3"><AiScoreBadge score={item.aiScore ?? 0} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(item.flags ?? []).slice(0, 2).map(f => (
                          <span key={f} className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/40 border border-white/[0.06]">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{item.submittedAt}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {item.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => act(item.id, 'approve')}
                            disabled={isActing}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[0.68rem] font-semibold hover:bg-emerald-400/20 transition-all disabled:opacity-40"
                          >
                            {isActing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => act(item.id, 'reject')}
                            disabled={isActing}
                            className="p-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 hover:bg-red-400/20 transition-all disabled:opacity-40"
                            title="Reject"
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

          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">
              Page {page} of {totalPages || 1} — {total} total items
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
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview detail */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setPreview(null)}>
          <div className="w-full sm:w-[460px] rounded-t-2xl sm:rounded-2xl bg-[#0d1b2e] border border-white/[0.12] overflow-auto max-h-[80vh]"
               onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Moderation Review</h3>
                <span className="font-mono text-[0.68rem] text-white/30">{preview.id}</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.07] space-y-3">
                <p className="font-semibold text-white">{preview.title}</p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: TYPE_STYLES[preview.type]?.color }}>
                    {preview.type}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: REASON_STYLES[preview.reason]?.color }}>
                    {REASON_STYLES[preview.reason]?.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">AI Risk Score</span>
                  <AiScoreBadge score={preview.aiScore ?? 0} />
                </div>
              </div>
              {(preview.flags ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.flags.map(f => (
                      <span key={f} className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 border border-red-400/15 text-red-400">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {preview.status === 'PENDING' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => act(preview.id, 'approve')}
                    disabled={!!acting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-400/25 transition-all disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => act(preview.id, 'reject')}
                    disabled={!!acting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-400/15 border border-red-400/25 text-red-400 text-sm font-semibold hover:bg-red-400/25 transition-all disabled:opacity-40"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
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
