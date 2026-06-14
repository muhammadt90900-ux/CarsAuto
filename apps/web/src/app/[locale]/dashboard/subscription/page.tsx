'use client';
// apps/web/src/app/[locale]/dashboard/subscription/page.tsx

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Check, Zap, Crown, Star, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { PaymentMethodSelector, GatewayId, UserCountry } from '@/components/features/payments/PaymentMethodSelector';
import { AsiaHawalaOTPModal } from '@/components/features/payments/AsiaHawalaOTPModal';

// ─── Plan data ────────────────────────────────────────────────────────────────
type PlanId = 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

const PLANS = [
  {
    id: 'BASIC' as PlanId,
    icon: Star,
    accent: 'text-gray-400',
    border: 'border-gray-200 dark:border-white/10',
    badge: null,
    label:    { ku: 'بنەڕەتی',  ar: 'أساسي',    en: 'Basic',      zh: '基础版' },
    priceUSD: 19.99,
    priceIQD: 26_000,
    features: {
      ku: ['تا ٣ ئەلانکاری', 'ئانالیزی بنەڕەتی', 'پشتیوانی ئیمەیڵ'],
      en: ['Up to 3 listings', 'Basic analytics', 'Email support'],
      ar: ['حتى 3 إعلانات', 'تحليلات أساسية', 'دعم البريد الإلكتروني'],
      zh: ['最多3个列表', '基础数据分析', '邮件支持'],
    },
  },
  {
    id: 'PREMIUM' as PlanId,
    icon: Zap,
    accent: 'text-[#c9a84c]',
    border: 'border-[#c9a84c]/40',
    badge: 'mostPopular',
    label:    { ku: 'پریمیەم',   ar: 'مميز',     en: 'Premium',    zh: '高级版' },
    priceUSD: 49.99,
    priceIQD: 65_000,
    features: {
      ku: ['تا ٢٠ ئەلانکاری', 'ئانالیزی پێشکەوتوو', 'پشتیوانی لەپێشەوە', 'ئەلانکاری تایبەت'],
      en: ['Up to 20 listings', 'Advanced analytics', 'Priority support', 'Featured listings'],
      ar: ['حتى 20 إعلان', 'تحليلات متقدمة', 'دعم مميز', 'إعلانات مميزة'],
      zh: ['最多20个列表', '高级数据分析', '优先支持', '精选列表'],
    },
  },
  {
    id: 'ENTERPRISE' as PlanId,
    icon: Crown,
    accent: 'text-amber-500',
    border: 'border-amber-300/40 dark:border-amber-500/20',
    badge: 'bestValue',
    label:    { ku: 'ئینتەرپرایز', ar: 'مؤسسي', en: 'Enterprise', zh: '企业版' },
    priceUSD: 99.99,
    priceIQD: 130_000,
    features: {
      ku: ['ئەلانکاری نامەحدود', 'هەموو تایبەتمەندیەکان', 'پشتیوانی ٢٤/٧', 'دەستگەیشتن بە API'],
      en: ['Unlimited listings', 'All Premium features', '24/7 support', 'API access'],
      ar: ['إعلانات غير محدودة', 'كل مزايا المميز', 'دعم 24/7', 'وصول API'],
      zh: ['无限列表', '所有高级功能', '24/7支持', 'API访问'],
    },
  },
] as const;

