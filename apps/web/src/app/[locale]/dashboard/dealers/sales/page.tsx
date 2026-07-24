'use client';
// apps/web/src/app/[locale]/dashboard/dealers/sales/page.tsx
//
// Dealer ERP — Phase 2 (Sales & Invoices). Recording a sale here decrements
// the matching InventoryItem's stock server-side (SalesService reuses
// InventoryService.adjustStock) — this page never touches inventory
// quantities directly.

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, Plus, X, Loader2, Trash2, FileText, CheckCircle2, Ban,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { salesApi, inventoryApi, type CreateSaleItemPayload, type Sale, type InvoiceRecord } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

type Tab = 'sales' | 'invoices';

const STATUS_STYLES: Record<string, { label: string; text: string; bg: string }> = {
  COMPLETED: { label: 'Completed', text: 'text-emerald-300', bg: 'bg-emerald-400/10' },
  CANCELLED: { label: 'Cancelled', text: 'text-rose-300', bg: 'bg-rose-400/10' },
  REFUNDED:  { label: 'Refunded', text: 'text-white/50', bg: 'bg-white/[0.05]' },
  DRAFT:     { label: 'Draft', text: 'text-white/50', bg: 'bg-white/[0.05]' },
  ISSUED:    { label: 'Issued', text: 'text-[var(--gold-light)]', bg: 'bg-[var(--gold-subtle)]' },
  PAID:      { label: 'Paid', text: 'text-emerald-300', bg: 'bg-emerald-400/10' },
  VOID:      { label: 'Void', text: 'text-rose-300', bg: 'bg-rose-400/10' },
};

