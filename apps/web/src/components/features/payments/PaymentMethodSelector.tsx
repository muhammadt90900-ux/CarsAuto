'use client';
// apps/web/src/components/features/payments/PaymentMethodSelector.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows available gateways based on user country.
// IQ → ZainCash, FastPay, QiCard, AsiaHawala, Stripe
// AE → Stripe, Apple Pay, Google Pay (all via Stripe Elements)
// CN → Alipay (coming soon), WeChat Pay (coming soon), Stripe
// OTHER → Stripe
// ─────────────────────────────────────────────────────────────────────────────

import { useLocale } from 'next-intl';
import { Check, Clock, AlertCircle } from 'lucide-react';

export type GatewayId =
  | 'zaincash'
  | 'fastpay'
  | 'qicard'
  | 'asiahawala'
  | 'stripe'
  | 'alipay'
  | 'wechatpay';

export type UserCountry = 'IQ' | 'AE' | 'CN' | 'OTHER';

interface Option {
  id: GatewayId;
  label: Record<string, string>;
  badge?: { label: Record<string, string>; color: string };
  time: Record<string, string>;
  logo: React.ReactNode;
  /** If true, renders greyed-out with "Coming Soon" badge — not selectable */
  comingSoon?: boolean;
}

// ── Inline SVG logos ──────────────────────────────────────────────────────────
const Logo = ({
  bg,
  text,
  sub,
  opacity = 1,
}: {
  bg: string;
  text: string;
  sub?: string;
  opacity?: number;
}) => (
  <svg
    width="44"
    height="26"
    viewBox="0 0 44 26"
    fill="none"
    aria-hidden
    style={{ opacity }}
  >
    <rect width="44" height="26" rx="5" fill={bg} />
    <text
      x="4"
      y="14"
      fill="white"
      fontSize="9"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      {text}
    </text>
    {sub && (
      <text
        x="4"
        y="23"
        fill="rgba(255,255,255,0.65)"
        fontSize="6.5"
        fontFamily="sans-serif"
      >
        {sub}
      </text>
    )}
  </svg>
);

// ── Alipay logo SVG ───────────────────────────────────────────────────────────
const AlipayLogo = ({ opacity = 1 }: { opacity?: number }) => (
  <svg
    width="44"
    height="26"
    viewBox="0 0 44 26"
    fill="none"
    aria-hidden
    style={{ opacity }}
  >
    <rect width="44" height="26" rx="5" fill="#1677FF" />
    <text x="4" y="16" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
      支付宝
    </text>
    <text x="24" y="16" fill="rgba(255,255,255,0.7)" fontSize="6" fontFamily="sans-serif">
      Alipay
    </text>
  </svg>
);

// ── WeChat Pay logo SVG ───────────────────────────────────────────────────────
const WechatLogo = ({ opacity = 1 }: { opacity?: number }) => (
  <svg
    width="44"
    height="26"
    viewBox="0 0 44 26"
    fill="none"
    aria-hidden
    style={{ opacity }}
  >
    <rect width="44" height="26" rx="5" fill="#07C160" />
    <text x="3" y="12" fill="white" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">
      微信支付
    </text>
    <text x="3" y="22" fill="rgba(255,255,255,0.75)" fontSize="6" fontFamily="sans-serif">
      WeChat Pay
    </text>
  </svg>
);

// AUDIT FIX (M4): the "Coming Soon" i18n object previously appeared three
// times (once per Alipay badge, once per WeChat Pay badge, once as the
// standalone comingSoonLabel used for the pill text) — copy drift risk if
// one occurrence gets edited during a wording pass and the others don't.
// Single shared constant now; all three usages reference it.
const COMING_SOON_LABEL: Record<string, string> = {
  ku: 'بەزووی دێت',
  ar: 'قريباً',
  en: 'Coming Soon',
  zh: '即将推出',
};

