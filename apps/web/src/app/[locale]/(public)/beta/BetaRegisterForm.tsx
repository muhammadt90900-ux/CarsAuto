'use client';
// apps/web/src/app/[locale]/(public)/beta/BetaRegisterForm.tsx
//
// "Coming Soon / Join Beta" landing page content + registration form.
// Client component (form state, copy-to-clipboard, referral-code capture).
// Reuses the existing UI kit (Button/Input/Card/Badge), design tokens, and
// the react-hook-form + zod pattern already established in LoginForm /
// auth.schema.ts — no new form library or component system introduced.

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import {
  Rocket, CheckCircle2, Copy, Check, Sparkles, Users2, Gauge,
  ClipboardList, PhoneCall, Building2, User, MapPin, Facebook, Globe,
  StickyNote, PartyPopper, ArrowRight, RotateCcw, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { betaApi } from '@/lib/api';
import { ALL_CITIES } from '@/lib/locations';
import { ListingType, type BetaRegistration } from '@cars-auto/types';
import { betaRegistrationSchema, type BetaRegistrationFormValues } from '@/lib/validation/beta.schema';

const BUSINESS_TYPES: { value: ListingType; labelKey: string }[] = [
  { value: ListingType.CAR,         labelKey: 'businessTypeCar' },
  { value: ListingType.MOTORCYCLE,  labelKey: 'businessTypeMotorcycle' },
  { value: ListingType.SPARE_PART,  labelKey: 'businessTypeSparePart' },
  { value: ListingType.ACCESSORY,   labelKey: 'businessTypeAccessory' },
  { value: ListingType.SERVICE,     labelKey: 'businessTypeService' },
];

const BENEFIT_KEYS = [
  { icon: Sparkles,   key: 'benefitPremium'  },
  { icon: ClipboardList, key: 'benefitSetup' },
  { icon: Star,       key: 'benefitBadge'    },
  { icon: Gauge,      key: 'benefitListings' },
  { icon: Rocket,     key: 'benefitAccess'   },
] as const;

export default function BetaRegisterForm() {
  const t = useTranslations('beta');
  const locale = useLocale();
  const uid = useId();

  const [referralCode, setReferralCode] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<BetaRegistration | null>(null);

  // Read ?ref=CODE client-side (avoids a useSearchParams Suspense boundary
  // for what's a nice-to-have, non-critical enhancement).
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase();
    if (ref) setReferralCode(ref);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BetaRegistrationFormValues>({
    resolver: zodResolver(betaRegistrationSchema),
    defaultValues: {
      dealerName: '', ownerName: '', phone: '', city: '',
      businessType: ListingType.CAR, facebookUrl: '', website: '', notes: '',
      betaAcknowledged: false,
    },
  });

  const onSubmit = async (data: BetaRegistrationFormValues) => {
    setSubmitError('');
    try {
      const registration = await betaApi.register({
        ...data,
        facebookUrl: data.facebookUrl || undefined,
        website: data.website || undefined,
        notes: data.notes || undefined,
        referralCode,
        locale,
      });
      setResult(registration);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = apiErr?.response?.data?.message ?? apiErr?.message ?? t('errorGeneric');
      setSubmitError(Array.isArray(msg) ? msg.join(' ') : msg || t('errorGeneric'));
    }
  };

  if (result) {
    return (
      <SuccessScreen
        registration={result}
        locale={locale}
        t={t}
        onReset={() => { setResult(null); reset(); }}
      />
    );
  }

  const dealerNameId = `${uid}-dealerName`;
  const ownerNameId = `${uid}-ownerName`;
  const cityId = `${uid}-city`;
  const businessTypeId = `${uid}-businessType`;
  const notesId = `${uid}-notes`;
  const ackId = `${uid}-ack`;

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-hero text-white">
        <div className="absolute inset-0 bg-dot-gold bg-repeat [background-size:22px_22px] opacity-[0.08] pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
          <div className="animate-fade-up">
            <Badge variant="gold" size="md" dot className="mb-6">
              {t('eyebrow')}
            </Badge>
          </div>
          <h1
            className="animate-fade-up font-display text-3xl sm:text-5xl font-bold leading-tight mb-5"
            style={{ animationDelay: '80ms' }}
          >
            {t('headline')}
          </h1>
          <p
            className="animate-fade-up text-white/70 text-base sm:text-lg max-w-2xl mx-auto mb-9 leading-relaxed"
            style={{ animationDelay: '150ms' }}
          >
            {t('subheadline')}
          </p>
          <div className="animate-fade-up" style={{ animationDelay: '220ms' }}>
            <Button
              variant="gold"
              size="xl"
              rightIcon={<ArrowRight className="w-5 h-5 rtl:rotate-180" />}
              onClick={() => document.getElementById('beta-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t('heroCta')}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h2 className="text-center font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-10">
          {t('benefitsTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {BENEFIT_KEYS.map(({ icon: Icon, key }, i) => (
            <Card
              key={key}
              hover
              padding="lg"
              className="animate-fade-up flex items-start gap-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center">
                <Icon className="w-5 h-5 text-gold" />
              </span>
              <div className="flex items-start gap-2 pt-2">
                <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />
                <p className="font-semibold text-[var(--text-primary)] text-sm leading-snug">{t(key)}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Referral program ─────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
        <Card variant="glass" padding="lg" className="text-center sm:text-start sm:flex items-center gap-6">
          <span className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto sm:mx-0 mb-4 sm:mb-0">
            <Users2 className="w-7 h-7 text-gold" />
          </span>
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white mb-1.5">
              {t('referralTitle')}
            </h3>
            <p className="text-white/65 text-sm leading-relaxed">
              {t('referralDescription')}
            </p>
          </div>
        </Card>
      </section>

      {/* ── Registration form ────────────────────────────────────────── */}
      <section id="beta-form" className="max-w-2xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28 scroll-mt-20">
        <Card padding="lg" className="sm:p-9">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
              {t('formTitle')}
            </h2>
            <p className="text-[var(--text-muted)] text-sm">{t('formSubtitle')}</p>
          </div>

          {referralCode && (
            <div className="mb-6 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-[var(--text-primary)] flex items-center gap-2">
              <PartyPopper className="w-4 h-4 text-gold flex-shrink-0" />
              <span>{t('referredByBanner', { code: referralCode })}</span>
            </div>
          )}

          {submitError && (
            <div role="alert" className="mb-6 rounded-xl border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm text-status-error">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <Input
              id={dealerNameId}
              label={t('fieldDealerName')}
              placeholder={t('fieldDealerNamePlaceholder')}
              leftIcon={<Building2 className="w-4 h-4" />}
              required
              error={errors.dealerName?.message}
              {...register('dealerName')}
            />

            <Input
              id={ownerNameId}
              label={t('fieldOwnerName')}
              placeholder={t('fieldOwnerNamePlaceholder')}
              leftIcon={<User className="w-4 h-4" />}
              required
              error={errors.ownerName?.message}
              {...register('ownerName')}
            />

            <Input
              type="tel"
              label={t('fieldPhone')}
              placeholder={t('fieldPhonePlaceholder')}
              leftIcon={<PhoneCall className="w-4 h-4" />}
              required
              error={errors.phone?.message}
              {...register('phone')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor={cityId} className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                  {t('fieldCity')}
                  <span className="ms-1 text-[#ef4444]" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <select
                    id={cityId}
                    className="input-base ps-10"
                    aria-invalid={errors.city ? 'true' : undefined}
                    {...register('city')}
                  >
                    <option value="">{t('fieldCityPlaceholder')}</option>
                    {ALL_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                {errors.city && (
                  <p role="alert" className="mt-1.5 text-xs text-[#ef4444] flex items-center gap-1">
                    <span aria-hidden="true">⚠</span><span>{errors.city.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={businessTypeId} className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                  {t('fieldBusinessType')}
                  <span className="ms-1 text-[#ef4444]" aria-hidden="true">*</span>
                </label>
                <select
                  id={businessTypeId}
                  className="input-base"
                  aria-invalid={errors.businessType ? 'true' : undefined}
                  {...register('businessType')}
                >
                  {BUSINESS_TYPES.map(({ value, labelKey }) => (
                    <option key={value} value={value}>{t(labelKey)}</option>
                  ))}
                </select>
                {errors.businessType && (
                  <p role="alert" className="mt-1.5 text-xs text-[#ef4444] flex items-center gap-1">
                    <span aria-hidden="true">⚠</span><span>{errors.businessType.message}</span>
                  </p>
                )}
              </div>
            </div>

            <Input
              type="url"
              label={`${t('fieldFacebook')} (${t('optional')})`}
              placeholder={t('fieldFacebookPlaceholder')}
              leftIcon={<Facebook className="w-4 h-4" />}
              error={errors.facebookUrl?.message}
              {...register('facebookUrl')}
            />

            <Input
              type="url"
              label={`${t('fieldWebsite')} (${t('optional')})`}
              placeholder={t('fieldWebsitePlaceholder')}
              leftIcon={<Globe className="w-4 h-4" />}
              error={errors.website?.message}
              {...register('website')}
            />

            <div>
              <label htmlFor={notesId} className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                {`${t('fieldNotes')} (${t('optional')})`}
              </label>
              <div className="relative">
                <StickyNote className="w-4 h-4 text-[var(--text-muted)] absolute start-3 top-3 pointer-events-none" aria-hidden="true" />
                <textarea
                  id={notesId}
                  rows={3}
                  placeholder={t('fieldNotesPlaceholder')}
                  className="input-base ps-10 resize-none"
                  {...register('notes')}
                />
              </div>
              {errors.notes && (
                <p role="alert" className="mt-1.5 text-xs text-[#ef4444] flex items-center gap-1">
                  <span aria-hidden="true">⚠</span><span>{errors.notes.message}</span>
                </p>
              )}
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id={ackId}
                type="checkbox"
                className="w-4 h-4 mt-0.5 rounded border-[var(--border-default)] accent-[var(--gold)]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] flex-shrink-0"
                aria-invalid={errors.betaAcknowledged ? 'true' : undefined}
                {...register('betaAcknowledged')}
              />
              <label htmlFor={ackId} className="text-sm text-[var(--text-secondary)] cursor-pointer leading-snug">
                {t('acknowledgement')}
              </label>
            </div>
            {errors.betaAcknowledged && (
              <p role="alert" className="-mt-3 text-xs text-[#ef4444] flex items-center gap-1">
                <span aria-hidden="true">⚠</span><span>{errors.betaAcknowledged.message}</span>
              </p>
            )}

            <Button type="submit" variant="gold" size="lg" fullWidth loading={isSubmitting}>
              {isSubmitting ? t('submitting') : t('submit')}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Success screen — replaces the whole page content after a successful
// submission, per spec ("show a premium success screen").
// ─────────────────────────────────────────────────────────────────────────

function SuccessScreen({
  registration,
  locale,
  t,
  onReset,
}: {
  registration: BetaRegistration;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/beta?ref=${registration.referralId}`
      : `/${locale}/beta?ref=${registration.referralId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions/non-secure context) — the link
      // is still visible and selectable, so this is a soft failure.
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-16 sm:py-24">
      <Card variant="glass" padding="lg" className="max-w-lg w-full text-center sm:p-10 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/35 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-gold" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
          {t('successTitle')}
        </h1>
        <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-8">
          {t('successMessage')}
        </p>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mb-3 text-start">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-white/45 mb-2">
            {t('successReferralLabel')}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-xs sm:text-sm text-gold font-mono">
              {referralLink}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10
                         px-2.5 py-1.5 text-xs font-semibold text-gold hover:bg-gold/15 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('linkCopied') : t('copyLink')}
            </button>
          </div>
        </div>
        <p className="text-white/45 text-xs mb-8">{t('successReferralHint')}</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" fullWidth leftIcon={<RotateCcw className="w-4 h-4" />} onClick={onReset}>
            {t('registerAnother')}
          </Button>
          <Link href={`/${locale}`} className="w-full">
            <Button variant="gold" fullWidth>{t('backHome')}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
