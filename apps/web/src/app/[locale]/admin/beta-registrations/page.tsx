'use client';
// apps/web/src/app/[locale]/admin/beta-registrations/page.tsx
// Admin: "Coming Soon / Join Beta" dealer lead registrations. Mirrors the
// structure of admin/reports/page.tsx (status tabs, filter row, table,
// detail drawer, pagination) for a consistent admin experience.

import { useState, useEffect, useCallback } from 'react';
import {
  Rocket, Search, CheckCircle2, XCircle, Loader2, PhoneCall,
  AlertTriangle, ChevronLeft, ChevronRight, Clock, Star, Copy, Check,
  Car, Bike, Wrench, PackageSearch, Sparkles,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';
import type { BetaRegistration, BetaRegistrationStatus } from '@cars-auto/types';

type BusinessTypeFilter = 'ALL' | 'CAR' | 'MOTORCYCLE' | 'SPARE_PART' | 'ACCESSORY' | 'SERVICE';

const TYPE_STYLES: Record<Exclude<BusinessTypeFilter, 'ALL'>, { label: string; icon: any }> = {
  CAR:         { label: 'Cars',         icon: Car },
  MOTORCYCLE:  { label: 'Motorcycles',  icon: Bike },
  SPARE_PART:  { label: 'Spare Parts',  icon: Wrench },
  ACCESSORY:   { label: 'Accessories',  icon: PackageSearch },
  SERVICE:     { label: 'Services',     icon: Sparkles },
};

const STATUS_STYLES: Record<BetaRegistrationStatus, { label: string; text: string; bg: string; dot: string }> = {
  PENDING:   { label: 'Pending',   text: 'text-amber-400',   bg: 'bg-amber-400/10',   dot: 'bg-amber-400'   },
  CONTACTED: { label: 'Contacted', text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
  APPROVED:  { label: 'Approved',  text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  REJECTED:  { label: 'Rejected', text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
};

const STATUS_ORDER: BetaRegistrationStatus[] = ['PENDING', 'CONTACTED', 'APPROVED', 'REJECTED'];
const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

export default function AdminBetaRegistrationsPage() {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<BetaRegistration[]>([]);
  const [total, setTotal]               = useState(0);
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState<BusinessTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<BetaRegistrationStatus | 'ALL'>('PENDING');
  const [page, setPage]                 = useState(1);
  const [detail, setDetail]             = useState<BetaRegistration | null>(null);
  const [acting, setActing]             = useState<string | null>(null);
  const [actionError, setActionError]   = useState<string | null>(null);
  const [copiedId, setCopiedId]         = useState<string | null>(null);

  // Debounce the free-text search before it hits the server.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchRegistrations = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (typeFilter   !== 'ALL') params.set('businessType', typeFilter);
    if (search) params.set('search', search);

    api.get(`/beta/registrations?${params.toString()}`)
      .then(r => {
        setRegistrations(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Failed to load Beta registrations';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [page, typeFilter, statusFilter, search]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);
  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const updateStatus = async (id: string, status: BetaRegistrationStatus) => {
    setActing(id);
    setActionError(null);
    try {
      await api.patch(`/beta/registrations/${id}/status`, { status });
      fetchRegistrations();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to update status — please try again.');
    } finally {
      setActing(null);
      setDetail(null);
    }
  };

  const copyReferral = async (r: BetaRegistration) => {
    try {
      await navigator.clipboard.writeText(r.referralId);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Non-critical — clipboard permission issues are a soft failure.
    }
  };

  // Tab counts reflect the current status filter's own total from the
  // server when active; otherwise counted from the current page only
  // (same trade-off admin/reports/page.tsx makes).
  const countFor = (status: BetaRegistrationStatus) =>
    statusFilter === status ? total : registrations.filter(r => r.status === status).length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[var(--gold)]" />
            Beta Registrations
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Founding Dealer sign-ups from the Coming Soon page</p>
        </div>
        {statusFilter === 'PENDING' && total > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">{total} pending registrations</span>
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
          ['ALL', 'All', null],
          ...STATUS_ORDER.map((s) => [s, STATUS_STYLES[s].label, countFor(s)] as const),
        ] as [string, string, number | null][]).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val as any)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
              statusFilter === val
                ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e] border-transparent'
                : 'bg-[#0d1b2e] border-white/[0.07] text-white/50 hover:text-white/80',
            )}
          >
            {label}
            {count != null && count > 0 && (
              <span className={cn(
                'w-5 h-5 rounded-full text-[0.62rem] font-black flex items-center justify-center',
                statusFilter === val ? 'bg-[#0d1b2e] text-[var(--gold)]' : 'bg-white/[0.08] text-white/60',
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
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search dealer, owner, phone, city, referral ID…"
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07] flex-wrap">
          {(['ALL', 'CAR', 'MOTORCYCLE', 'SPARE_PART', 'ACCESSORY', 'SERVICE'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                typeFilter === t
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e]'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {t === 'ALL' ? 'All' : TYPE_STYLES[t].label}
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
            onClick={fetchRegistrations}
            className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
          >
            Retry
          </button>
        </div>
      ) : registrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Rocket className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No Beta registrations found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Dealer', 'Type', 'City', 'Phone', 'Referral', 'Status', 'Age', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg, i) => {
                const typeStyle   = TYPE_STYLES[reg.businessType as Exclude<BusinessTypeFilter, 'ALL'>] ?? TYPE_STYLES.CAR;
                const statusStyle = STATUS_STYLES[reg.status] ?? STATUS_STYLES.PENDING;
                const TypeIcon    = typeStyle.icon;
                const isActing    = acting === reg.id;
                const isOpen      = reg.status === 'PENDING' || reg.status === 'CONTACTED';

                return (
                  <tr
                    key={reg.id}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 transition-colors cursor-pointer',
                      i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]',
                      'hover:bg-[rgba(201,168,76,0.03)]',
                    )}
                    onClick={() => setDetail(reg)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white max-w-[200px] truncate flex items-center gap-1.5">
                        {reg.dealerName}
                        {reg.isFoundingDealer && <Star className="w-3 h-3 text-[var(--gold)] flex-shrink-0" />}
                      </p>
                      <p className="text-[0.68rem] text-white/30 truncate max-w-[200px]">{reg.ownerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-white/60">
                        <TypeIcon className="w-3 h-3" />
                        {typeStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">{reg.city}</td>
                    <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">
                      <span className="flex items-center gap-1"><PhoneCall className="w-3 h-3" />{reg.phone}</span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => copyReferral(reg)}
                        className="flex items-center gap-1.5 text-xs font-mono text-[var(--gold)]/80 hover:text-[var(--gold)] transition-colors"
                        title="Copy referral ID"
                      >
                        {reg.referralId}
                        {copiedId === reg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-50" />}
                      </button>
                      {typeof reg.verifiedReferralCount === 'number' && reg.verifiedReferralCount > 0 && (
                        <p className="text-[0.65rem] text-white/30 mt-0.5">{reg.verifiedReferralCount} verified referral{reg.verifiedReferralCount === 1 ? '' : 's'}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-white/30 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {isOpen && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateStatus(reg.id, 'CONTACTED')}
                            disabled={isActing || reg.status === 'CONTACTED'}
                            className="p-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 text-blue-400 hover:bg-blue-400/20 transition-all disabled:opacity-30"
                            title="Mark Contacted"
                          >
                            {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PhoneCall className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => updateStatus(reg.id, 'APPROVED')}
                            disabled={isActing}
                            className="p-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20 transition-all disabled:opacity-30"
                            title="Approve — grants Founding Dealer"
                          >
                            {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => updateStatus(reg.id, 'REJECTED')}
                            disabled={isActing}
                            className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/40 hover:text-white/70 transition-all disabled:opacity-30"
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

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setDetail(null)}>
          <div className="w-full sm:w-[480px] h-[85vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-[#0d1b2e] border border-white/[0.12] overflow-auto"
               onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  Registration Details
                  {detail.isFoundingDealer && (
                    <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/25 rounded-full px-2 py-0.5">
                      <Star className="w-3 h-3" /> Founding Dealer
                    </span>
                  )}
                </h3>
                <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 space-y-3">
                {([
                  ['Dealer Name',  detail.dealerName],
                  ['Owner Name',   detail.ownerName],
                  ['Phone',        detail.phone],
                  ['City',         detail.city],
                  ['Business Type', TYPE_STYLES[detail.businessType as Exclude<BusinessTypeFilter, 'ALL'>]?.label ?? detail.businessType],
                  ['Referral ID',  detail.referralId],
                  ['Referred By',  detail.referredByCode ?? '—'],
                  ['Verified Referrals', String(detail.verifiedReferralCount ?? 0)],
                  ['Facebook',     detail.facebookUrl ?? '—'],
                  ['Website',      detail.website ?? '—'],
                  ['Notes',        detail.notes ?? '—'],
                  ['Registered',   new Date(detail.createdAt).toLocaleString()],
                ] as [string, string][]).map(([key, val]) => (
                  <div key={key} className="flex items-start justify-between gap-3">
                    <span className="text-xs text-white/40 flex-shrink-0">{key}</span>
                    <span className="text-sm font-semibold text-white text-right break-words max-w-[280px]">{val}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => updateStatus(detail.id, 'CONTACTED')}
                  disabled={detail.status === 'CONTACTED'}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-400/15 border border-blue-400/25 text-blue-400 text-sm font-semibold hover:bg-blue-400/25 transition-all disabled:opacity-40"
                >
                  <PhoneCall className="w-4 h-4" />
                  Contacted
                </button>
                <button
                  onClick={() => updateStatus(detail.id, 'APPROVED')}
                  disabled={detail.status === 'APPROVED'}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-400/25 transition-all disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(detail.id, 'REJECTED')}
                  disabled={detail.status === 'REJECTED'}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/50 text-sm font-semibold hover:bg-white/[0.08] transition-all disabled:opacity-40"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