const OPTIONS: Option[] = [
  // ── Iraqi gateways ──────────────────────────────────────────────────────────
  {
    id: 'zaincash',
    label: { ku: 'زەینکاش', ar: 'زين كاش', en: 'ZainCash', zh: 'ZainCash' },
    badge: {
      label: { ku: 'دینار عێراقی', ar: 'دينار عراقي', en: 'IQD', zh: 'IQD' },
      color:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    time: { ku: '~١ خولەک', ar: '~١ دقيقة', en: '~1 min', zh: '约1分钟' },
    logo: <Logo bg="#00A651" text="ZAIN" sub="cash" />,
  },
  {
    id: 'fastpay',
    label: { ku: 'فاستپەی', ar: 'فاست باي', en: 'FastPay', zh: 'FastPay' },
    badge: {
      label: { ku: 'کوردستان', ar: 'كوردستان', en: 'Kurdistan', zh: '库尔德' },
      color: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
    },
    time: { ku: '~١ خولەک', ar: '~١ دقيقة', en: '~1 min', zh: '约1分钟' },
    logo: <Logo bg="#009944" text="FAST" sub="PAY" />,
  },
  {
    id: 'qicard',
    label: { ku: 'کارتی Qi', ar: 'بطاقة Qi', en: 'QiCard', zh: 'QiCard' },
    time: { ku: '٢-٣ خولەک', ar: '٢-٣ دقائق', en: '2–3 min', zh: '2-3分钟' },
    logo: <Logo bg="#1A237E" text="Qi" sub="CARD" />,
  },
  {
    id: 'asiahawala',
    label: {
      ku: 'ئەسیا حەوالە',
      ar: 'آسيا حوالة',
      en: 'AsiaHawala',
      zh: 'AsiaHawala',
    },
    badge: {
      label: {
        ku: 'مۆبایل',
        ar: 'محفظة',
        en: 'Mobile Wallet',
        zh: '手机钱包',
      },
      color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    },
    time: {
      ku: '٢-٥ خولەک (OTP)',
      ar: '٢-٥ دقائق (OTP)',
      en: '2–5 min (OTP)',
      zh: '2-5分钟 (OTP)',
    },
    logo: <Logo bg="#E53935" text="ASIA" sub="HAWALA" />,
  },
  // ── International / Stripe ──────────────────────────────────────────────────
  {
    id: 'stripe',
    label: {
      ku: 'کارتی نێودەوڵەتی',
      ar: 'بطاقة دولية',
      en: 'International Card',
      zh: '国际信用卡',
    },
    time: { ku: '~١ خولەک', ar: '~١ دقيقة', en: '~1 min', zh: '约1分钟' },
    logo: <Logo bg="#635BFF" text="stripe" />,
  },
  // ── Chinese gateways (stubs) ────────────────────────────────────────────────
  {
    id: 'alipay',
    label: { ku: 'ئەلیپەی', ar: 'علي باي', en: 'Alipay', zh: '支付宝' },
    badge: {
      label: COMING_SOON_LABEL,
      color: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400',
    },
    time: { ku: 'بەزووی', ar: 'قريباً', en: 'Coming soon', zh: '即将开放' },
    logo: <AlipayLogo opacity={0.45} />,
    comingSoon: true,
  },
  {
    id: 'wechatpay',
    label: { ku: 'ویچات پەی', ar: 'ويتشات باي', en: 'WeChat Pay', zh: '微信支付' },
    badge: {
      label: COMING_SOON_LABEL,
      color: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400',
    },
    time: { ku: 'بەزووی', ar: 'قريباً', en: 'Coming soon', zh: '即将开放' },
    logo: <WechatLogo opacity={0.45} />,
    comingSoon: true,
  },
];

const BY_COUNTRY: Record<UserCountry, GatewayId[]> = {
  IQ: ['zaincash', 'fastpay', 'qicard', 'asiahawala', 'stripe'],
  AE: ['stripe'],
  CN: ['alipay', 'wechatpay', 'stripe'],
  OTHER: ['stripe'],
};

interface Props {
  country: UserCountry;
  selected: GatewayId;
  onSelect: (g: GatewayId) => void;
}

export function PaymentMethodSelector({ country, selected, onSelect }: Props) {
  const locale = useLocale();
  const isRtl = locale === 'ku' || locale === 'ar';
  const lang = (['ku', 'ar', 'en', 'zh'] as const).includes(locale as never)
    ? (locale as 'ku' | 'ar' | 'en' | 'zh')
    : 'en';

  const options = BY_COUNTRY[country].map((id) =>
    OPTIONS.find((o) => o.id === id)!,
  );

  const heading: Record<string, string> = {
    ku: 'شێوازی پارەدان',
    ar: 'طريقة الدفع',
    en: 'Payment Method',
    zh: '支付方式',
  };

  const comingSoonLabel = COMING_SOON_LABEL;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {heading[lang]}
      </p>

      {options.map((opt) => {
        const isSelected = !opt.comingSoon && selected === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            disabled={opt.comingSoon}
            onClick={() => !opt.comingSoon && onSelect(opt.id)}
            aria-disabled={opt.comingSoon}
            className={[
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-150 text-start',
              opt.comingSoon
                ? 'border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.01] opacity-60 cursor-not-allowed'
                : isSelected
                ? 'border-[var(--gold)] bg-[rgba(201,168,76,0.05)] dark:bg-[var(--gold-subtle)]'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20',
            ].join(' ')}
          >
            {/* Logo */}
            <div className="flex-shrink-0">{opt.logo}</div>

            {/* Label + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`text-sm font-semibold ${
                    opt.comingSoon
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {opt.label[lang] ?? opt.label['en']}
                </span>

                {/* Coming soon pill */}
                {opt.comingSoon && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500">
                    <AlertCircle className="w-2.5 h-2.5" aria-hidden />
                    {comingSoonLabel[lang]}
                  </span>
                )}

                {/* Regular badge (IQD, Kurdistan, Mobile Wallet…) */}
                {!opt.comingSoon && opt.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${opt.badge.color}`}
                  >
                    {opt.badge.label[lang] ?? opt.badge.label['en']}
                  </span>
                )}
              </div>

              {/* Estimated time */}
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-gray-400" aria-hidden />
                <span className="text-[11px] text-gray-400">
                  {opt.time[lang] ?? opt.time['en']}
                </span>
              </div>
            </div>

            {/* Selection indicator — hidden for coming-soon options */}
            {!opt.comingSoon && (
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected
                    ? 'border-[var(--gold)] bg-[var(--gold)]'
                    : 'border-gray-300 dark:border-white/20'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" aria-hidden />}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
