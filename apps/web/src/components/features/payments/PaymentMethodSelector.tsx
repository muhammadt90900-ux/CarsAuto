'use client';
// apps/web/src/components/features/payments/PaymentMethodSelector.tsx

import { useLocale } from 'next-intl';
import { Check, Clock } from 'lucide-react';

export type GatewayId = 'zaincash' | 'fastpay' | 'qicard' | 'asiahawala' | 'stripe';
export type UserCountry = 'IQ' | 'AE' | 'CN' | 'OTHER';

interface Option {
  id: GatewayId;
  label: Record<string, string>;
  badge?: { label: Record<string, string>; color: string };
  time: Record<string, string>;
  logo: React.ReactNode;
}

interface Props {
  country: UserCountry;
  selected: GatewayId;
  onSelect: (g: GatewayId) => void;
}

// ── Inline SVG logos ──────────────────────────────────────────────────────────
const Logo = ({ bg, text, sub }: { bg: string; text: string; sub?: string }) => (
  <svg width="44" height="26" viewBox="0 0 44 26" fill="none" aria-hidden>
    <rect width="44" height="26" rx="5" fill={bg} />
    <text x="4" y="14" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">{text}</text>
    {sub && <text x="4" y="23" fill="rgba(255,255,255,0.65)" fontSize="6.5" fontFamily="sans-serif">{sub}</text>}
  </svg>
);

const OPTIONS: Option[] = [
  {
    id: 'zaincash',
    label: { ku: 'زەینکاش', ar: 'زين كاش', en: 'ZainCash', zh: 'ZainCash' },
    badge: { label: { ku: 'دینار عێراقی', ar: 'دينار عراقي', en: 'IQD', zh: 'IQD' }, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
    time: { ku: '~١ خولەک', en: '~1 min' },
    logo: <Logo bg="#00A651" text="ZAIN" sub="cash" />,
  },
  {
    id: 'fastpay',
    label: { ku: 'فاستپەی', ar: 'فاست باي', en: 'FastPay', zh: 'FastPay' },
    badge: { label: { ku: 'کوردستان', ar: 'كوردستان', en: 'Kurdistan', zh: 'Kurdistan' }, color: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
    time: { ku: '~١ خولەک', en: '~1 min' },
    logo: <Logo bg="#009944" text="FAST" sub="PAY" />,
  },
  {
    id: 'qicard',
    label: { ku: 'کارتی Qi', ar: 'بطاقة Qi', en: 'QiCard', zh: 'QiCard' },
    time: { ku: '٢-٣ خولەک', en: '2–3 min' },
    logo: <Logo bg="#1A237E" text="Qi" sub="CARD" />,
  },
  {
    id: 'asiahawala',
    label: { ku: 'ئەسیا حەوالە', ar: 'آسيا حوالة', en: 'AsiaHawala', zh: 'AsiaHawala' },
    badge: { label: { ku: 'مۆبایل', ar: 'محفظة', en: 'Mobile Wallet', zh: '手机钱包' }, color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
    time: { ku: '٢-٥ خولەک (OTP)', en: '2–5 min (OTP)' },
    logo: <Logo bg="#E53935" text="ASIA" sub="HAWALA" />,
  },
  {
    id: 'stripe',
    label: { ku: 'کارتی نێودەوڵەتی', ar: 'بطاقة دولية', en: 'International Card', zh: '国际信用卡' },
    time: { ku: '~١ خولەک', en: '~1 min' },
    logo: <Logo bg="#635BFF" text="stripe" />,
  },
];

const BY_COUNTRY: Record<UserCountry, GatewayId[]> = {
  IQ:    ['zaincash', 'fastpay', 'qicard', 'asiahawala', 'stripe'],
  AE:    ['stripe'],
  CN:    ['stripe'],
  OTHER: ['stripe'],
};

export function PaymentMethodSelector({ country, selected, onSelect }: Props) {
  const locale = useLocale();
  const isRtl  = locale === 'ku' || locale === 'ar';
  const lang   = ['ku', 'ar', 'en', 'zh'].includes(locale) ? locale : 'en';

  const options = BY_COUNTRY[country].map((id) => OPTIONS.find((o) => o.id === id)!);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {locale === 'ku' ? 'شێوازی پارەدان' : locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
      </p>

      {options.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-150 text-start ${
              isSelected
                ? 'border-[#c9a84c] bg-[#c9a84c]/5 dark:bg-[#c9a84c]/10'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20'
            }`}
          >
            <div className="flex-shrink-0">{opt.logo}</div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {opt.label[lang] ?? opt.label['en']}
                </span>
                {opt.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${opt.badge.color}`}>
                    {opt.badge.label[lang] ?? opt.badge.label['en']}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-gray-400" aria-hidden />
                <span className="text-[11px] text-gray-400">
                  {lang === 'ku' ? opt.time['ku'] : opt.time['en']}
                </span>
              </div>
            </div>

            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              isSelected ? 'border-[#c9a84c] bg-[#c9a84c]' : 'border-gray-300 dark:border-white/20'
            }`}>
              {isSelected && <Check className="w-3 h-3 text-white" aria-hidden />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
