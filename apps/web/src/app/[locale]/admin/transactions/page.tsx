'use client';
// apps/web/src/app/[locale]/admin/transactions/page.tsx
// Admin: view all platform transactions (Payment model) — listing-plan and
// dealer-subscription payments across all gateways (Stripe, ZainCash,
// FastPay, QiCard, AsiaHawala). Backed by real /admin/transactions.

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Receipt, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  X, CreditCard, Clock,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
type Gateway = 'stripe' | 'zaincash' | 'fastpay' | 'qicard' | 'asiahawala';

interface Transaction {
  id: string;
  plan: string;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  gateway: Gateway;
  gatewayId?: string | null;
  failureReason?: string | null;
  refundedAt?: string | null;
  refundAmount?: string | number | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

interface TransactionLog {
  id: string;
  event: string;
  status: string;
  amount?: string | number | null;
  errorMessage?: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<PaymentStatus, { label: string; text: string; bg: string; dot: string }> = {
  pending:   { label: 'Pending',   text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  dot: 'bg-yellow-400'  },
  completed: { label: 'Completed', text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  failed:    { label: 'Failed',    text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
  refunded:  { label: 'Refunded',  text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
  cancelled: { label: 'Cancelled', text: 'text-white/30',    bg: 'bg-white/[0.05]',   dot: 'bg-white/20'    },
};

const GATEWAY_LABELS: Record<Gateway, string> = {
  stripe: 'Stripe', zaincash: 'ZainCash', fastpay: 'FastPay', qicard: 'QiCard', asiahawala: 'AsiaHawala',
};

const PAGE_SIZE = 20;

export default function AdminTransactionsPage() {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [txns, setTxns]         = useState<Transaction[]>([]);
  const [total, setTotal]       = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus]   = useState<PaymentStatus | 'ALL'>('ALL');
  const [gatewayFilter, setGateway] = useState<Gateway | 'ALL'>('ALL');
  const [page, setPage]         = useState(1);
  const [detail, setDetail]     = useState<Transaction | null>(null);
  const [logs, setLogs]         = useState<TransactionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchTxns = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (gatewayFilter !== 'ALL') params.set('gateway', gatewayFilter);
    if (search) params.set('search', search);

    api.get(`/admin/transactions?${params.toString()}`)
      .then(r => {
        setTxns(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
        setTotalRevenue(Number(r.data.totalRevenue ?? 0));
      })
      .catch(err => setError(err?.response?.data?.message ?? 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, gatewayFilter]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);
  useEffect(() => { setPage(1); }, [search, statusFilter, gatewayFilter]);

  const openDetail = (txn: Transaction) => {
    setDetail(txn);
    setLogsLoading(true);
    api.get(`/admin/transactions/${txn.id}`)
      .then(r => setLogs(r.data?.transactionLogs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fmt = (amount: string | number, currency: string) =>
    `${currency ?? 'USD'} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Number(amount))}`;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight">Transactions</h1>
          <p className="text-white/40 text-sm mt-0.5">All payments across listing plans and dealer subscriptions</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[rgba(201,168,76,0.15)] to-transparent border border-[rgba(201,168,76,0.2)] px-5 py-3">
          <p className="text-[0.68rem] text-white/40 uppercase tracking-wider">Total Revenue (completed)</p>
          <p className="text-xl font-black text-[var(--gold)]">{fmt(totalRevenue, 'USD')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name or email…"
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-ink-700 border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07] overflow-x-auto">
          {(['ALL', 'pending', 'completed', 'failed', 'refunded', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                statusFilter === s ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700'
                                   : 'text-white/40 hover:text-white/70')}
            >
              {s === 'ALL' ? 'All' : STATUS_STYLES[s as PaymentStatus].label}
            </button>
          ))}
        </div>
        <select
          value={gatewayFilter}
          onChange={e => setGateway(e.target.value as any)}
          className="px-3 py-2.5 rounded-xl bg-ink-700 border border-white/[0.07] text-white text-sm focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
        >
          <option value="ALL">All gateways</option>
          {Object.entries(GATEWAY_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
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
          <button onClick={fetchTxns} className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all">
            Retry
          </button>
        </div>
      ) : txns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Receipt className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No transactions found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Customer', 'Plan', 'Amount', 'Gateway', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((txn, i) => {
                const statusStyle = STATUS_STYLES[txn.status] ?? STATUS_STYLES.pending;
                return (
                  <tr
                    key={txn.id}
                    onClick={() => openDetail(txn)}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 cursor-pointer transition-colors hover:bg-[rgba(201,168,76,0.03)]',
                      i % 2 === 0 ? 'bg-ink-750' : 'bg-ink-700',
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white">{txn.user?.name ?? '—'}</p>
                      <p className="text-[0.68rem] text-white/30">{txn.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50 capitalize">{txn.plan}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[var(--gold)] whitespace-nowrap">{fmt(txn.amount, txn.currency)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-white/50">
                        <CreditCard className="w-3 h-3" />
                        {GATEWAY_LABELS[txn.gateway] ?? txn.gateway}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30 whitespace-nowrap">
                      {new Date(txn.createdAt).toLocaleDateString()}
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

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setDetail(null)}>
          <div className="w-full sm:w-[480px] h-[80vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-ink-700 border border-white/[0.12] overflow-auto"
               onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Transaction Details</h3>
                <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 space-y-3">
                {[
                  ['Transaction ID', detail.id],
                  ['Customer',       detail.user?.name ?? detail.user?.email ?? '—'],
                  ['Plan',           detail.plan],
                  ['Amount',         fmt(detail.amount, detail.currency)],
                  ['Gateway',        GATEWAY_LABELS[detail.gateway] ?? detail.gateway],
                  ['Gateway ID',     detail.gatewayId ?? '—'],
                  ...(detail.refundedAt ? [['Refunded', fmt(detail.refundAmount ?? detail.amount, detail.currency)]] : []),
                  ...(detail.failureReason ? [['Failure reason', detail.failureReason]] : []),
                ].map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-white/40 flex-shrink-0">{key}</span>
                    <span className="text-sm font-semibold text-white text-right truncate">{val}</span>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-white/40 mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Event timeline</p>
                {logsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-[var(--gold)] animate-spin" /></div>
                ) : logs.length === 0 ? (
                  <p className="text-xs text-white/25">No log entries</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                        <div>
                          <p className="text-xs font-semibold text-white">{log.event}</p>
                          {log.errorMessage && <p className="text-[0.68rem] text-red-400/80 mt-0.5">{log.errorMessage}</p>}
                        </div>
                        <span className="text-[0.68rem] text-white/30 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
