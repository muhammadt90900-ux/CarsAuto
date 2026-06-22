'use client';
// apps/web/src/app/[locale]/admin/dealers/page.tsx
// Admin panel: review, verify, reject, suspend dealers

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  CheckCircle2, XCircle, PauseCircle, Eye, Search,
  ChevronDown, Loader2, Shield, Star, Building2,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@cars-auto/utils';

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  PENDING:   { label: 'Pending',   dot: 'bg-yellow-400', text: 'text-yellow-300', bg: 'bg-yellow-400/10' },
  VERIFIED:  { label: 'Verified',  dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-400/10' },
  SUSPENDED: { label: 'Suspended', dot: 'bg-red-400',     text: 'text-red-300',    bg: 'bg-red-400/10'    },
  REJECTED:  { label: 'Rejected',  dot: 'bg-gray-500',    text: 'text-gray-400',   bg: 'bg-gray-500/10'   },
};

const TIER_OPTIONS = ['BASIC', 'STANDARD', 'GOLD', 'PLATINUM'] as const;

export default function AdminDealersPage() {
  const [dealers,  setDealers]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('PENDING');
  const [actioning, setActioning] = useState<string | null>(null);
  const [tierMap,  setTierMap]  = useState<Record<string, string>>({});

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/dealers?status=${filter}&search=${search}`);
      const data = res.data;
      setDealers(data.dealers ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchDealers(); }, [fetchDealers]);

  const act = useCallback(async (id: string, action: 'verify' | 'suspend' | 'reject', tier?: string) => {
    setActioning(id);
    try {
      await api.patch(`/admin/dealers/${id}/${action}`, {
        ...(tier ? { tier } : {}),
      });
      await fetchDealers();
    } finally {
      setActioning(null);
    }
  }, [fetchDealers]);

  const counts: Record<string, number> = {
    PENDING: dealers.filter(d => d.status === 'PENDING').length,
  };

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-white text-2xl">Dealer Management</h1>
          <p className="text-white/40 text-sm mt-0.5">Review and manage dealer applications</p>
        </div>
        {(counts?.PENDING ?? 0) > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-300">{counts?.PENDING ?? 0} pending review</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07]">
          {(['PENDING','VERIFIED','SUSPENDED','REJECTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                filter === s
                  ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {STATUS_STYLES[s as keyof typeof STATUS_STYLES]?.label ?? 'Unknown'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dealers…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
        </div>
      ) : dealers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Building2 className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No dealers in this category</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Dealer','Status','Tier','Listings','Rating','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dealers.map((dealer, i) => {
                const statusStyle: { label: string; dot: string; text: string; bg: string } = STATUS_STYLES[dealer.status] ?? STATUS_STYLES.PENDING;
                const selectedTier = tierMap[dealer.id] ?? dealer.tier ?? 'BASIC';
                const isActioning = actioning === dealer.id;

                return (
                  <tr
                    key={dealer.id}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 transition-colors',
                      i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]',
                      'hover:bg-[#c9a84c]/[0.03]',
                    )}
                  >
                    {/* Dealer info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0d1b2e] border border-white/[0.07] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {dealer.logoUrl ? (
                            <Image src={dealer.logoUrl} alt={dealer.nameEn} width={36} height={36} className="object-contain" />
                          ) : (
                            <span className="text-sm font-black text-[#c9a84c]">{dealer.nameEn?.[0]}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{dealer.nameEn}</div>
                          <div className="text-[0.68rem] text-white/35">{dealer.user?.email ?? '—'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>

                    {/* Tier selector */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={selectedTier}
                          onChange={e => setTierMap(p => ({ ...p, [dealer.id]: e.target.value }))}
                          className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white text-xs focus:outline-none focus:border-[#c9a84c]/40 cursor-pointer"
                        >
                          {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                      </div>
                    </td>

                    {/* Listings */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/60">{dealer.activeListings ?? 0}</span>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#c9a84c] fill-[#c9a84c]" />
                        <span className="text-sm text-white/60">
                          {dealer.averageRating ? dealer.averageRating.toFixed(1) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* View showroom */}
                        <Link
                          href={`/en/dealers/${dealer.slug}`}
                          target="_blank"
                          className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all"
                          title="View showroom"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {/* Verify */}
                        {dealer.status !== 'VERIFIED' && (
                          <button
                            onClick={() => act(dealer.id, 'verify', selectedTier)}
                            disabled={isActioning}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-400/20 transition-all disabled:opacity-40"
                            title="Verify dealer"
                          >
                            {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Verify
                          </button>
                        )}

                        {/* Suspend */}
                        {dealer.status === 'VERIFIED' && (
                          <button
                            onClick={() => act(dealer.id, 'suspend')}
                            disabled={isActioning}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-semibold hover:bg-yellow-400/20 transition-all disabled:opacity-40"
                            title="Suspend dealer"
                          >
                            <PauseCircle className="w-3 h-3" />
                            Suspend
                          </button>
                        )}

                        {/* Reject */}
                        {dealer.status === 'PENDING' && (
                          <button
                            onClick={() => act(dealer.id, 'reject')}
                            disabled={isActioning}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold hover:bg-red-400/20 transition-all disabled:opacity-40"
                            title="Reject application"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
