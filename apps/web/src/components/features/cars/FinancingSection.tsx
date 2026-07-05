'use client';
// Lazy-loaded — only downloaded when visible on page
import { useState, memo } from 'react';
import { Banknote } from 'lucide-react';

const _fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmt = (v: number) => _fmt.format(v);

export const FinancingSection = memo(function FinancingSection({ price }: { price: number }) {
  const [down,   setDown]   = useState(20);
  const [months, setMonths] = useState(48);
  const rate     = 0.045;
  const loanAmt  = price * (1 - down / 100);
  const monthly  = (loanAmt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -months));
  const total    = monthly * months + price * (down / 100);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[var(--ink-750)] to-[var(--ink-700)] border border-white/[0.07] p-6 space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-[var(--gold-subtle)] flex items-center justify-center">
          <Banknote className="w-5 h-5 text-[var(--gold)]" />
        </div>
        <div>
          <h3 className="font-display font-bold text-white text-base">Financing Calculator</h3>
          <p className="text-xs text-white/35">Estimate your monthly payments</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Down Payment</label>
          <span className="text-sm font-bold text-[var(--gold)] tabular-nums">{down}% — {fmt(price * down / 100)}</span>
        </div>
        <input type="range" min={5} max={60} value={down} onChange={e => setDown(+e.target.value)}
          className="w-full h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold)]" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Loan Term</label>
          <span className="text-sm font-bold text-[var(--gold)] tabular-nums">{months} months</span>
        </div>
        <input type="range" min={12} max={84} step={12} value={months} onChange={e => setMonths(+e.target.value)}
          className="w-full h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold)]" />
      </div>

      <div className="rounded-2xl bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.2)] p-4 text-center">
        <p className="text-xs text-[rgba(201,168,76,0.6)] uppercase tracking-wider mb-1">Estimated Monthly</p>
        <p className="text-3xl font-display font-black text-[var(--gold)] tabular-nums">{fmt(monthly)}</p>
        <p className="text-xs text-white/30 mt-1.5">Total cost: {fmt(total)} · APR: 4.5%</p>
      </div>
      <p className="text-[10px] text-white/20 leading-relaxed">*Estimates are for informational purposes only.</p>
    </div>
  );
});
