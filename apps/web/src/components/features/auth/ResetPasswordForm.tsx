'use client';
// components/features/auth/ResetPasswordForm.tsx
//
// Reads ?token=<raw> from the URL (set by the email link).
// On success clears the token from the URL and redirects to /login.

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';

// Password strength helpers
type Strength = 'weak' | 'fair' | 'good' | 'strong';

function passwordStrength(pw: string): { score: number; label: Strength } {
  let score = 0;
  if (pw.length >= 8)                         score++;
  if (pw.length >= 12)                        score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))  score++;
  if (/\d/.test(pw))                          score++;
  if (/[^A-Za-z0-9]/.test(pw))               score++;
  const labels: Strength[] = ['weak', 'weak', 'fair', 'good', 'strong'];
  return { score, label: labels[Math.min(score, 4)] };
}

const strengthColors: Record<Strength, string> = {
  weak:   '#ef4444',
  fair:   '#f59e0b',
  good:   '#3b82f6',
  strong: '#10b981',
};

export function ResetPasswordForm({ locale = 'en' }: { locale?: string }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const rawToken     = searchParams.get('token') ?? '';

  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [showCfm,    setShowCfm]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');

  // Detect obviously bad token on mount (e.g. user navigated here without a link)
  const [tokenMissing, setTokenMissing] = useState(false);
  useEffect(() => {
    if (!rawToken || rawToken.length < 16) setTokenMissing(true);
  }, [rawToken]);

  const strength = passwordStrength(password);
  const rules = [
    { ok: password.length >= 8,       label: 'At least 8 characters' },
    { ok: /[A-Z]/.test(password),     label: 'One uppercase letter' },
    { ok: /[a-z]/.test(password),     label: 'One lowercase letter' },
    { ok: /\d/.test(password),        label: 'One number' },
  ];
  const allRulesMet = rules.every((r) => r.ok);
  const passwordsMatch = password === confirm && confirm.length > 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!allRulesMet)      { setError('Password does not meet requirements.'); return; }
      if (!passwordsMatch)   { setError('Passwords do not match.'); return; }
      setError('');
      setLoading(true);
      try {
        await authApi.resetPassword(rawToken, password);
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3_000);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Something went wrong. Please request a new reset link.';
        setError(Array.isArray(msg) ? msg.join(' ') : msg);
      } finally {
        setLoading(false);
      }
    },
    [rawToken, password, passwordsMatch, allRulesMet, router, locale],
  );

  // ── Token missing ─────────────────────────────────────────────────────────
  if (tokenMissing) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="card-premium p-8 text-center">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            Invalid reset link
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            This link is missing or malformed. Please request a new password reset.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block py-2.5 px-6 rounded-xl font-bold text-sm text-[#0a0f1a]
                       transition-all"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="card-premium p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
          >
            <CheckCircle2 size={30} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            Password reset!
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-2">
            پاسوۆردەکەت بە سەرکەوتوویی گۆڕدرا
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            You&apos;ve been signed out of all devices. Redirecting you to login…
          </p>
          <Link
            href="/login"
            className="inline-block py-2.5 px-6 rounded-xl font-bold text-sm text-[#0a0f1a]"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            Sign in now
          </Link>
        </div>
      </div>
    );
  }

  // ── Reset form ────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand mark */}
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4
                     shadow-[0_8px_32px_rgba(201,168,76,0.35)]"
          style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
        >
          <Lock size={26} className="text-[#0a0f1a]" />
        </div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Set new password</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          داناندنی پاسوۆردێکی نوێ
        </p>
      </div>

      <div className="card-premium p-6 sm:p-8">
        <div
          className="h-0.5 -mx-8 -mt-8 mb-8 rounded-t-2xl"
          style={{
            background:
              'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)',
          }}
        />

        <form onSubmit={handleSubmit} noValidate>
          {/* New password */}
          <div className="mb-4">
            <label
              htmlFor="rp-password"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide"
            >
              New password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                id="rp-password"
                aria-required="true"
                aria-describedby="rp-strength"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm
                           bg-[var(--input-bg,#0f1724)] border border-[var(--border)]
                           text-[var(--text-primary)] placeholder-[var(--text-muted)]
                           focus:outline-none focus:border-[var(--accent-gold)]
                           transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]
                           hover:text-[var(--text-secondary)] transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 h-1 mb-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="flex-1 rounded-full transition-colors duration-300"
                      style={{
                        background:
                          strength.score >= n
                            ? strengthColors[strength.label]
                            : 'var(--border)',
                      }}
                    />
                  ))}
                </div>
                <p id="rp-strength" aria-live="polite" className="text-xs capitalize" style={{ color: strengthColors[strength.label] }}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="mb-5">
            <label
              htmlFor="rp-confirm"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide"
            >
              Confirm new password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                id="rp-confirm"
                aria-required="true"
                type={showCfm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm
                           bg-[var(--input-bg,#0f1724)] border border-[var(--border)]
                           text-[var(--text-primary)] placeholder-[var(--text-muted)]
                           focus:outline-none focus:border-[var(--accent-gold)]
                           transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCfm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]
                           hover:text-[var(--text-secondary)] transition-colors"
                aria-label={showCfm ? 'Hide password' : 'Show password'}
              >
                {showCfm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirm.length > 0 && (
              <p
                className="text-xs mt-1"
                style={{ color: passwordsMatch ? '#10b981' : '#ef4444' }}
              >
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {/* Rules checklist */}
          <ul className="mb-5 space-y-1.5">
            {rules.map((r) => (
              <li
key={r.label}
                role="status"
                className="flex items-center gap-2 text-xs"
                style={{ color: r.ok ? '#10b981' : 'var(--text-muted)' }}
              >
                <span className="text-base leading-none">{r.ok ? '✓' : '○'}</span>
                {r.label}
              </li>
            ))}
          </ul>

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
            disabled={loading || !allRulesMet || !passwordsMatch}
            className="w-full py-3 rounded-xl font-bold text-sm text-[#0a0f1a]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Resetting…
              </>
            ) : (
              'Reset password'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          <Link
            href="/forgot-password"
            className="font-semibold text-[var(--accent-gold)] hover:opacity-80 transition-opacity"
          >
            Request a new link
          </Link>
        </p>
      </div>
    </div>
  );
}