export default function DealerSalesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('sales');
  const [showNewSale, setShowNewSale] = useState(false);
  const [lineItems, setLineItems] = useState<CreateSaleItemPayload[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: queryKeys.sales.list({}),
    queryFn: () => salesApi.getAll({ limit: 50 }),
    enabled: tab === 'sales',
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: queryKeys.sales.invoices(),
    queryFn: () => salesApi.getInvoices(),
    enabled: tab === 'invoices',
  });

  const { data: inventoryData } = useQuery({
    queryKey: queryKeys.inventory.list({ limit: 100 }),
    queryFn: () => inventoryApi.getAll({ limit: 100, status: 'IN_STOCK' }),
    enabled: showNewSale,
  });

  const createSaleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowNewSale(false);
      setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setFormError(null);
    },
    onError: (err: any) => setFormError(err?.response?.data?.message ?? 'Something went wrong / هەڵەیەک ڕوویدا'),
  });

  const cancelMutation = useMutation({
    mutationFn: salesApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const issueInvoiceMutation = useMutation({
    mutationFn: salesApi.issueInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: salesApi.markInvoicePaid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] }),
  });

  const total = useMemo(
    () => lineItems.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0),
    [lineItems],
  );

  function updateLine(index: number, patch: Partial<CreateSaleItemPayload>) {
    setLineItems(items => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function pickInventoryItem(index: number, inventoryItemId: string) {
    const item = inventoryData?.data.find(i => i.id === inventoryItemId);
    if (!item) return;
    updateLine(index, {
      inventoryItemId,
      description: item.name,
      unitPrice: item.costPrice ? Number(item.costPrice) : 0,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lineItems.some(i => !i.description || i.quantity < 1)) {
      setFormError('هەموو کاڵاکان پێویستە ناو و بڕیان هەبێت / All items need a description and quantity');
      return;
    }
    createSaleMutation.mutate({ items: lineItems, issueInvoice: true });
  }

  const sales = salesData?.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-white text-2xl">Sales & Invoices</h1>
          <p className="text-white/40 text-sm mt-0.5">Record sales and manage invoices</p>
        </div>
        <button
          onClick={() => setShowNewSale(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New Sale
        </button>
      </div>

      {salesData?.summary && (
        <div className="p-4 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06] inline-flex items-center gap-3">
          <Receipt className="w-4 h-4 text-white/50" />
          <span className="text-lg font-bold text-white">{salesData.summary.totalRevenue}</span>
          <span className="text-xs text-white/40">total revenue</span>
        </div>
      )}

      {/* New sale form */}
      {showNewSale && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-ink-700 border border-[rgba(201,168,76,0.25)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-sm">New Sale</h3>
            <button type="button" onClick={() => setShowNewSale(false)} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <p className="text-xs text-rose-300 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="space-y-3">
            {lineItems.map((line, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <select
                  value={line.inventoryItemId ?? ''}
                  onChange={e => (e.target.value ? pickInventoryItem(i, e.target.value) : updateLine(i, { inventoryItemId: undefined }))}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm flex-1 min-w-[10rem]"
                >
                  <option value="" className="bg-ink-700">Custom item…</option>
                  {inventoryData?.data.map(item => (
                    <option key={item.id} value={item.id} className="bg-ink-700">
                      {item.name} ({item.quantity} in stock)
                    </option>
                  ))}
                </select>
                <input
                  value={line.description}
                  onChange={e => updateLine(i, { description: e.target.value })}
                  placeholder="Description"
                  className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm w-40 placeholder:text-white/25"
                />
                <input
                  type="number" min={1} value={line.quantity}
                  onChange={e => updateLine(i, { quantity: Number(e.target.value) })}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm w-20"
                />
                <input
                  type="number" min={0} step="0.01" value={line.unitPrice}
                  onChange={e => updateLine(i, { unitPrice: Number(e.target.value) })}
                  placeholder="Unit price"
                  className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm w-28"
                />
                <button
                  type="button"
                  onClick={() => setLineItems(items => items.filter((_, idx) => idx !== i))}
                  disabled={lineItems.length === 1}
                  className="text-white/30 hover:text-rose-300 disabled:opacity-20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLineItems(items => [...items, { description: '', quantity: 1, unitPrice: 0 }])}
            className="text-xs font-semibold text-[var(--gold-light)] hover:opacity-80"
          >
            + Add another item
          </button>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-white/50 text-sm">Total: <span className="text-white font-bold">{total.toFixed(2)}</span></span>
            <button
              type="submit"
              disabled={createSaleMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                         bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {createSaleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Complete Sale & Issue Invoice
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07] w-fit">
        {(['sales', 'invoices'] as const).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
              tab === tb ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700' : 'text-white/40 hover:text-white/70',
            )}
          >
            {tb}
          </button>
        ))}
      </div>

      {tab === 'sales' ? (
        salesLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" /></div>
        ) : sales.length === 0 ? (
          <EmptyState label="No sales recorded yet" />
        ) : (
          <div className="space-y-2">
            {sales.map((sale: Sale) => {
              const style = STATUS_STYLES[sale.status];
              return (
                <div key={sale.id} className="p-4 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {sale.customer?.name ?? 'Walk-in customer'}
                        </span>
                        <span className={cn('text-[0.65rem] font-semibold px-2 py-0.5 rounded-full', style.bg, style.text)}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">
                        {sale.items.length} item{sale.items.length !== 1 ? 's' : ''} · {new Date(sale.saleDate).toLocaleDateString()}
                        {sale.invoice && ` · ${sale.invoice.invoiceNumber}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{sale.total} {sale.currency}</span>
                      {sale.status === 'COMPLETED' && (
                        <button
                          onClick={() => cancelMutation.mutate(sale.id)}
                          disabled={cancelMutation.isPending}
                          className="text-xs text-rose-300/70 hover:text-rose-300 flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : invoicesLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" /></div>
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState label="No invoices issued yet" />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv: InvoiceRecord) => {
            const style = STATUS_STYLES[inv.status];
            return (
              <div key={inv.id} className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06]">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-white/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-white text-sm">{inv.invoiceNumber}</span>
                  <span className={cn('ms-2 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full', style.bg, style.text)}>
                    {style.label}
                  </span>
                  <p className="text-xs text-white/40 mt-0.5">
                    {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                {inv.status === 'ISSUED' && (
                  <button
                    onClick={() => markPaidMutation.mutate(inv.id)}
                    disabled={markPaidMutation.isPending}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:opacity-80"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
        <Receipt className="w-8 h-8 text-white/20" />
      </div>
      <p className="text-white/30 text-sm">{label}</p>
    </div>
  );
}
