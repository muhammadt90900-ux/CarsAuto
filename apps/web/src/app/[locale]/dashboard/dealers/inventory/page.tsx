'use client';
// apps/web/src/app/[locale]/dashboard/dealers/inventory/page.tsx
//
// Dealer ERP — Phase 1 (Inventory Management). Lets a dealer track their
// own stock (vehicles / spare parts / accessories) separately from what's
// published as a public Listing — see InventoryItem in schema.prisma for
// why the two are related but not 1:1.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Plus, Search, AlertTriangle, Loader2, X, Minus,
  Boxes, Ban,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import {
  inventoryApi, type InventoryItem, type InventoryItemType, type InventoryItemStatus,
} from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const TYPE_LABELS: Record<InventoryItemType, string> = {
  CAR: 'Car', MOTORCYCLE: 'Motorcycle', SPARE_PART: 'Spare Part', ACCESSORY: 'Accessory', SERVICE: 'Service',
};

const STATUS_STYLES: Record<InventoryItemStatus, { label: string; dot: string; text: string; bg: string }> = {
  IN_STOCK:     { label: 'In Stock',    dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-400/10' },
  LOW_STOCK:    { label: 'Low Stock',   dot: 'bg-[var(--gold)]', text: 'text-[var(--gold-light)]', bg: 'bg-[var(--gold-subtle)]' },
  OUT_OF_STOCK: { label: 'Out of Stock', dot: 'bg-rose-400',   text: 'text-rose-300',   bg: 'bg-rose-400/10' },
  DISCONTINUED: { label: 'Discontinued', dot: 'bg-white/30',   text: 'text-white/40',   bg: 'bg-white/[0.05]' },
};

export default function DealerInventoryPage() {
  const t = useTranslations('dashboard');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryItemStatus | 'ALL'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const params = {
    search: search || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 50,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () => inventoryApi.getAll(params),
  });

  const createMutation = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowAddForm(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Something went wrong / هەڵەیەک ڕوویدا');
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, change }: { id: string; change: number }) =>
      inventoryApi.adjustStock(id, {
        type: change > 0 ? 'RESTOCK' : 'ADJUSTMENT',
        change,
        reason: change > 0 ? 'Quick restock' : 'Quick adjustment',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const items = data?.data ?? [];
  const summary = data?.summary ?? { lowStockCount: 0, totalUnits: 0 };

  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      type: (form.get('type') as InventoryItemType) ?? 'SPARE_PART',
      name: String(form.get('name') ?? ''),
      sku: String(form.get('sku') ?? '') || undefined,
      quantity: Number(form.get('quantity') ?? 0),
      reorderThreshold: Number(form.get('reorderThreshold') ?? 1),
      costPrice: form.get('costPrice') ? Number(form.get('costPrice')) : undefined,
      currency: String(form.get('currency') ?? 'USD'),
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-white text-2xl">Inventory</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {t('title') && 'Track your vehicle and parts stock'}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e]
                     hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center">
            <Boxes className="w-4 h-4 text-white/50" />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-none">{summary.totalUnits}</p>
            <p className="text-[0.65rem] text-white/40 mt-1">Total Units</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06] flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', summary.lowStockCount > 0 ? 'bg-[var(--gold-subtle)]' : 'bg-white/[0.05]')}>
            <AlertTriangle className={cn('w-4 h-4', summary.lowStockCount > 0 ? 'text-[var(--gold-light)]' : 'text-white/50')} />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-none">{summary.lowStockCount}</p>
            <p className="text-[0.65rem] text-white/40 mt-1">Low / Out of Stock</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center">
            <Package className="w-4 h-4 text-white/50" />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-none">{data?.total ?? 0}</p>
            <p className="text-[0.65rem] text-white/40 mt-1">SKUs Tracked</p>
          </div>
        </div>
      </div>

      {/* Add item form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="p-5 rounded-2xl bg-[#0d1b2e] border border-[rgba(201,168,76,0.25)] space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-sm">New Inventory Item</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <p className="text-xs text-rose-300 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select name="type" required className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm">
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="bg-[#0d1b2e]">{label}</option>
              ))}
            </select>
            <input name="name" required placeholder="Item name" className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25" />
            <input name="sku" placeholder="SKU (optional)" className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25" />
            <input name="quantity" type="number" min={0} required placeholder="Starting quantity" className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25" />
            <input name="reorderThreshold" type="number" min={0} defaultValue={1} placeholder="Low-stock alert at" className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25" />
            <input name="costPrice" type="number" min={0} step="0.01" placeholder="Cost price (optional)" className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25" />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e]
                       hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Item
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07] flex-wrap">
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                statusFilter === tab
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e]'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {tab === 'ALL' ? 'All' : STATUS_STYLES[tab].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <Ban className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/30 text-sm">No inventory items yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: InventoryItem) => {
            const style = STATUS_STYLES[item.status];
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06]"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', style.bg)}>
                  <Package className={cn('w-4 h-4', style.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{item.name}</span>
                    <span className={cn('flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full', style.bg, style.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {TYPE_LABELS[item.type]}{item.sku ? ` · SKU: ${item.sku}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => adjustMutation.mutate({ id: item.id, change: -1 })}
                    disabled={item.quantity <= 0 || adjustMutation.isPending}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white disabled:opacity-30 flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-bold text-white text-sm">{item.quantity}</span>
                  <button
                    onClick={() => adjustMutation.mutate({ id: item.id, change: 1 })}
                    disabled={adjustMutation.isPending}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
