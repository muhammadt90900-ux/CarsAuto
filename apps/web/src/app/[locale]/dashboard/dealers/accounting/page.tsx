'use client';
// apps/web/src/app/[locale]/dashboard/dealers/accounting/page.tsx
//
// Dealer ERP — Phase 3 (Accounting). Revenue and cost-of-goods-sold shown
// here are computed server-side from Sale/SaleItem on every request — this
// page has no local math beyond formatting; see AccountingService.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Wallet, Receipt, Plus, X, Loader2, Trash2, DollarSign,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { accountingApi, type Expense, type ExpenseCategory, type ReportPeriod } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT: 'Rent', SALARIES: 'Salaries', UTILITIES: 'Utilities', MARKETING: 'Marketing',
  MAINTENANCE: 'Maintenance', SUPPLIES: 'Supplies', TRANSPORT: 'Transport', OTHER: 'Other',
};

export default function DealerAccountingPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: queryKeys.accounting.profitLoss({ period }),
    queryFn: () => accountingApi.getProfitLoss({ period }),
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: queryKeys.accounting.expenses({ period }),
    queryFn: () => accountingApi.getExpenses({ period }),
  });

  const createExpenseMutation = useMutation({
    mutationFn: accountingApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      setShowAddExpense(false);
      setFormError(null);
    },
    onError: (err: any) => setFormError(err?.response?.data?.message ?? 'Something went wrong / هەڵەیەک ڕوویدا'),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: accountingApi.deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounting'] }),
  });

  function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createExpenseMutation.mutate({
      category: (form.get('category') as ExpenseCategory) ?? 'OTHER',
      amount: Number(form.get('amount') ?? 0),
      description: String(form.get('description') ?? '') || undefined,
    });
  }

  const maxSeriesValue = Math.max(1, ...(report?.series.map(s => Math.max(s.revenue, s.expenses)) ?? [1]));

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-white text-2xl">Accounting</h1>
          <p className="text-white/40 text-sm mt-0.5">Income, expenses, and profit at a glance</p>
        </div>
        <button
          onClick={() => setShowAddExpense(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07] w-fit">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
              period === p ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700' : 'text-white/40 hover:text-white/70',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {reportLoading || !report ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard icon={DollarSign} label="Revenue" value={report.revenue} tone="neutral" />
            <SummaryCard icon={Wallet} label="Cost of Goods" value={report.cogs} tone="neutral" />
            <SummaryCard icon={Receipt} label="Expenses" value={report.totalExpenses} tone="down" />
            <SummaryCard
              icon={report.netProfit >= 0 ? TrendingUp : TrendingDown}
              label="Net Profit"
              value={report.netProfit}
              tone={report.netProfit >= 0 ? 'up' : 'down'}
            />
          </div>

          {/* Simple bar visualization — no charting library, matches admin/analytics convention */}
          {report.series.length > 0 && (
            <div className="p-5 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06]">
              <h3 className="text-white/60 text-xs font-semibold mb-4 uppercase tracking-wide">Revenue vs. Expenses</h3>
              <div className="flex items-end gap-2 h-32">
                {report.series.map(point => (
                  <div key={point.bucket} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full flex items-end gap-0.5 h-24">
                      <div
                        className="flex-1 rounded-t bg-gradient-to-t from-[var(--gold)] to-[var(--gold-light)]"
                        style={{ height: `${Math.max(2, (point.revenue / maxSeriesValue) * 100)}%` }}
                        title={`Revenue: ${point.revenue.toFixed(2)}`}
                      />
                      <div
                        className="flex-1 rounded-t bg-rose-400/50"
                        style={{ height: `${Math.max(2, (point.expenses / maxSeriesValue) * 100)}%` }}
                        title={`Expenses: ${point.expenses.toFixed(2)}`}
                      />
                    </div>
                    <span className="text-[0.55rem] text-white/30 truncate w-full text-center">{point.bucket.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add expense form */}
      {showAddExpense && (
        <form onSubmit={handleAddExpense} className="p-5 rounded-2xl bg-ink-700 border border-[rgba(201,168,76,0.25)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-sm">New Expense</h3>
            <button type="button" onClick={() => setShowAddExpense(false)} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {formError && (
            <p className="text-xs text-rose-300 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select name="category" required className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm">
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="bg-ink-700">{label}</option>
              ))}
            </select>
            <input name="amount" type="number" min={0.01} step="0.01" required placeholder="Amount" className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25" />
            <input name="description" placeholder="Description (optional)" className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25" />
          </div>
          <button
            type="submit"
            disabled={createExpenseMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createExpenseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Expense
          </button>
        </form>
      )}

      {/* Expense list */}
      <div>
        <h3 className="text-white/60 text-xs font-semibold mb-2 uppercase tracking-wide">Expenses</h3>
        {expensesLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" /></div>
        ) : !expenses || expenses.length === 0 ? (
          <p className="text-white/30 text-sm py-6 text-center">No expenses recorded for this period</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((exp: Expense) => (
              <div key={exp.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--ink-750)] border border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-3.5 h-3.5 text-white/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-white text-sm">{CATEGORY_LABELS[exp.category]}</span>
                  {exp.description && <span className="text-white/40 text-xs ms-2">{exp.description}</span>}
                  <p className="text-[0.65rem] text-white/30 mt-0.5">{new Date(exp.expenseDate).toLocaleDateString()}</p>
                </div>
                <span className="font-bold text-rose-300 text-sm">-{exp.amount} {exp.currency}</span>
                <button
                  onClick={() => deleteExpenseMutation.mutate(exp.id)}
                  disabled={deleteExpenseMutation.isPending}
                  className="text-white/20 hover:text-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, tone,
}: { icon: typeof DollarSign; label: string; value: number; tone: 'up' | 'down' | 'neutral' }) {
  const toneClass = tone === 'up' ? 'text-emerald-300' : tone === 'down' ? 'text-rose-300' : 'text-white';
  return (
    <div className="p-4 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[0.65rem] text-white/40 uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn('text-xl font-bold', toneClass)}>{value.toFixed(2)}</p>
    </div>
  );
}
