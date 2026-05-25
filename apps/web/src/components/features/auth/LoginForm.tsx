'use client';
// components/features/auth/LoginForm.tsx — Fully localized login form

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

/** Build schema dynamically using translated error messages */
function buildSchema(t: ReturnType<typeof useTranslations<'auth'>>) {
  return z.object({
    email:    z.string().min(1, t('emailRequired')).email(t('invalidEmail')),
    password: z.string().min(1, t('passwordRequired')).min(6, t('passwordTooShort')),
  });
}

export function LoginForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { login } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'ku');

  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [srvError, setSrvError] = useState('');

  const schema = buildSchema(t);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    setSrvError('');
    try {
      await login(data.email, data.password);
      router.push(`/${locale}/dashboard`);
    } catch {
      setSrvError(t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(175deg,#050b14 0%,#080f1c 40%,#0b1525 70%,#050b14 100%)' }}
    >
      {/* Background dots */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(201,168,76,.8) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />
      {/* Central glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse,rgba(201,168,76,.07) 0%,transparent 65%)', filter: 'blur(40px)' }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {tc('back')}
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white">{t('loginTitle')}</h1>
          </div>

          {/* Server error */}
          {srvError && (
            <div role="alert" className="rounded-xl px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">
              {srvError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" aria-hidden />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  {...register('email')}
                  placeholder={t('email')}
                  className={`w-full ps-10 pe-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25
                    bg-white/[0.05] border transition-all duration-200 outline-none
                    focus:bg-white/[0.08] focus:border-[#c9a84c]/60 focus:shadow-[0_0_20px_rgba(201,168,76,0.1)]
                    ${errors.email ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
                />
              </div>
              {errors.email && (
                <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" aria-hidden />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  {...register('password')}
                  placeholder="••••••••"
                  className={`w-full ps-10 pe-11 py-3.5 rounded-xl text-sm text-white placeholder-white/25
                    bg-white/[0.05] border transition-all duration-200 outline-none
                    focus:bg-white/[0.08] focus:border-[#c9a84c]/60 focus:shadow-[0_0_20px_rgba(201,168,76,0.1)]
                    ${errors.password ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="login-password-error" role="alert" className="mt-1.5 text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white
                         transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-[0_4px_24px_rgba(201,168,76,0.25)]
                         hover:shadow-[0_6px_32px_rgba(201,168,76,0.40)]
                         active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  {tc('loading')}
                </span>
              ) : t('loginLink')}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-white/40">
            {t('dontHaveAccount')}{' '}
            <Link href={`/${locale}/register`} className="text-[#c9a84c] hover:text-[#e8cc7a] font-semibold transition-colors">
              {t('registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
