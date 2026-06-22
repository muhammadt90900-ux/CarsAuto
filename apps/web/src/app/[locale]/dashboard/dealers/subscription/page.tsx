'use client';
// apps/web/src/app/[locale]/dashboard/dealer/subscription/page.tsx
// Dealer subscription / upgrade plans

import { useState } from 'react';
import { CheckCircle2, Zap, Shield, BarChart2, Star, Crown } from 'lucide-react';
import { cn } from '@cars-auto/utils';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    interval: '',
    icon: Shield,
    iconColor: 'text-white/50',
    iconBg: 'bg-white/[0.07]',
    description: 'Get started with basic features',
    features: [
      '5 active listings',
      'Basic profile page',
      'Standard placement',
      'Contact form',
      'WhatsApp button',
    ],
    missing: [
      'Analytics dashboard',
      'Priority placement',
      'Featured badge',
      'Premium support',
    ],
    cta: 'Current Plan',
    ctaDisabled: true,
    highlight: false,
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 29,
    interval: '/mo',
    icon: Zap,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-400/10',
    description: 'Perfect for growing dealerships',
    features: [
      '20 active listings',
      'Enhanced profile',
      'Improved search ranking',
      'Contact form + WhatsApp',
      'Basic analytics (views, clicks)',
      'Verified badge',
    ],
    missing: [
      'Priority placement',
      'Full analytics suite',
      'Premium support',
    ],
    cta: 'Upgrade to Starter',
    ctaDisabled: false,
    highlight: false,
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 79,
    interval: '/mo',
    icon: BarChart2,
    iconColor: 'text-[#c9a84c]',
    iconBg: 'bg-[#c9a84c]/10',
    description: 'Most popular for serious dealers',
    features: [
      '100 active listings',
      'Full showroom page',
      'Priority search placement',
      'Full analytics dashboard',
      'Lead tracking & CRM',
      'Gold dealer badge',
      'Featured on homepage',
      'Priority support',
    ],
    missing: [],
    cta: 'Upgrade to Business',
    ctaDisabled: false,
    highlight: true,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 199,
    interval: '/mo',
    icon: Crown,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-400/10',
    description: 'Unlimited scale, white-glove service',
    features: [
      'Unlimited listings',
      'Custom showroom branding',
      'API access',
      'Advanced analytics + export',
      'Dedicated account manager',
      'Platinum dealer badge',
      'Top homepage placement',
      'White-label options',
      'Custom domain support',
    ],
    missing: [],
    cta: 'Contact Sales',
    ctaDisabled: false,
    highlight: false,
  },
] as const;

export default function DealerSubscriptionPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const yearlyDiscount = 0.2; // 20% off

  const handleUpgrade = async (planId: string) => {
    if (planId === 'ENTERPRISE') {
      window.location.href = 'mailto:sales@carsauto.com?subject=Enterprise Plan Inquiry';
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval: billing }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-5xl">

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c] text-xs font-semibold uppercase tracking-widest">
          <Zap className="w-3 h-3" /> Dealer Plans
        </div>
        <h1 className="font-display font-black text-white text-3xl">Grow Your Dealership</h1>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Choose the plan that fits your business. Upgrade, downgrade or cancel anytime.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.09] mt-2">
          {(['monthly', 'yearly'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize',
                billing === b
                  ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                  : 'text-white/50 hover:text-white/70',
              )}
            >
              {b}
              {b === 'yearly' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[0.6rem] font-bold">
                  -20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map(plan => {
          const price = billing === 'yearly'
            ? Math.round(plan.price * (1 - yearlyDiscount))
            : plan.price;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl border overflow-hidden transition-all',
                plan.highlight
                  ? 'bg-gradient-to-b from-[#c9a84c]/[0.07] to-[#0d1b2e] border-[#c9a84c]/40 shadow-[0_0_40px_rgba(201,168,76,0.1)]'
                  : 'bg-[#0d1b2e] border-white/[0.08]',
              )}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
              )}

              {plan.highlight && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] rounded-b-lg text-[0.62rem] font-black text-[#0d1b2e] uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className="p-5 flex flex-col gap-4 flex-1 pt-7">
                {/* Icon + name */}
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', plan.iconBg)}>
                    <plan.icon className={cn('w-5 h-5', plan.iconColor)} />
                  </div>
                  <div>
                    <div className="font-display font-black text-white text-base">{plan.name}</div>
                    <div className="text-[0.68rem] text-white/40">{plan.description}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-white">${price}</span>
                  <span className="text-sm text-white/40 mb-1">{plan.interval}</span>
                  {billing === 'yearly' && plan.price > 0 && (
                    <span className="text-xs text-white/30 line-through mb-1 ml-1">${plan.price}</span>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1 space-y-2">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2 text-sm text-white/70">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </div>
                  ))}
                  {plan.missing.map(f => (
                    <div key={f} className="flex items-start gap-2 text-sm text-white/25 line-through">
                      <div className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 rounded-full border border-white/15" />
                      {f}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.ctaDisabled || loading === plan.id}
                  className={cn(
                    'w-full py-3 rounded-xl text-sm font-bold transition-all',
                    plan.ctaDisabled
                      ? 'bg-white/[0.05] text-white/30 cursor-default border border-white/[0.06]'
                      : plan.highlight
                      ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] hover:opacity-90'
                      : 'bg-white/[0.07] text-white border border-white/[0.1] hover:bg-white/[0.12]',
                    loading === plan.id && 'opacity-60',
                  )}
                >
                  {loading === plan.id ? 'Redirecting…' : plan.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ strip */}
      <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          {[
            { q: 'Can I cancel anytime?',    a: 'Yes — cancel at any time from your dashboard. No lock-in contracts.' },
            { q: 'What payment methods?',    a: 'We accept all major credit cards, PayPal, and regional payment options.' },
            { q: 'Can I switch plans later?', a: 'Absolutely. Upgrade or downgrade instantly. Billing is prorated.' },
          ].map(({ q, a }) => (
            <div key={q}>
              <div className="font-semibold text-white mb-1">{q}</div>
              <div className="text-white/40 text-xs leading-relaxed">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
