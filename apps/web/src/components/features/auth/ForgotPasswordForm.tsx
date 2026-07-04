'use client';
// components/features/auth/ForgotPasswordForm.tsx

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '@/lib/api';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validation/auth.schema';

export function ForgotPasswordForm({ locale = 'en' }: { locale?: string }) {
  const [submitted,     setSubmitted]     = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error,         setError]         = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const emailValue = watch('email');

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError('');
    try {
      const normalized = data.email.trim().toLowerCase();
      await authApi.forgotPassword(normalized);
      setSubmittedEmail(normalized);
      setSubmitted(true);
    } catch (err: any) {
      // Show a generic error only for network/server failures, never for
      // "email not found" (server intentionally hides that).
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    }
  };

  const onError = (errors: FieldErrors<ForgotPasswordFormValues>) => {
    setError(errors.email?.message ?? 'Please check the form and try again.');
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="card-premium p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            <CheckCircle2 size={30} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            Check your inbox
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-1">
            If <strong>{submittedEmail}</strong> is registered, we&apos;ve sent a reset link.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            The link expires in <strong>30 minutes</strong>. Check your spam folder if you
            don&apos;t see it.
          </p>

          {/* Kurdish notice */}
          <p className="text-xs text-[var(--text-muted)] mb-6 font-[Noto Kufi Arabic,Arial] leading-relaxed" dir="rtl">
            ئەگەر ئیمەیڵەکەت تۆمارکراو بێت، لینکی گۆڕینی پاسوۆرد دەنێردرێت.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold
                       text-[var(--accent-gold)] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={14} />
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  // ── Request form ──────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand mark */}
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4
                     shadow-[0_8px_32px_rgba(201,168,76,0.35)]"
          style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
        >
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92" />
            <circle cx="6.5" cy="15" r="2" fill="white" />
            <circle cx="13.5" cy="15" r="2" fill="white" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Forgot password?</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          گۆڕینی پاسوۆرد / Reset your CarsAuto password
        </p>
      </div>

      <div className="card-premium p-6 sm:p-8">
        {/* Top gradient accent */}
        <div
          className="h-0.5 -mx-8 -mt-8 mb-8 rounded-t-2xl"
          style={{
            background:
              'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)',
          }}
        />

        <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
          Enter the email address linked to your account and we&apos;ll send you a reset
          link. The link expires in <strong>30 minutes</strong>.
        </p>

        <form onSubmit={handleSubmit(onSubmit, onError)} noValidate>
          {/* Email field */}
          <div className="mb-5">
            <label
              htmlFor="fp-email"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                id="fp-email"
                type="email"
                autoComplete="email"
                required
                {...register('email')}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm
                           bg-[var(--input-bg,#0f1724)] border border-[var(--border)]
                           text-[var(--text-primary)] placeholder-[var(--text-muted)]
                           focus:outline-none focus:border-[var(--accent-gold)]
                           transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400
                            bg-red-900/20 border border-red-800/40">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !emailValue?.trim()}
            className="w-full py-3 rounded-xl font-bold text-sm text-[#0a0f1a]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        {/* Back link */}
        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Remember your password?{' '}
          <Link
            href="/login"
            className="font-semibold text-[var(--accent-gold)] hover:opacity-80 transition-opacity"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