function detectCountry(profile: any): UserCountry {
  const loc = String(profile?.location ?? '').toLowerCase();
  if (loc.includes('iraq') || loc.includes('عێراق') || loc.includes('kurdistan') || loc.includes('كوردستان')) return 'IQ';
  if (loc.includes('uae') || loc.includes('dubai') || loc.includes('دوبەی')) return 'AE';
  if (loc.includes('china') || loc.includes('چین')) return 'CN';
  return 'IQ'; // default for CarsAuto market
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const locale = useLocale();
  const t      = useTranslations('dashboard');
  const isRtl  = locale === 'ku' || locale === 'ar';
  const lang   = ['ku', 'ar', 'en', 'zh'].includes(locale) ? locale : 'en';

  const [selectedPlan,    setSelectedPlan]    = useState<PlanId | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<GatewayId>('zaincash');
  const [showOtpModal,    setShowOtpModal]    = useState(false);
  const [paymentError,    setPaymentError]    = useState('');
  const [paymentSuccess,  setPaymentSuccess]  = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/payments/subscription').then((r) => r.data),
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/users/me').then((r) => r.data),
  });

  const country  = detectCountry(profile);
  const currency = country === 'IQ' ? 'IQD' : 'USD';

  const payMutation = useMutation({
    mutationFn: async (planId: PlanId) => {
      const res = await api.post('/payments/intent', {
        plan: planId,
        currency,
        gateway: selectedGateway,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.clientSecret) {
        // Stripe.js integration point — simplified here
        setPaymentSuccess(true);
      }
    },
    onError: (err: any) => {
      setPaymentError(err?.response?.data?.message ?? (locale === 'ku' ? 'هەڵەیەک ڕووی دا' : 'Payment failed'));
    },
  });

  function handleSelectPlan(planId: PlanId) {
    setSelectedPlan(planId);
    setPaymentError('');
    setPaymentSuccess(false);
  }

  function handlePayNow() {
    if (!selectedPlan) return;
    setPaymentError('');
    if (selectedGateway === 'asiahawala') { setShowOtpModal(true); return; }
    payMutation.mutate(selectedPlan);
  }

  const currentPlan = subscription?.plan ?? null;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="p-5 lg:p-7 space-y-7 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          {t('subscription')}
        </h1>
        {currentPlan && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('currentPlan')}:{' '}
            <span className="font-semibold text-[#c9a84c]">{currentPlan}</span>
          </p>
        )}
        {subscription?.currentPeriodEnd && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
            <Calendar className="w-3.5 h-3.5" aria-hidden />
            {locale === 'ku' ? 'بەرواری بەسەرچوون' : 'Renews'}:{' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Success */}
      {paymentSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-hidden />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {locale === 'ku' ? 'بەرپرسیارێتیەکەت چالاک بوو!' : 'Subscription activated successfully!'}
          </p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map(({ id, icon: Icon, accent, border, badge, label, priceUSD, priceIQD, features }) => {
          const isCurrent  = id === currentPlan;
          const isSelected = selectedPlan === id;
          const planName   = label[lang as keyof typeof label] ?? label.en;
          const featureList = features[lang as keyof typeof features] ?? features.en;
          const price      = currency === 'IQD' ? priceIQD : priceUSD;
          const priceLabel = currency === 'IQD'
            ? `${price.toLocaleString()} ${locale === 'ku' || locale === 'ar' ? 'د.ع' : 'IQD'}`
            : `$${price}`;

          return (
            <div
              key={id}
              onClick={() => !isCurrent && handleSelectPlan(id)}
              className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all duration-200 ${
                isSelected ? 'border-[#c9a84c] bg-[#c9a84c]/5 dark:bg-[#c9a84c]/10 cursor-pointer' :
                isCurrent  ? `${border} bg-white dark:bg-[#0b1525] cursor-default` :
                             `${border} bg-white/60 dark:bg-white/[0.02] hover:border-gray-300 cursor-pointer`
              }`}
            >
              {badge && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded-full bg-[#e94560] text-white whitespace-nowrap">
                  {t(badge)}
                </span>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gray-100 dark:bg-white/5">
                <Icon className={`w-5 h-5 ${accent}`} aria-hidden />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">{planName}</h3>
              <div className="mt-2 mb-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {priceLabel}
                  <span className="text-sm font-normal text-gray-400 ms-1">{t('perMonth')}</span>
                </p>
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {(featureList as readonly string[]).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all duration-200 ${
                isCurrent   ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-default' :
                isSelected  ? 'bg-[#c9a84c] text-white shadow-[0_4px_16px_rgba(201,168,76,0.25)]' :
                              'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'
              }`}>
                {isCurrent ? t('currentPlanBadge') : isSelected ? (locale === 'ku' ? '✓ هەڵبژێردراو' : '✓ Selected') : t('getStarted')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment method + Pay button — only shown when a plan is picked */}
      {selectedPlan && !paymentSuccess && (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-5 bg-white dark:bg-white/[0.02] space-y-5">
          <PaymentMethodSelector
            country={country}
            selected={selectedGateway}
            onSelect={setSelectedGateway}
          />

          {paymentError && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
              {paymentError}
            </div>
          )}

          <button
            onClick={handlePayNow}
            disabled={payMutation.isPending}
            className="w-full py-3.5 rounded-xl bg-[#c9a84c] text-white text-sm font-bold hover:bg-[#b8943c] transition-colors disabled:opacity-60 shadow-[0_4px_20px_rgba(201,168,76,0.3)] flex items-center justify-center gap-2"
          >
            {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {locale === 'ku' ? 'ئێستا پارەدە' : locale === 'ar' ? 'ادفع الآن' : 'Pay Now'}
          </button>
        </div>
      )}

      {/* AsiaHawala OTP modal */}
      {showOtpModal && selectedPlan && (
        <AsiaHawalaOTPModal
          plan={selectedPlan}
          onClose={() => setShowOtpModal(false)}
          onSuccess={(pid) => {
            setShowOtpModal(false);
            setPaymentSuccess(true);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}
