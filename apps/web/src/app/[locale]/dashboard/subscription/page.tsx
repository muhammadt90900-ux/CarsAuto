'use client';
// app/[locale]/dashboard/subscription/page.tsx — Fully localized

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Zap, Crown, Star, CreditCard, Calendar } from 'lucide-react';

export default function SubscriptionPage() {
  const t = useTranslations('dashboard');

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [current, setCurrent] = useState('basic');

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: { monthly: 0, yearly: 0 },
      icon: Star,
      accent: 'text-gray-500',
      border: 'border-gray-200 dark:border-white/10',
      badge: null,
      featuresEn: ['Up to 3 listings', 'Basic analytics', 'Email support', 'Standard visibility'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: { monthly: 19, yearly: 15 },
      icon: Zap,
      accent: 'text-[#c9a84c]',
      border: 'border-[#c9a84c]/40',
      badge: t('mostPopular'),
      featuresEn: ['Up to 20 listings', 'Advanced analytics', 'Priority support', 'Featured listings', 'WhatsApp integration', 'Custom profile badge'],
    },
    {
      id: 'elite',
      name: 'Elite',
      price: { monthly: 49, yearly: 39 },
      icon: Crown,
      accent: 'text-amber-500',
      border: 'border-amber-300/40 dark:border-amber-500/20',
      badge: t('bestValue'),
      featuresEn: ['Unlimited listings', 'Full analytics suite', '24/7 dedicated support', 'Top placement', 'All Pro features', 'Team access (3 seats)', 'API access'],
    },
  ];

  const discount = Math.round((1 - 15 / 19) * 100);

  return (
    <div className="p-5 lg:p-7 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('subscription')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('currentPlan')}: <span className="font-semibold capitalize">{current}</span></p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('monthly')}</span>
        <button
          onClick={() => setBillingCycle((c) => c === 'monthly' ? 'yearly' : 'monthly')}
          role="switch"
          aria-checked={billingCycle === 'yearly'}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${billingCycle === 'yearly' ? 'bg-[#c9a84c]' : 'bg-gray-200 dark:bg-white/10'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${billingCycle === 'yearly' ? 'start-6' : 'start-0.5'}`} />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('yearly')}</span>
        {billingCycle === 'yearly' && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            {t('savePercent', { percent: discount })}
          </span>
        )}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map(({ id, name, price, icon: Icon, accent, border, badge, featuresEn }) => {
          const isCurrent = id === current;
          const priceVal = price[billingCycle];
          return (
            <div
              key={id}
              className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all duration-200 ${border} ${isCurrent ? 'bg-white dark:bg-[#0b1525]' : 'bg-white/60 dark:bg-white/[0.02]'}`}
            >
              {badge && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded-full bg-[#e94560] text-white whitespace-nowrap">
                  {badge}
                </span>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gray-100 dark:bg-white/5`}>
                <Icon className={`w-5 h-5 ${accent}`} aria-hidden />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">{name}</h3>
              <div className="mt-2 mb-4">
                {priceVal === 0 ? (
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">Free</p>
                ) : (
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${priceVal}
                    <span className="text-sm font-normal text-gray-400">{t('perMonth')}</span>
                  </p>
                )}
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {featuresEn.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setCurrent(id)}
                disabled={isCurrent}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isCurrent
                    ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-default'
                    : 'bg-[#c9a84c] text-white hover:bg-[#b8943c] shadow-[0_4px_16px_rgba(201,168,76,0.25)] hover:shadow-[0_6px_24px_rgba(201,168,76,0.35)]'
                }`}
              >
                {isCurrent ? t('currentPlanBadge') : t('getStarted')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
