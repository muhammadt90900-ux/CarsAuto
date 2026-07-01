'use client';
// apps/web/src/components/features/sell/SellCarForm.tsx
//
// F-QUALITY fix: was a 1,431-line God Component holding every useState hook,
// every type-specific field block, every constant array, and every Tailwind
// class-string helper for all 5 listing types in one file. Split into:
//   - hooks/useSellForm.ts        — all form state, draft persistence, validation, submit
//   - SellFormUI.tsx              — shared StepHeading/CharCount/Upload360Section/class helpers
//   - steps/Step1BasicInfo.tsx    — title/price/type/condition/serviceType
//   - steps/Step2Details.tsx      — description/location/preview (shared) + dispatches to:
//       - steps/Step2VehicleDetails.tsx   (CAR/MOTORCYCLE/SPARE_PART)
//       - steps/Step2AccessoryDetails.tsx (ACCESSORY)
//       - steps/Step2ServiceDetails.tsx   (SERVICE)
//   - steps/Step3Photos.tsx       — image upload + 360° photos + submit error
//
// This file is left holding only what's genuinely orchestrator-level
// concern: subscription/permission gating (whether to show the form at
// all — a distinct concern from the form's own field state, so it's NOT
// inside useSellForm), step routing, and the nav/footer chrome around the
// step content.
//
// Multi-step "Sell" form supporting all 5 listing types:
//   CAR · MOTORCYCLE · SPARE_PART · ACCESSORY · SERVICE  (Feature 3)
//
// Step flow:
//   Step 1 — Basic Info  (title, price, type, condition/serviceType)
//   Step 2 — Details     (description + type-specific spec fields)
//   Step 3 — Photos      (image upload + submit)

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth.store';
import { subscriptionApi, type PermissionStatus } from '@/lib/api';
import { SellProgress } from './SellProgress';
import { UpgradePrompt } from './UpgradePrompt';
import { goldBtn, ghostBtn, draftBtn } from './SellFormUI';
import { useSellForm } from './hooks/useSellForm';
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Details } from './steps/Step2Details';
import { Step3Photos } from './steps/Step3Photos';

export function SellCarForm() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore((s) => ({ user: s.user, isHydrated: s.isHydrated }));

  // Subscription/permission gating — whether to show the form at all.
  // Deliberately NOT inside useSellForm: this is access control, a
  // different concern from the form's own field state/validation.
  const [permStatus,  setPermStatus]  = useState<PermissionStatus | null>(null);
  const [permLoading, setPermLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated || !user) return;
    setPermLoading(true);
    subscriptionApi
      .getStatus()
      .then(setPermStatus)
      .catch(() => setPermStatus({ canPost: false, reason: 'NOT_DEALER' }))
      .finally(() => setPermLoading(false));
  }, [isHydrated, user]);

  const form = useSellForm(user);
  const { step, goNext, goBack, submitting, submitError, draftSaved, draftRestored, saveDraftNow, handleSubmit } = form;

  // ── Early returns (after all hooks) ───────────────────────────────────────
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

  if (permStatus?.reason === 'NOT_DEALER') {
    return (
      <div className="min-h-screen bg-[var(--ink-950)] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}>
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-1" dir="rtl">ئەم تایبەتمەندییە تەنها بۆ فرۆشیارانە</h2>
          <p className="text-[var(--text-faint)] text-sm mb-6">This feature is for dealers only</p>
          <button onClick={() => router.push('/register')}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm
                       bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e] text-[#050b14]
                       hover:from-[#e8cc7a] hover:to-[#c9a84c] transition-all duration-200">
            بچۆ بۆ تۆمارکردن وەک فرۆشیار / Register as Dealer
          </button>
        </div>
      </div>
    );
  }

  if (permStatus?.reason === 'TRIAL_EXPIRED' || permStatus?.reason === 'LIMIT_REACHED') {
    return (
      <div className="min-h-screen bg-[var(--ink-950)] relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
          <UpgradePrompt reason={permStatus.reason as 'TRIAL_EXPIRED' | 'LIMIT_REACHED'} />
        </div>
      </div>
    );
  }

  const trialDaysRemaining = permStatus?.trialEnd
    ? Math.max(0, Math.ceil((new Date(permStatus.trialEnd).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="min-h-screen bg-[var(--ink-950)] relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.07)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">

        {permStatus?.reason === 'TRIAL' && trialDaysRemaining !== null && (
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap
                          px-5 py-3 rounded-xl
                          bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.25)]">
            <div>
              <p className="text-[var(--gold)] text-sm font-semibold" dir="rtl">
                ماوەی تاقیکردنەوە: {trialDaysRemaining} رۆژ ماوە — {permStatus.trialPostsUsed ?? 0}/50 پۆست
              </p>
              <p className="text-[var(--text-faint)] text-xs">
                Trial: {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left — {permStatus.trialPostsUsed ?? 0}/50 posts used
              </p>
            </div>
            <a href="/pricing" className="text-xs font-bold text-[var(--gold)] underline underline-offset-2 whitespace-nowrap">
              Upgrade →
            </a>
          </div>
        )}

        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                          bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)]
                          text-[var(--gold)] text-xs font-semibold tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            New Listing / ئیلانی نوێ
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Sell on CarsAuto</h1>
          <p className="text-[var(--text-faint)] text-sm">
            Cars · Accessories · Services — Kurdistan & Iraq
          </p>
        </div>

        <SellProgress step={step} />

        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 mt-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {step === 1 && <Step1BasicInfo form={form} />}
          {step === 2 && <Step2Details form={form} />}
          {step === 3 && <Step3Photos form={form} />}

          {draftRestored && step === 1 && (
            <div className="flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl text-xs
                            bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] text-[var(--gold)]">
              <span>📝</span>
              <span dir="auto">درافتێکی پاشەکەوتکراو گەڕێنرایەوە · تم استرجاع مسودة محفوظة · A saved draft was restored</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)] flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {step > 1 ? (
                <button onClick={goBack} className={ghostBtn}>← Back</button>
              ) : <div />}
              <button type="button" onClick={saveDraftNow} className={draftBtn} dir="auto">
                💾 دراف پاراستن · حفظ كمسودة · Save Draft
              </button>
            </div>
            <div className="flex items-center gap-3">
              {draftSaved && (
                <span className="text-xs text-[#4ade80] flex items-center gap-1.5 animate-pulse" dir="auto">
                  ✓ پاشەکەوتکرا · تم الحفظ · Saved
                </span>
              )}
              {step < 3 ? (
                <button onClick={goNext} className={goldBtn}>Continue →</button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting} className={`${goldBtn} min-w-[160px]`}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#050b14] border-t-transparent rounded-full animate-spin" />
                      Publishing…
                    </span>
                  ) : '🚀 Publish Listing'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 flex-wrap">
          {[
            { icon: '🔒', label: 'Secure & Private' },
            { icon: '⚡', label: 'Goes Live Instantly' },
            { icon: '💬', label: 'Direct Buyer Inquiries' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
              <span>{b.icon}</span><span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
