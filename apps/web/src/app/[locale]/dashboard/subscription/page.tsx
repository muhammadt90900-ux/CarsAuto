// apps/web/src/app/[locale]/dashboard/subscription/page.tsx
'use client';

import { useState } from 'react';
import { Check, Zap, Crown, Star, CreditCard, Calendar, ArrowRight, Shield } from 'lucide-react';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: { monthly: 0, yearly: 0 },
    icon: Star,
    color: 'gray',
    accent: 'text-gray-500',
    border: 'border-gray-200 dark:border-white/10',
    badge: null,
    features: ['Up to 3 listings', 'Basic analytics', 'Email support', 'Standard visibility'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 19, yearly: 15 },
    icon: Zap,
    color: 'blue',
    accent: 'text-[#e94560]',
    border: 'border-[#e94560]/30',
    badge: 'Most Popular',
    features: ['Up to 20 listings', 'Advanced analytics', 'Priority support', 'Featured listings', 'WhatsApp integration', 'Custom profile badge'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: { monthly: 49, yearly: 39 },
    icon: Crown,
    color: 'amber',
    accent: 'text-amber-500',
    border: 'border-amber-300/40 dark:border-amber-500/20',
    badge: 'Best Value',
    features: ['Unlimited listings', 'Full analytics suite', '24/7 dedicated support', 'Top placement', 'All Pro features', 'Team access (3 seats)', 'API access'],
  },
];

export default function SubscriptionPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [current] = useState('pro');

  return (
    <div className="p-5 lg:p-7 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Subscription</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your plan and billing</p>
      </div>

      {/* Current plan banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#e94560]/10 to-purple-500/10 border border-[#e94560]/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#e94560]/15 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#e94560]" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Pro Plan · Active</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Renews on June 22, 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg">Active</span>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5 p-1 bg-gray-100/70 dark:bg-white/5 rounded-xl">
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                billing === b
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        {billing === 'yearly' && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg">
            Save up to 20%
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === current;
          const price = plan.price[billing];
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 ${plan.border} p-5 ${
                isCurrent
                  ? 'bg-gradient-to-b from-[#e94560]/5 to-transparent dark:from-[#e94560]/8'
                  : 'bg-white dark:bg-[#0f0f1a]/80'
              } transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    plan.id === 'pro'
                      ? 'bg-[#e94560] text-white shadow-lg shadow-[#e94560]/30'
                      : 'bg-amber-400 text-amber-900 shadow-lg shadow-amber-400/30'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className={`w-9 h-9 rounded-xl ${plan.id === 'pro' ? 'bg-[#e94560]/10' : plan.id === 'elite' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-gray-100 dark:bg-white/5'} flex items-center justify-center mb-4`}>
                <plan.icon className={`w-4 h-4 ${plan.accent}`} />
              </div>

              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                  ${price}
                </span>
                {price > 0 && <span className="text-xs text-gray-400 mb-1">/mo</span>}
                {price === 0 && <span className="text-xs text-gray-400 mb-1">Free</span>}
              </div>

              <div className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      plan.id === 'pro' ? 'bg-[#e94560]/10' : plan.id === 'elite' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-gray-100 dark:bg-white/5'
                    }`}>
                      <Check className={`w-2.5 h-2.5 ${plan.accent}`} />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{f}</span>
                  </div>
                ))}
              </div>

              <button
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isCurrent
                    ? 'bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500 cursor-default'
                    : plan.id === 'pro'
                    ? 'bg-[#e94560] hover:bg-[#d63d57] text-white shadow-lg shadow-[#e94560]/25 hover:shadow-[#e94560]/40 hover:-translate-y-0.5 active:translate-y-0'
                    : plan.id === 'elite'
                    ? 'bg-amber-400 hover:bg-amber-500 text-amber-900 shadow-lg shadow-amber-400/25 hover:-translate-y-0.5 active:translate-y-0'
                    : 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Billing info */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f1a]/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Billing Information</h2>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Visa •••• 4242</p>
                <p className="text-[10px] text-gray-400">Expires 12/27</p>
              </div>
            </div>
            <button className="text-xs text-[#e94560] font-medium hover:underline">Change</button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Next billing date</p>
                <p className="text-[10px] text-gray-400">June 22, 2026 · $19.00</p>
              </div>
            </div>
            <button className="text-xs text-gray-400 hover:text-red-400 font-medium transition-colors">Cancel</button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            Secured by Stripe · 256-bit encryption
          </div>
        </div>
      </div>
    </div>
  );
}
