'use client';
// apps/web/src/app/[locale]/admin/listings/page.tsx
// Admin: full listings management — search, filter by status, approve,
// reject, delete (fake/spam), and toggle featured. Backed by the real
// GET/PATCH/DELETE /admin/listings endpoints.

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Search, Car, CheckCircle2, XCircle, Trash2, Star, Loader2,
  AlertTriangle, ChevronLeft, ChevronRight, ImageOff,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

type ListingStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SOLD' | 'EXPIRED' | 'DRAFT' | 'UNDER_REVIEW';

interface ListingRow {
  id: string;
  titleEn?: string;
  titleKu?: string;
  titleAr?: string;
  status: ListingStatus;
  price: string | number;
  currency: string;
  featured: boolean;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  images?: { url?: string }[];
}

const STATUS_STYLES: Record<ListingStatus, { label: string; text: string; bg: string; dot: string }> = {
  ACTIVE:       { label: 'Active',       text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  PENDING:      { label: 'Pending',      text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  dot: 'bg-yellow-400'  },
  UNDER_REVIEW: { label: 'Flagged',      text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
  REJECTED:     { label: 'Rejected',     text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
  SOLD:         { label: 'Sold',         text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
  EXPIRED:      { label: 'Expired',      text: 'text-white/40',    bg: 'bg-white/[0.05]',   dot: 'bg-white/20'    },
  DRAFT:        { label: 'Draft',        text: 'text-white/30',    bg: 'bg-white/[0.04]',   dot: 'bg-white/15'    },
};

const STATUS_TABS: (ListingStatus | 'ALL')[] = ['ALL', 'PENDING', 'UNDER_REVIEW', 'ACTIVE', 'REJECTED', 'SOLD', 'EXPIRED'];

const PAGE_SIZE = 20;

export default function AdminListingsPage() {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [listings, setListings]     = useState<ListingRow[]>([]);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState<ListingStatus | 'ALL'>('ALL');
  const [page, setPage]             = useState(1);
  const [acting, setActing]         = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ListingRow | null>(null);
  // Approve/reject/toggleFeatured/delete below previously had no catch
  // block at all — a failed action silently did nothing, with zero
  // feedback to the admin about why. This surfaces real errors without
  // replacing the whole list (see `error` above, which does that for the
  // initial fetch).
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchListings = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search) params.set('search', search);

    api.get(`/admin/listings?${params.toString()}`)
      .then(r => {
        setListings(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? 'Failed to load listings');
      })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const approve = async (id: string) => {
    setActing(id);
    setActionError(null);
    try {
      await api.patch(`/admin/listings/${id}/approve`);
      fetchListings();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to approve listing — please try again.');
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: string) => {
    setActing(id);
    setActionError(null);
    try {
      await api.patch(`/admin/listings/${id}/reject`);
      fetchListings();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to reject listing — please try again.');
    } finally {
      setActing(null);
    }
  };

  const toggleFeatured = async (listing: ListingRow) => {
    setActing(listing.id);
    setActionError(null);
    try {
      await api.patch(`/admin/listings/${listing.id}/featured`, { featured: !listing.featured });
      fetchListings();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to update featured status — please try again.');
    } finally {
      setActing(null);
    }
  };

  const deleteListing = async () => {
    if (!confirmDelete) return;
    setActing(confirmDelete.id);
    setActionError(null);
    try {
      await api.delete(`/admin/listings/${confirmDelete.id}`);
      setConfirmDelete(null);
      fetchListings();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to delete listing — please try again.');
      setConfirmDelete(null);
    } finally {
      setActing(null);
    }
  };

  const fmtPrice = (p: string | number, currency: string) =>
    `${currency ?? 'USD'} ${new Intl.NumberFormat('en-US').format(Number(p))}`;

  const pendingCount = statusFilter === 'PENDING' ? total : listings.filter(l => l.status === 'PENDING').length;
  const flaggedCount = statusFilter === 'UNDER_REVIEW' ? total : listings.filter(l => l.status === 'UNDER_REVIEW').length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight">Listings</h1>
          <p className="text-white/40 text-sm mt-0.5">Approve, reject, feature, or remove marketplace listings</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
              <span className="text-xs font-semibold text-yellow-300">{pendingCount} pending</span>
            </div>
          )}
          {flaggedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-400/10 border border-red-400/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">{flaggedCount} flagged</span>
            </div>
          )}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07] overflow-x-auto">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                statusFilter === s ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e]'
                                   : 'text-white/40 hover:text-white/70')}
            >
              {s === 'ALL' ? 'All' : STATUS_STYLES[s as ListingStatus].label}
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
            onClick={fetchListings}
            className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
          >
            Retry
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Car className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No listings found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Listing', 'Seller', 'Price', 'Status', 'Featured', 'Listed', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listings.map((listing, i) => {
                const statusStyle = STATUS_STYLES[listing.status] ?? STATUS_STYLES.PENDING;
                const isActing    = acting === listing.id;
                const canApprove  = listing.status === 'PENDING' || listing.status === 'UNDER_REVIEW';
                const cover       = listing.images?.[0]?.url;

                return (
                  <tr
                    key={listing.id}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 transition-colors',
                      i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]',
                      'hover:bg-[rgba(201,168,76,0.03)]',
                    )}
                  >
                    {/* Listing */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.07] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {cover ? (
                            <Image src={cover} alt="" width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <ImageOff className="w-4 h-4 text-white/15" />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white max-w-[200px] truncate">
                          {listing.titleEn || listing.titleKu || listing.titleAr || `Listing ${listing.id.slice(0, 8)}`}
                        </p>
                      </div>
                    </td>

                    {/* Seller */}
                    <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                      {listing.user?.name ?? listing.user?.email ?? '—'}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-sm font-bold text-[var(--gold)] whitespace-nowrap">
                      {fmtPrice(listing.price, listing.currency)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>

                    {/* Featured toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleFeatured(listing)}
                        disabled={isActing}
                        className={cn(
                          'p-1.5 rounded-lg border transition-all disabled:opacity-40',
                          listing.featured
                            ? 'bg-[rgba(201,168,76,0.15)] border-[rgba(201,168,76,0.3)] text-[var(--gold)]'
                            : 'bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/60',
                        )}
                        title={listing.featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <Star className={cn('w-3.5 h-3.5', listing.featured && 'fill-[var(--gold)]')} />
                      </button>
                    </td>

                    {/* Listed date */}
                    <td className="px-4 py-3 text-xs text-white/30 whitespace-nowrap">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {canApprove && (
                          <>
                            <button
                              onClick={() => approve(listing.id)}
                              disabled={isActing}
                              className="p-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20 transition-all disabled:opacity-40"
                              title="Approve"
                            >
                              {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => reject(listing.id)}
                              disabled={isActing}
                              className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/40 hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-40"
                              title="Reject"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setConfirmDelete(listing)}
                          disabled={isActing}
                          className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/40 hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-40"
                          title="Delete listing"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">Page {page} of {totalPages || 1} — {total} total listings</p>
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
                            page === pg ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e]'
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

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1b2e] border border-white/[0.12] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-bold text-white">Delete Listing</p>
                <p className="text-sm text-white/40 max-w-[260px] truncate">
                  {confirmDelete.titleEn || confirmDelete.titleKu || confirmDelete.id}
                </p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              This permanently removes the listing and its images. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-sm font-semibold hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={deleteListing}
                disabled={acting === confirmDelete.id}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {acting === confirmDelete.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
