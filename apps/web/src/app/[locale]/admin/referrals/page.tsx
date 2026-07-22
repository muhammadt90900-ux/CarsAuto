'use client';
// apps/web/src/app/[locale]/admin/referrals/page.tsx
// Admin: Referral & Rewards System management. Mirrors the structure of
// admin/beta-registrations/page.tsx (status tabs, filter row, table,
// detail drawer, pagination) for a consistent admin experience.

import { useState, useEffect, useCallback } from 'react';
import {
  Gift, Search, CheckCircle2, XCircle, PauseCircle, Loader2,
  AlertTriangle, ChevronLeft, ChevronRight, Clock, Trophy, Download, Users,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { adminReferralsApi } from '@/lib/api';
import type { ReferralListItem, ReferralStatus, ReferralStats, ReferralLeaderboardEntry } from '@cars-auto/types';

const STATUS_STYLES: Record<ReferralStatus, { label: string; text: string; bg: string; dot: string }> = {
  PENDING:   { label: 'Pending',   text: 'text-amber-400',   bg: 'bg-amber-400/10',   dot: 'bg-amber-400'   },
  QUALIFIED: { label: 'Qualified', text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  REJECTED:  { label: 'Rejected',  text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
  SUSPENDED: { label: 'Suspended', text: 'text-white/50',    bg: 'bg-white/[0.06]',   dot: 'bg-white/40'    },
};

const STATUS_ORDER: ReferralStatus[] = ['PENDING', 'QUALIFIED', 'REJECTED', 'SUSPENDED'];
const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 350;

export default function AdminReferralsPage() {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [referrals, setReferrals]     = useState<ReferralListItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [stats, setStats]             = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'ALL'>('ALL');
  const [page, setPage]               = useState(1);
  const [detail, setDetail]           = useState<ReferralListItem | null>(null);
  const [acting, setActing]           = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchReferrals = useCallback(() => {
    setLoading(true);
    setError(null);
    adminReferralsApi.getAll({
      page, limit: PAGE_SIZE,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      search: search || undefined,
    })
      .then((r) => { setReferrals(r.data ?? []); setTotal(r.total ?? 0); })
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load referrals'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => { fetchReferrals(); }, [fetchReferrals]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  useEffect(() => {
    adminReferralsApi.getStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (showLeaderboard && leaderboard.length === 0) {
      adminReferralsApi.getLeaderboard(20).then(setLeaderboard).catch(() => {});
    }
  }, [showLeaderboard, leaderboard.length]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const runAction = async (id: string, action: 'approve' | 'reject' | 'suspend') => {
    setActing(id);
    setActionError(null);
    try {
      if (action === 'approve') await adminReferralsApi.approve(id);
      else if (action === 'reject') await adminReferralsApi.reject(id);
      else await adminReferralsApi.suspend(id);
      fetchReferrals();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Action failed — please try again.');
    } finally {
      setActing(null);
      setDetail(null);
    }
  };

  const countFor = (status: ReferralStatus) =>
    statusFilter === status ? total : referrals.filter((r) => r.status === status).length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight flex items-center gap-2">
            <Gift className="w-5 h-5 text-[var(--gold)]" />
            Referral & Rewards Management
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Dealer-to-dealer referral tracking, qualification, and rewards</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLeaderboard((v) => !v)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
              showLeaderboard ? 'bg-[var(--gold)]/15 border-[var(--gold)]/30 text-[var(--gold)]' : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white')}
          >
            <Trophy className="w-4 h-4" /> Leaderboard
          </button>
          <a
            href={adminReferralsApi.exportUrl()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white text-sm font-semibold transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            ['Total Referrals', stats.total, Users],
            ['Qualified', stats.qualified, CheckCircle2],
            ['Pending', stats.pending, Clock],
            ['Rejected/Suspended', stats.rejected, XCircle],
          ] as [string, number, any][]).map(([label, val, Icon]) => (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <Icon className="w-4 h-4 text-white/30 mb-2" />
              <p className="text-xl font-bold text-white">{val}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="rounded-2xl border border-[rgba(201,168,76,0.25)] bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[var(--gold)]" /> Top Referrers
          </h2>
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div key={entry.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs font-bold text-white/30">#{i + 1}</span>
                  <span className="text-sm text-white">{entry.nameEn || entry.nameKu}</span>
                  <span className="text-xs text-white/30 font-mono">{entry.referralCode}</span>
                </div>
                <span className="text-sm font-semibold text-[var(--gold-light)]">{entry.qualifiedReferralCount} qualified</span>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-sm text-white/30">No qualified referrers yet.</p>}
          </div>
        </div>
      )}

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
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
              statusFilter === val
                ? 'bg-[var(--gold)]/15 border-[var(--gold)]/30 text-[var(--gold)]'
                : 'bg-white/[0.03] border-white/[0.07] text-white/50 hover:text-white/80',
            )}
          >
            {label}{count !== null ? ` (${count})` : ''}
          </button>
        ))}

        <div className="relative ml-auto min-w-[220px]">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search dealer, code, or user..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--gold)]/40"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-400 text-sm">{error}</div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-left text-xs text-white/30 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Referred User</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => {
                const statusStyle = STATUS_STYLES[r.status];
                const isActing = acting === r.id;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-white/80">{r.referrerDealer?.nameEn ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-white/40">{r.referralCodeUsed}</td>
                    <td className="px-4 py-3 text-white/80">
                      {r.referredUser?.name ?? '—'}
                      <div className="text-xs text-white/30">{r.referredUser?.email}</div>
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
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => runAction(r.id, 'approve')}
                          disabled={isActing || r.status === 'QUALIFIED'}
                          className="p-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20 transition-all disabled:opacity-30"
                          title="Approve / re-evaluate"
                        >
                          {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => runAction(r.id, 'reject')}
                          disabled={isActing || r.status === 'REJECTED'}
                          className="p-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 hover:bg-red-400/20 transition-all disabled:opacity-30"
                          title="Reject"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => runAction(r.id, 'suspend')}
                          disabled={isActing || r.status === 'SUSPENDED'}
                          className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/40 hover:text-white/70 transition-all disabled:opacity-30"
                          title="Suspend reward eligibility"
                        >
                          <PauseCircle className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {referrals.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-white/30">No referrals found.</td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">Page {page} of {totalPages || 1} — {total} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
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
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
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
               onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Referral Details</h3>
                <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 space-y-3">
                {([
                  ['Referrer Dealer', detail.referrerDealer?.nameEn ?? '—'],
                  ['Referral Code', detail.referralCodeUsed],
                  ['Referred User', detail.referredUser?.name ?? '—'],
                  ['Referred Email', detail.referredUser?.email ?? '—'],
                  ['Status', STATUS_STYLES[detail.status].label],
                  ['Rejection Reason', detail.rejectedReason ?? '—'],
                  ['Registered', new Date(detail.createdAt).toLocaleString()],
                  ['Qualified At', detail.qualifiedAt ? new Date(detail.qualifiedAt).toLocaleString() : '—'],
                ] as [string, string][]).map(([key, val]) => (
                  <div key={key} className="flex items-start justify-between gap-3">
                    <span className="text-xs text-white/40 flex-shrink-0">{key}</span>
                    <span className="text-sm font-semibold text-white text-right break-words max-w-[280px]">{val}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => runAction(detail.id, 'approve')}
                  disabled={detail.status === 'QUALIFIED'}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-400/25 transition-all disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => runAction(detail.id, 'reject')}
                  disabled={detail.status === 'REJECTED'}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-400/15 border border-red-400/25 text-red-400 text-sm font-semibold hover:bg-red-400/25 transition-all disabled:opacity-40"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => runAction(detail.id, 'suspend')}
                  disabled={detail.status === 'SUSPENDED'}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/50 text-sm font-semibold hover:bg-white/[0.08] transition-all disabled:opacity-40"
                >
                  <PauseCircle className="w-4 h-4" /> Suspend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
