'use client';
// apps/web/src/app/[locale]/admin/moderation/page.tsx
// Admin: listing moderation queue — pending approvals + spam-quarantined
// listings (ListingStatus.UNDER_REVIEW, set automatically by content
// moderation in listings.service.ts). Backed by real /admin/listings.

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, CheckCircle2, XCircle, Search,
  AlertTriangle, Car, ChevronLeft, ChevronRight, Loader2, RefreshCw, Zap,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

type ListingStatus = 'PENDING' | 'UNDER_REVIEW' | 'ACTIVE' | 'REJECTED';

interface ListingRow {
  id: string;
  titleEn?: string;
  titleKu?: string;
  status: ListingStatus;
  price: string | number;
  currency: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  images?: { url?: string }[];
}

const STATUS_STYLES: Record<ListingStatus, { label: string; text: string; bg: string; dot: string }> = {
  PENDING:      { label: 'Pending',       text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  dot: 'bg-yellow-400'  },
  UNDER_REVIEW: { label: 'Flagged (auto)', text: 'text-red-400',    bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
  ACTIVE:       { label: 'Approved',      text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  REJECTED:     { label: 'Rejected',      text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
};

const PAGE_SIZE = 10;

export default function AdminModerationPage() {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [items, setItems]           = useState<ListingRow[]>([]);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState<ListingStatus | 'ALL'>('PENDING');
  const [page, setPage]             = useState(1);
  const [acting, setActing]         = useState<string | null>(null);
  const [preview, setPreview]       = useState<ListingRow | null>(null);
  // Separate from `error` above (which replaces the whole queue view) —
  // this is a small, non-disruptive toast specifically for action
  // (approve/reject) failures, so a failed action doesn't hide the list
  // the admin was just looking at.
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchQueue = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search) params.set('search', search);

    api.get(`/admin/listings?${params.toString()}`)
      .then(r => {
        setItems(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Failed to load moderation queue';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setActing(id);
    setActionError(null);
    try {
      await api.patch(`/admin/listings/${id}/${action}`);
      fetchQueue();
    } catch (err: any) {
      // BUG FIX: this used to optimistically set the item's status to
      // ACTIVE/REJECTED *in the catch block* — i.e. on failure, it told
      // the admin the action succeeded anyway, with the real backend
      // state never actually changing. An admin could believe they'd
      // approved or rejected a listing when nothing happened. Now shows
      // a real error and leaves the item's displayed status untouched.
      setActionError(err?.response?.data?.message ?? `Failed to ${action} listing — please try again.`);
    } finally {
      setActing(null);
      setPreview(null);
    }
  };

  const flaggedCount = statusFilter === 'UNDER_REVIEW'
    ? total
    : items.filter(i => i.status === 'UNDER_REVIEW').length;

  const fmtPrice = (p: string | number, currency: string) =>
    `${currency ?? 'USD'} ${new Intl.NumberFormat('en-US').format(Number(p))}`;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[var(--gold)]" />
            Moderation
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Review pending and auto-flagged listings before they go live</p>
        </div>
        <div className="flex items-center gap-3">
          {flaggedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-400/10 border border-red-400/20">
              <Zap className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">{flaggedCount} auto-flagged</span>
            </div>
          )}
          <button
            onClick={fetchQueue}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-ink-700 border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07]">
          {(['ALL', 'PENDING', 'UNDER_REVIEW', 'ACTIVE', 'REJECTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                statusFilter === s ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700'
                                   : 'text-white/40 hover:text-white/70')}
            >
              {s === 'ALL' ? 'All' : STATUS_STYLES[s as ListingStatus].label}
            </button>
          ))}
        </div>
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
                {['Listing', 'Seller', 'Price', 'Status', 'Submitted', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.PENDING;
                const isActing    = acting === item.id;
                const isFlagged   = item.status === 'UNDER_REVIEW';
                const canAct      = item.status === 'PENDING' || item.status === 'UNDER_REVIEW';

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 transition-colors',
                      isFlagged ? 'bg-red-950/10' : i % 2 === 0 ? 'bg-ink-750' : 'bg-ink-700',
                      'hover:bg-[rgba(201,168,76,0.03)] cursor-pointer',
                    )}
                    onClick={() => setPreview(item)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {isFlagged && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />}
                        <Car className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                        <p className="text-sm font-semibold text-white max-w-[220px] truncate">
                          {item.titleEn || item.titleKu || `Listing ${item.id.slice(0, 8)}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{item.user?.name ?? item.user?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[var(--gold)]">{fmtPrice(item.price, item.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30 whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {canAct && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => act(item.id, 'approve')}
                            disabled={isActing}
                            className="p-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20 transition-all disabled:opacity-40"
                            title="Approve"
                          >
                            {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">Page {page} of {totalPages || 1} — {total} total</p>
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

      {/* Preview drawer */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setPreview(null)}>
          <div className="w-full sm:w-[480px] h-[80vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-ink-700 border border-white/[0.12] overflow-auto"
               onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Listing Preview</h3>
                <button onClick={() => setPreview(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 space-y-3">
                {[
                  ['Title',  preview.titleEn || preview.titleKu],
                  ['Price',  fmtPrice(preview.price, preview.currency)],
                  ['Seller', preview.user?.name ?? preview.user?.email ?? '—'],
                  ['Status', STATUS_STYLES[preview.status]?.label ?? preview.status],
                ].map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-white/40 flex-shrink-0">{key}</span>
                    <span className="text-sm font-semibold text-white text-right truncate">{val}</span>
                  </div>
                ))}
              </div>

              {(preview.status === 'PENDING' || preview.status === 'UNDER_REVIEW') && (
                <div className="flex gap-3">
                  <button
                    onClick={() => act(preview.id, 'approve')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-400/25 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => act(preview.id, 'reject')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-400/15 border border-red-400/25 text-red-400 text-sm font-semibold hover:bg-red-400/25 transition-all"
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
