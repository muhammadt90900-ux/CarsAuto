'use client';
// apps/web/src/components/features/sell/SellCarForm.tsx
// Full "Sell a Car" form — glassmorphism dark UI, auth-protected, validates
// all fields, mock-uploads images as data-URLs, POSTs to the NestJS API,
// then redirects to the new listing page.
//
// Permission gate: fetches /api/subscriptions/status on mount and renders
// the appropriate UI state (NOT_DEALER block, UpgradePrompt, trial banner,
// or the full form) before showing the multi-step form.

import { useState, useRef, useCallback, ChangeEvent, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/auth.store';
import { sellApi, type CreateListingPayload } from '@/lib/sell-api';
import { subscriptionApi, type PermissionStatus } from '@/lib/api';
import { ImageUploadGrid } from './ImageUploadGrid';
import { SellFormField } from './SellFormField';
import { SellProgress } from './SellProgress';
import { UpgradePrompt } from './UpgradePrompt';

// ── Validation helpers ────────────────────────────────────────────────────────

export interface FormValues {
  titleEn: string;
  titleKu: string;
  titleAr: string;
  price: string;
  currency: string;
  condition: string;
  type: string;
  descriptionEn: string;
  descriptionKu: string;
  negotiable: boolean;
  images: string[]; // mock URLs / data-URLs
}

export interface FormErrors {
  titleEn?: string;
  titleKu?: string;
  price?: string;
  condition?: string;
  type?: string;
  images?: string;
  general?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.titleEn.trim()) errors.titleEn = 'English title is required';
  else if (values.titleEn.trim().length < 5) errors.titleEn = 'Title must be at least 5 characters';
  else if (values.titleEn.trim().length > 120) errors.titleEn = 'Title must be under 120 characters';

  if (!values.titleKu.trim()) errors.titleKu = 'Kurdish title is required';

  if (!values.price) errors.price = 'Price is required';
  else if (isNaN(Number(values.price)) || Number(values.price) <= 0) errors.price = 'Enter a valid price';
  else if (Number(values.price) > 10_000_000) errors.price = 'Price seems too high';

  if (!values.condition) errors.condition = 'Select a condition';
  if (!values.type) errors.type = 'Select a listing type';
  if (values.images.length === 0) errors.images = 'Upload at least one photo';

  return errors;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONDITIONS = [
  { value: 'NEW',     label: 'New' },
  { value: 'USED',    label: 'Used' },
  { value: 'SALVAGE', label: 'Salvage' },
];

const TYPES = [
  { value: 'CAR',        label: 'Car' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'SPARE_PART', label: 'Spare Part' },
];

const CURRENCIES = ['USD', 'IQD', 'EUR'];

// ── Component ─────────────────────────────────────────────────────────────────

export function SellCarForm() {
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { user, isHydrated } = useAuthStore((s) => ({ user: s.user, isHydrated: s.isHydrated }));

  // ── Permission status ────────────────────────────────────────────────────
  const [permStatus, setPermStatus]       = useState<PermissionStatus | null>(null);
  const [permLoading, setPermLoading]     = useState(true);

  useEffect(() => {
    if (!isHydrated || !user) return;
    setPermLoading(true);
    subscriptionApi
      .getStatus()
      .then(setPermStatus)
      .catch(() => {
        // On error fall back to NOT_DEALER so the form is not shown unsafely
        setPermStatus({ canPost: false, reason: 'NOT_DEALER' });
      })
      .finally(() => setPermLoading(false));
  }, [isHydrated, user]);

  // Wait for Zustand to rehydrate from localStorage before rendering the form.
  if (!isHydrated || permLoading) {
    return (
      <div className="min-h-screen bg-[var(--ink-950)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-faint)] text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Permission gate ──────────────────────────────────────────────────────

  // 1. Non-dealer — hide the form entirely
  if (permStatus?.reason === 'NOT_DEALER') {
    return (
      <div className="min-h-screen bg-[var(--ink-950)] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}>
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-1" dir="rtl">
            ئەم تایبەتمەندییە تەنها بۆ فرۆشیارانە
          </h2>
          <p className="text-[var(--text-faint)] text-sm mb-6">
            This feature is for dealers only
          </p>
          <button
            onClick={() => router.push('/register')}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm
                       bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e] text-[#050b14]
                       hover:from-[#e8cc7a] hover:to-[#c9a84c] transition-all duration-200"
          >
            بچۆ بۆ تۆمارکردن وەک فرۆشیار / Register as Dealer
          </button>
        </div>
      </div>
    );
  }

  // 2. Trial expired or limit reached — show upgrade prompt
  if (permStatus?.reason === 'TRIAL_EXPIRED' || permStatus?.reason === 'LIMIT_REACHED') {
    return (
      <div className="min-h-screen bg-[var(--ink-950)] relative overflow-hidden">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.07)_0%,transparent_70%)]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
          <UpgradePrompt reason={permStatus.reason as 'TRIAL_EXPIRED' | 'LIMIT_REACHED'} />
        </div>
      </div>
    );
  }

  const [step, setStep]       = useState(1); // 1 = basics, 2 = details, 3 = photos
  const [values, setValues]   = useState<FormValues>({
    titleEn:       '',
    titleKu:       '',
    titleAr:       '',
    price:         '',
    currency:      'USD',
    condition:     '',
    type:          'CAR',
    descriptionEn: '',
    descriptionKu: '',
    negotiable:    false,
    images:        [],
  });
  const [errors, setErrors]     = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Field helpers ──────────────────────────────────────────────────────────

  const set = useCallback(
    (field: keyof FormValues) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value =
          e.target.type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : e.target.value;
        setValues((v) => ({ ...v, [field]: value }));
        // Clear error on change
        if (errors[field as keyof FormErrors]) {
          setErrors((er) => ({ ...er, [field]: undefined }));
        }
      },
    [errors]
  );

  const setImages = useCallback((imgs: string[]) => {
    setValues((v) => ({ ...v, images: imgs }));
    if (errors.images) setErrors((er) => ({ ...er, images: undefined }));
  }, [errors.images]);

  // ── Step navigation ────────────────────────────────────────────────────────

  const goNext = () => {
    const errs = validate(values);
    // Step 1 checks title + price + type + condition
    if (step === 1) {
      const step1Errs: FormErrors = {};
      if (errs.titleEn)   step1Errs.titleEn   = errs.titleEn;
      if (errs.titleKu)   step1Errs.titleKu   = errs.titleKu;
      if (errs.price)     step1Errs.price     = errs.price;
      if (errs.condition) step1Errs.condition = errs.condition;
      if (errs.type)      step1Errs.type      = errs.type;
      if (Object.keys(step1Errs).length) { setErrors(step1Errs); return; }
    }
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const errs = validate(values);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!user) { setSubmitError('You must be logged in to list a car.'); return; }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload: CreateListingPayload = {
        titleEn:       values.titleEn.trim(),
        titleKu:       values.titleKu.trim(),
        titleAr:       values.titleAr.trim() || values.titleEn.trim(),
        titleZh:       values.titleEn.trim(), // default fallback
        price:         Number(values.price),
        currency:      values.currency,
        condition:     values.condition,
        type:          values.type,
        descriptionEn: values.descriptionEn.trim() || undefined,
        descriptionKu: values.descriptionKu.trim() || undefined,
        negotiable:    values.negotiable,
        images:        values.images,
      };

      const listing = await sellApi.createListing(payload);
      // BUG FIX #4: Invalidate React Query listing cache so the marketplace
      // feed refetches and shows the new listing immediately on navigation.
      await queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
      router.push(`/cars/${listing.id}`);
    } catch (err: any) {
      // ✅ FIX #5 (High): Specific messages for common HTTP errors.
      // Generic message gave no guidance — users didn't know what to do.
      const status = err?.response?.status as number | undefined;

      if (status === 401) {
        setSubmitError('Your session has expired. Please log in again.');
      } else if (status === 403) {
        setSubmitError(
          'Your email is not verified. Please check your inbox and verify your email before publishing a listing.',
        );
      } else if (status === 429) {
        setSubmitError('Too many requests — please wait a moment and try again.');
      } else {
        setSubmitError(
          err?.response?.data?.message ??
          err?.message ??
          'Something went wrong. Please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Compute trial banner data (used when reason === 'TRIAL')
  const trialDaysRemaining = permStatus?.trialEnd
    ? Math.max(0, Math.ceil((new Date(permStatus.trialEnd).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="min-h-screen bg-[var(--ink-950)] relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.07)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23c9a84c%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">

        {/* Trial banner (only shown during active trial) */}
        {permStatus?.reason === 'TRIAL' && trialDaysRemaining !== null && (
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap
                          px-5 py-3 rounded-xl
                          bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.25)]">
            <div>
              <p className="text-[var(--gold)] text-sm font-semibold" dir="rtl">
                ماوەی تاقیکردنەوە: {trialDaysRemaining} رۆژ ماوە —{' '}
                {permStatus.trialPostsUsed ?? 0}/50 پۆست بەکارهاتوو
              </p>
              <p className="text-[var(--text-faint)] text-xs">
                Trial: {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining —{' '}
                {permStatus.trialPostsUsed ?? 0}/50 posts used
              </p>
            </div>
            <a
              href="/pricing"
              className="text-xs font-bold text-[var(--gold)] underline underline-offset-2 whitespace-nowrap"
            >
              Upgrade →
            </a>
          </div>
        )}
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] text-[var(--gold)] text-xs font-semibold tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            New Listing
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Sell Your Car
          </h1>
          <p className="text-[var(--text-faint)] text-sm">
            Reach thousands of buyers across Kurdistan & Iraq
          </p>
        </div>

        {/* Step indicator */}
        <SellProgress step={step} />

        {/* Glass card */}
        <div
          className="rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 mt-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* ── Step 1: Basic Info ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <StepHeading icon="🚗" title="Basic Information" subtitle="Title, price, and type" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SellFormField label="Title (English)" required error={errors.titleEn}>
                  <input
                    type="text"
                    placeholder="e.g. 2021 Toyota Camry SE"
                    value={values.titleEn}
                    onChange={set('titleEn')}
                    maxLength={120}
                    className={inputCls(!!errors.titleEn)}
                  />
                </SellFormField>

                <SellFormField label="Title (Kurdish / ناونیشان)" required error={errors.titleKu}>
                  <input
                    type="text"
                    placeholder="ناونیشانی ئۆتۆمبێلەکە"
                    value={values.titleKu}
                    onChange={set('titleKu')}
                    maxLength={120}
                    className={inputCls(!!errors.titleKu)}
                    dir="rtl"
                  />
                </SellFormField>
              </div>

              <SellFormField label="Title (Arabic)" optional>
                <input
                  type="text"
                  placeholder="عنوان السيارة"
                  value={values.titleAr}
                  onChange={set('titleAr')}
                  maxLength={120}
                  className={inputCls(false)}
                  dir="rtl"
                />
              </SellFormField>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <SellFormField label="Price" required error={errors.price} className="sm:col-span-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={values.price}
                      onChange={set('price')}
                      className={`${inputCls(!!errors.price)} flex-1`}
                    />
                    <select
                      value={values.currency}
                      onChange={set('currency')}
                      className={`${selectCls(false)} w-24`}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </SellFormField>

                <SellFormField label="Negotiable">
                  <label className="flex items-center gap-3 h-[42px] cursor-pointer select-none">
                    <span
                      onClick={() => setValues((v) => ({ ...v, negotiable: !v.negotiable }))}
                      className={`
                        relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer border
                        ${values.negotiable
                          ? 'bg-[var(--gold)] border-[var(--gold)]'
                          : 'bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.12)]'}
                      `}
                    >
                      <span
                        className={`
                          absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
                          ${values.negotiable ? 'translate-x-5' : 'translate-x-0'}
                        `}
                      />
                    </span>
                    <span className="text-[var(--text-secondary)] text-sm">Yes</span>
                  </label>
                </SellFormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SellFormField label="Listing Type" required error={errors.type}>
                  <select value={values.type} onChange={set('type')} className={selectCls(!!errors.type)}>
                    <option value="">Select type…</option>
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </SellFormField>

                <SellFormField label="Condition" required error={errors.condition}>
                  <select value={values.condition} onChange={set('condition')} className={selectCls(!!errors.condition)}>
                    <option value="">Select condition…</option>
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </SellFormField>
              </div>
            </div>
          )}

          {/* ── Step 2: Description ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <StepHeading icon="📝" title="Description" subtitle="Tell buyers about your car" />

              <SellFormField label="Description (English)" optional>
                <textarea
                  placeholder="Describe your car — year, features, condition, history…"
                  value={values.descriptionEn}
                  onChange={set('descriptionEn')}
                  rows={5}
                  maxLength={2000}
                  className={textareaCls(false)}
                />
                <CharCount current={values.descriptionEn.length} max={2000} />
              </SellFormField>

              <SellFormField label="Description (Kurdish / وصف)" optional>
                <textarea
                  placeholder="ئۆتۆمبێلەکەت وەسف بکە…"
                  value={values.descriptionKu}
                  onChange={set('descriptionKu')}
                  rows={5}
                  maxLength={2000}
                  dir="rtl"
                  className={textareaCls(false)}
                />
                <CharCount current={values.descriptionKu.length} max={2000} />
              </SellFormField>

              {/* Preview card */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] p-4 bg-[rgba(255,255,255,0.02)]">
                <p className="text-xs text-[var(--text-faint)] mb-2 uppercase tracking-wider">Preview</p>
                <p className="text-white font-semibold">{values.titleEn || 'Car Title'}</p>
                <p className="text-[var(--gold)] text-sm mt-1">
                  {values.price
                    ? `${Number(values.price).toLocaleString()} ${values.currency}`
                    : 'Price not set'}
                </p>
                {values.descriptionEn && (
                  <p className="text-[var(--text-muted)] text-sm mt-2 line-clamp-2">
                    {values.descriptionEn}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Photos ─────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <StepHeading icon="📸" title="Photos" subtitle="Upload up to 10 photos" />

              <ImageUploadGrid
                images={values.images}
                onChange={setImages}
                error={errors.images}
              />

              {/* Submit error */}
              {submitError && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)]">
                  <span className="text-xl">⚠️</span>
                  <p className="text-[#ef4444] text-sm">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
            {step > 1 ? (
              <button onClick={goBack} className={ghostBtn}>
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button onClick={goNext} className={goldBtn}>
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`${goldBtn} min-w-[140px]`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#050b14] border-t-transparent rounded-full animate-spin" />
                    Publishing…
                  </span>
                ) : (
                  '🚀 Publish Listing'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex items-center justify-center gap-6 flex-wrap">
          {[
            { icon: '🔒', label: 'Secure & Private' },
            { icon: '⚡', label: 'Goes Live Instantly' },
            { icon: '💬', label: 'Direct Buyer Inquiries' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
              <span>{b.icon}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-white font-bold text-xl">{title}</h2>
        <p className="text-[var(--text-faint)] text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

function CharCount({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  return (
    <p className={`text-xs mt-1 text-right ${pct > 0.9 ? 'text-[#ef4444]' : 'text-[var(--text-faint)]'}`}>
      {current}/{max}
    </p>
  );
}

// ── Shared Tailwind class builders ────────────────────────────────────────────

const baseInput = `
  w-full h-[42px] px-4 rounded-xl text-sm text-white placeholder-[var(--text-faint)]
  bg-[rgba(255,255,255,0.05)] border transition-all duration-150
  focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-0
  focus:bg-[rgba(255,255,255,0.07)]
`;

const inputCls = (hasError: boolean) =>
  `${baseInput} ${hasError
    ? 'border-[rgba(220,38,38,0.5)] focus:ring-[rgba(220,38,38,0.5)]'
    : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;

const selectCls = (hasError: boolean) =>
  `${baseInput} cursor-pointer appearance-none ${hasError
    ? 'border-[rgba(220,38,38,0.5)]'
    : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;

const textareaCls = (hasError: boolean) =>
  `w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[var(--text-faint)]
   bg-[rgba(255,255,255,0.05)] border transition-all duration-150 resize-none
   focus:outline-none focus:ring-2 focus:ring-[var(--gold)]
   focus:bg-[rgba(255,255,255,0.07)]
   ${hasError
     ? 'border-[rgba(220,38,38,0.5)]'
     : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;

const goldBtn = `
  inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm
  bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e] text-[#050b14]
  border border-[rgba(201,168,76,0.4)] shadow-[0_3px_14px_rgba(201,168,76,0.22)]
  hover:from-[#e8cc7a] hover:to-[#c9a84c] hover:shadow-[0_6px_28px_rgba(201,168,76,0.28)]
  hover:-translate-y-px active:translate-y-0
  transition-all duration-200 cursor-pointer
  disabled:opacity-50 disabled:pointer-events-none
`;

const ghostBtn = `
  inline-flex items-center gap-2 h-11 px-5 rounded-xl font-semibold text-sm
  bg-transparent text-[var(--text-muted)] border border-[rgba(255,255,255,0.08)]
  hover:text-white hover:border-[rgba(255,255,255,0.2)]
  transition-all duration-200 cursor-pointer
`;
