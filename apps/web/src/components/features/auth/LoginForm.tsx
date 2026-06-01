'use client';
// components/features/auth/LoginForm.tsx — UX-Improved: progress steps, better feedback

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function LoginForm({ locale = 'en' }: { locale?: string }) {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/dashboard`), 600);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Invalid email or password. Please try again.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, login, router, locale]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand mark */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4
                        shadow-[0_8px_32px_rgba(201,168,76,0.35)]"
             style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}>
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92" />
            <circle cx="6.5" cy="15" r="2" fill="white" />
            <circle cx="13.5" cy="15" r="2" fill="white" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Welcome back</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to AutoBazaarPro</p>
      </div>

      <div className="card-premium p-6 sm:p-8">
        {/* Top gradient line */}
        <div className="h-0.5 -mx-8 -mt-8 mb-8 rounded-t-2xl"
             style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)' }} />

        {/* Error alert */}
        {error && (
          <div role="alert" className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl
                                       text-sm text-[#ef4444] bg-[rgba(220,38,38,0.08)]
                                       border border-[rgba(220,38,38,0.18)]">
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl
                          text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Signed in! Redirecting to your dashboard…</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email"
                   className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="input-base pl-11 h-12"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password"
                     className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Password
              </label>
              <Link href={`/${locale}/forgot-password`}
                    className="text-xs text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="input-base pl-11 pr-11 h-12"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2
                           text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <input id="remember" type="checkbox"
                   className="w-4 h-4 rounded border-[var(--border-default)] accent-[#c9a84c]" />
            <label htmlFor="remember" className="text-xs text-[var(--text-muted)] cursor-pointer">
              Keep me signed in for 30 days
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className="btn-gold w-full h-12 text-sm rounded-xl flex items-center justify-center gap-2
                       disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-[var(--ink-900)] border-t-transparent rounded-full animate-spin" />
            ) : success ? (
              <><CheckCircle2 className="w-4 h-4" /><span>Signed in!</span></>
            ) : (
              <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Demo credentials — subtle */}
        <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-[var(--gold-subtle)] border border-[var(--border-gold)]
                        text-[11px] text-[var(--text-muted)]">
          <span className="font-bold text-[var(--gold)]">Demo: </span>
          seller@demo.com · buyer@demo.com · pw: <code className="font-mono">Demo1234!</code>
        </div>

        <div className="relative my-6">
          <div className="h-px bg-[var(--border-subtle)]" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                           px-3 bg-white dark:bg-[#0b1525] text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            or continue with
          </span>
        </div>

        {/* Social login */}
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Google', icon: 'G' }, { label: 'Apple', icon: '🍎' }].map(s => (
            <button key={s.label}
                    className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold
                               border border-[var(--border-default)] text-[var(--text-secondary)]
                               hover:border-[var(--border-gold)] hover:text-[var(--gold)] hover:bg-[var(--gold-subtle)]
                               transition-all duration-200">
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Don't have an account?{' '}
        <Link href={`/${locale}/register`}
              className="text-[var(--gold)] font-semibold hover:text-[var(--gold-light)] transition-colors">
          Sign up free →
        </Link>
      </p>
    </div>
  );
}
