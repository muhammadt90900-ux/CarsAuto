'use client';
// components/features/auth/VerifyEmailForm.tsx
//
// Reads ?token=<raw> from the URL (set by the verification email link).
// Calls GET /api/auth/verify-email?token=... on the backend.
// Shows success / error / missing-token states.
// Design matches the dark navy/gold design system used across the auth flow.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Loader2, Mail } from 'lucide-react';
import { api } from '@/lib/api';

export function VerifyEmailForm({ locale = 'en' }: { locale?: string }) {
  const searchParams = useSearchParams();
  const rawToken     = searchParams.get('token') ?? '';

  type State = 'idle' | 'loading' | 'success' | 'error' | 'missing';
  const [state,   setState]   = useState<State>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!rawToken || rawToken.length < 16) {
      setState('missing');
      return;
    }

    // Immediately trigger verification on mount — user landed here from the email link
    setState('loading');
    api
      .get<{ message: string; verified: boolean }>('/auth/verify-email', {
        params: { token: rawToken },
      })
      .then((res) => {
        setMessage(res.data.message ?? '');
        setState('success');
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          'Verification failed. The link may have expired.';
        setMessage(Array.isArray(msg) ? msg.join(' ') : msg);
        setState('error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawToken]);

  // ── Missing token ──────────────────────────────────────────────────────────
  if (state === 'missing') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="card-premium p-8 text-center">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            {/* ku: لینکی پشتڕاستکردنەوە نادروستە */}
            Invalid verification link
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {/* ku: ئەم لینکە کەم دەکات یان هەڵەیە. تکایە دوبارە هەوڵ بدە. */}
            This link is missing or malformed. Please request a new verification email.
          </p>
          <Link
            href={`/${locale}/login`}
            className="inline-block py-2.5 px-6 rounded-xl font-bold text-sm text-[#0a0f1a] transition-all"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            {/* ku: بڕۆ بۆ چوونەژوورەوە */}
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state === 'loading' || state === 'idle') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="card-premium p-8 text-center">
          <Loader2 size={40} className="text-[var(--accent-gold)] mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            Verifying your email…
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {/* ku: تکایە چاوەڕوان بە */}
            تکایە چاوەڕوان بە
          </p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="card-premium p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)' }}
          >
            <AlertTriangle size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            {/* ku: پشتڕاستکردنەوە سەرکەوتو نەبوو */}
            Verification failed
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">{message}</p>
          <div className="flex flex-col gap-3 items-center">
            <Link
              href={`/${locale}/login`}
              className="inline-block py-2.5 px-6 rounded-xl font-bold text-sm text-[#0a0f1a] transition-all"
              style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
            >
              {/* ku: چوونەژوورەوە */}
              Sign in
            </Link>
            <p className="text-xs text-[var(--text-muted)]">
              {/* ku: دوای چوونەژووەوە دەتوانیت دووبارە ئیمەیڵی پشتڕاستکردنەوە بنێریت */}
              After signing in you can request a new verification email from your dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand mark */}
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4
                     shadow-[0_8px_32px_rgba(201,168,76,0.35)]"
          style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
        >
          <Mail size={26} className="text-[#0a0f1a]" />
        </div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">
          {/* ku: ئۆتۆ بازار پرۆ */}
          Cars Auto
        </h1>
      </div>

      <div className="card-premium p-6 sm:p-8">
        {/* Gold top accent line */}
        <div
          className="h-0.5 -mx-8 -mt-8 mb-8 rounded-t-2xl"
          style={{
            background:
              'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)',
          }}
        />

        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
          >
            <CheckCircle2 size={30} className="text-white" />
          </div>

          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            {/* ku: ئیمەیڵەکەت پشتڕاست کرا */}
            Email verified!
          </h2>

          <p className="text-sm text-[var(--text-muted)] mb-1">
            ئیمەیڵەکەت بە سەرکەوتوویی پشتڕاست کرا
          </p>

          {message && (
            <p className="text-xs text-green-400 mb-4">{message}</p>
          )}

          <p className="text-sm text-[var(--text-muted)] mb-6">
            {/* ku: ئێستا دەتوانیت بچیتە ژوورەوە */}
            Your account is now fully activated. You can sign in and start using Cars Auto.
          </p>

          <Link
            href={`/${locale}/login`}
            className="inline-block py-2.5 px-6 rounded-xl font-bold text-sm text-[#0a0f1a] transition-all"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            {/* ku: چوونەژوورەوە */}
            Sign in now
          </Link>
        </div>
      </div>
    </div>
  );
}
