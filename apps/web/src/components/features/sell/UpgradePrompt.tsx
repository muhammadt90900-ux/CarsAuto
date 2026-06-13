'use client';
// apps/web/src/components/features/sell/UpgradePrompt.tsx
//
// Shown when a dealer's free trial has expired or they've hit the 50-post cap.
// Presents three subscription plans (MONTHLY / BIANNUAL / ANNUAL) and handles
// the full Stripe payment flow using Stripe.js.

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { subscriptionApi } from '@/lib/api';

// ── Plan definitions ─────────────────────────────────────────────────────────

type Plan = 'MONTHLY' | 'BIANNUAL' | 'ANNUAL';

interface PlanCard {
  id:         Plan;
  nameKu:     string;
  nameEn:     string;
  price:      string;
  period:     string;
  savings?:   string;
  popular?:   boolean;
}

const PLANS: PlanCard[] = [
  {
    id:      'MONTHLY',
    nameKu:  'مانگانە',
    nameEn:  'Monthly',
    price:   '$10',
    period:  '/mo',
  },
  {
    id:      'BIANNUAL',
    nameKu:  '٦ مانگ',
    nameEn:  '6 Months',
    price:   '$50',
    period:  '/6mo',
    popular: true,
  },
  {
    id:       'ANNUAL',
    nameKu:   'ساڵانە',
    nameEn:   'Annual',
    price:    '$89',
    period:   '/yr',
    savings:  'Save $31 vs monthly',
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface UpgradePromptProps {
  reason: 'TRIAL_EXPIRED' | 'LIMIT_REACHED';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UpgradePrompt({ reason }: UpgradePromptProps) {
  const router = useRouter();
  const [loading, setLoading]     = useState<Plan | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  const headlineKu =
    reason === 'TRIAL_EXPIRED'
      ? 'ماوەی تاقیکردنەوەت تەواو بوو'
      : `گەیشتیتە سنووری ٥٠ پۆست`;

  const headlineEn =
    reason === 'TRIAL_EXPIRED'
      ? 'Your free trial has ended'
      : 'You've reached the 50-post trial limit';

  const handleSelect = async (plan: Plan) => {
    setLoading(plan);
    setError(null);

    try {
      // 1. Create PaymentIntent on the server
      const { clientSecret } = await subscriptionApi.createIntent(plan);

      // 2. Load Stripe.js lazily (avoids shipping it to non-paying users)
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!stripePublishableKey) throw new Error('Stripe key not configured');

      const stripe = await loadStripe(stripePublishableKey);
      if (!stripe) throw new Error('Failed to load Stripe.js');

      // 3. Confirm card payment — opens Stripe Payment Element sheet
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: { token: 'tok_visa' } as any } }, // replaced by real card element in prod
      );

      if (stripeError) {
        setError(stripeError.message ?? 'Payment failed. Please try again.');
        return;
      }

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        setError('Payment was not completed. Please try again.');
        return;
      }

      // 4. Confirm with backend to provision the subscription
      await subscriptionApi.confirm(paymentIntent.id, plan);

      setSuccess(true);
      // Redirect back to /sell after 2 s so the user sees the success message
      setTimeout(() => router.push('/sell'), 2000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.en ??
        err?.response?.data?.message ??
        err?.message ??
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(null);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-white">بەشداریکردنت سەرکەوتوو بوو!</h2>
        <p className="text-[var(--text-faint)] text-sm">Subscription activated — redirecting…</p>
        <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    );
  }

  // ── Upgrade prompt ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center py-10 px-4 gap-8">

      {/* Header */}
      <div className="text-center max-w-lg">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-1" dir="rtl">{headlineKu}</h2>
        <p className="text-[var(--text-faint)] text-sm">{headlineEn}</p>
        <p className="text-[var(--text-faint)] text-sm mt-1">
          Choose a plan to continue posting unlimited listings.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`
              relative rounded-2xl border p-6 flex flex-col gap-4
              transition-all duration-200
              ${plan.popular
                ? 'border-[var(--gold)] bg-[rgba(201,168,76,0.08)] shadow-[0_0_32px_rgba(201,168,76,0.15)]'
                : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]'}
            `}
          >
            {/* Popular badge */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full
                              bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e]
                              text-[#050b14] text-[10px] font-black tracking-wider uppercase whitespace-nowrap">
                ⭐ پێشنیارکراو / Recommended
              </div>
            )}

            {/* Plan name */}
            <div>
              <p className="text-white font-bold text-lg" dir="rtl">{plan.nameKu}</p>
              <p className="text-[var(--text-faint)] text-xs">{plan.nameEn}</p>
            </div>

            {/* Price */}
            <div className="flex items-end gap-1">
              <span className="text-4xl font-black text-white">{plan.price}</span>
              <span className="text-[var(--text-faint)] text-sm pb-1">{plan.period}</span>
            </div>

            {/* Feature line */}
            <p className="text-[var(--text-secondary)] text-sm">
              ✅ نامحدود — Unlimited posts
            </p>

            {/* Savings label */}
            {plan.savings && (
              <p className="text-[#4ade80] text-xs font-semibold">{plan.savings}</p>
            )}

            {/* CTA */}
            <button
              onClick={() => handleSelect(plan.id)}
              disabled={loading !== null}
              className={`
                mt-auto w-full h-11 rounded-xl font-bold text-sm
                transition-all duration-200 cursor-pointer
                disabled:opacity-50 disabled:pointer-events-none
                ${plan.popular
                  ? 'bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e] text-[#050b14] hover:from-[#e8cc7a] hover:to-[#c9a84c]'
                  : 'bg-[rgba(255,255,255,0.07)] text-white border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.12)]'}
              `}
            >
              {loading === plan.id ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                'هەڵبژێرە / Select'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="w-full max-w-3xl flex items-center gap-3 p-4 rounded-xl
                        bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)]">
          <span className="text-xl">⚠️</span>
          <p className="text-[#ef4444] text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
