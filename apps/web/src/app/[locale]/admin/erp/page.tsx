'use client';
// apps/web/src/app/[locale]/admin/erp/page.tsx
//
// Admin view of Dealer ERP usage across the platform. Every number here
// comes from GET /admin/erp/overview and GET /admin/erp/dealer-activity
// (AdminErpService) — both derived from the same Inventory/Sale/Invoice
// tables the dealer-facing pages write to, not a separate admin ledger.
// Following the honesty convention set in admin/analytics/page.tsx: no
// metric is shown here that the backend doesn't actually compute.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Store, Package, Receipt, FileText, AlertTriangle, Wallet, Info,
} from 'lucide-react';
import { api } from '@/lib/api';

interface ErpOverview {
  adoption: { dealersUsingInventory: number; dealersUsingSales: number };
  inventory: { totalItems: number; lowOrOutOfStock: number };
  sales: { totalCompleted: number; totalRevenue: number };
  invoices: { total: number; unpaid: number };
  systemHealth: { dealersWithPastDuePayment: number };
}

interface DealerActivityRow {
  dealerId: string;
  name: string;
  inventoryItemCount: number;
  salesCount: number;
  invoiceCount: number;
  totalRevenue: number;
}

const fetchOverview = () => api.get<ErpOverview>('/admin/erp/overview').then(r => r.data);
const fetchDealerActivity = (page: number) =>
  api.get<{ data: DealerActivityRow[]; total: number; totalPages: number }>(`/admin/erp/dealer-activity?page=${page}&limit=20`).then(r => r.data);

function formatMoney(n: number | undefined) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function AdminErpPage() {
  const [page, setPage] = useState(1);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin', 'erp', 'overview'],
    queryFn: fetchOverview,
    staleTime: 30_000,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin', 'erp', 'dealer-activity', page],
    queryFn: () => fetchDealerActivity(page),
    staleTime: 30_000,
  });

  const KPIs = overview ? [
    { label: 'Dealers Using Inventory', value: overview.adoption.dealersUsingInventory, color: 'var(--gold)', icon: Store },
    { label: 'Dealers Using Sales',     value: overview.adoption.dealersUsingSales,     color: '#22c55e',     icon: Receipt },
    { label: 'Total Inventory Items',   value: overview.inventory.totalItems,           color: '#3b82f6',     icon: Package },
    { label: 'Low / Out of Stock',      value: overview.inventory.lowOrOutOfStock,      color: '#f43f5e',     icon: AlertTriangle },
    { label: 'Completed Sales',         value: overview.sales.totalCompleted,           color: '#8b5cf6',     icon: Receipt },
    { label: 'Total Platform Revenue',  value: formatMoney(overview.sales.totalRevenue), color: 'var(--gold)', icon: Wallet },
    { label: 'Invoices Issued',         value: overview.invoices.total,                 color: '#f59e0b',     icon: FileText },
    { label: 'Dealers Past Due',        value: overview.systemHealth.dealersWithPastDuePayment, color: '#f43f5e', icon: AlertTriangle },
  ] : [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display font-black text-white text-2xl tracking-tight">Dealer ERP</h1>
        <p className="text-white/40 text-sm mt-0.5">Platform-wide adoption and usage — real totals from Inventory/Sales/Invoices</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/[0.06] border border-blue-400/20">
        <Info className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-200/80">
          Infrastructure health (queue lag, DB latency, uptime) lives in the existing Grafana/Prometheus
          stack — this page covers ERP-domain signals only: adoption, stock, and payment risk.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {(overviewLoading ? Array.from({ length: 8 }) : KPIs).map((kpi: any, i) => {
          const Icon = kpi?.icon ?? Store;
          return (
            <div key={kpi?.label ?? i} className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-5 hover:border-white/[0.12] transition-colors">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${kpi?.color ?? '#888'}15`, border: `1px solid ${kpi?.color ?? '#888'}22` }}
              >
                <Icon className="w-4 h-4" style={{ color: kpi?.color ?? '#888' }} />
              </div>
              <p className="text-2xl font-black text-white tabular-nums">
                {overviewLoading ? '…' : kpi.value}
              </p>
              <p className="text-[0.7rem] text-white/35 mt-0.5">{kpi?.label ?? ''}</p>
            </div>
          );
        })}
      </div>

      {/* Dealer activity table */}
      <div className="rounded-2xl bg-[#0a1525] border border-white/[0.07] overflow-hidden">
        <div className="p-5 border-b border-white/[0.07]">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Store className="w-4.5 h-4.5 text-[var(--gold)]" />
            Dealer Activity
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wide border-b border-white/[0.06]">
                <th className="text-start px-5 py-3 font-semibold">Dealer</th>
                <th className="text-start px-5 py-3 font-semibold">Inventory Items</th>
                <th className="text-start px-5 py-3 font-semibold">Sales</th>
                <th className="text-start px-5 py-3 font-semibold">Invoices</th>
                <th className="text-start px-5 py-3 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {activityLoading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">Loading…</td></tr>
              ) : !activity || activity.data.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">No dealers yet</td></tr>
              ) : (
                activity.data.map(row => (
                  <tr key={row.dealerId} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-white font-medium">{row.name}</td>
                    <td className="px-5 py-3 text-white/60">{row.inventoryItemCount}</td>
                    <td className="px-5 py-3 text-white/60">{row.salesCount}</td>
                    <td className="px-5 py-3 text-white/60">{row.invoiceCount}</td>
                    <td className="px-5 py-3 text-white/80 font-semibold">{formatMoney(row.totalRevenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {activity && activity.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/[0.07] text-xs text-white/40">
            <span>Page {page} of {activity.totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] disabled:opacity-30 text-white/70"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(activity.totalPages, p + 1))}
                disabled={page === activity.totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] disabled:opacity-30 text-white/70"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
