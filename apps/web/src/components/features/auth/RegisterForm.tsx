'use client';
// components/features/auth/RegisterForm.tsx — Fully localized register form

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

function buildSchema(t: ReturnType<typeof useTranslations<'auth'>>) {
  return z.object({
    name: z.string().min(1, t('nameRequired')).min(2, t('nameTooShort')),
    email: z.string().min(1, t('emailRequired')).email(t('invalidEmail')),
    phone: z.string().optional().refine(
      (v) => !v || /^[+\d\s\-()]{7,20}$/.test(v),
      t('invalidPhone'),
    ),
    password: z.string().min(1, t('passwordRequired')).min(6, t('passwordTooShort')),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t('passwordMismatch'),
    path: ['confirmPassword'],
  });
}

const inputClass = (hasError: boolean) => `
  w-full ps-11 pe-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25
  bg-white/[0.05] border transition-all duration-200 outline-none
  focus:bg-white/[0.08] focus:border-[#c9a84c]/60 focus:shadow-[0_0_20px_rgba(201,168,76,0.1)]
  ${hasError ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}
`;

export function RegisterForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { register: registerUser } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'ku');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [isLoading,   setIsLoading]     = useState(false);
  const [srvError,    setSrvError]      = useState('');
  const [success,     setSuccess]       = useState('');

  const schema = buildSchema(t);
  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setSrvError('');
    setSuccess('');
    try {
      await registerUser(data.name, data.email, data.password);
      setSuccess(t('registerSuccess'));
      setTimeout(() => router.push(`/${locale}/dashboard`), 1200);
    } catch {
      setSrvError(t('registerError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(175deg,#050b14 0%,#080f1c 40%,#0b1525 70%,#050b14 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(201,168,76,.8) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {tc('back')}
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('registerTitle')}</h1>
          </div>

          {srvError && (
            <div role="alert" className="rounded-xl px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">
              {srvError}
            </div>
          )}
          {success && (
            <div role="status" className="rounded-xl px-4 py-3 text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Name */}
            <FormField
              id="reg-name"
              label={t('name')}
              error={errors.name?.message}
              icon={<User className="w-4 h-4 text-white/30" aria-hidden />}
            >
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                {...register('name')}
                placeholder={t('name')}
                className={inputClass(!!errors.name)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'reg-name-error' : undefined}
              />
            </FormField>

            {/* Email */}
            <FormField
              id="reg-email"
              label={t('email')}
              error={errors.email?.message}
              icon={<Mail className="w-4 h-4 text-white/30" aria-hidden />}
            >
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                {...register('email')}
                placeholder={t('email')}
                className={inputClass(!!errors.email)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'reg-email-error' : undefined}
              />
            </FormField>

            {/* Phone */}
            <FormField
              id="reg-phone"
              label={t('phone')}
              error={errors.phone?.message}
              icon={<Phone className="w-4 h-4 text-white/30" aria-hidden />}
            >
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                {...register('phone')}
                placeholder={t('phone')}
                className={inputClass(!!errors.phone)}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'reg-phone-error' : undefined}
              />
            </FormField>

            {/* Password */}
            <FormField
              id="reg-password"
              label={t('password')}
              error={errors.password?.message}
              icon={<Lock className="w-4 h-4 text-white/30" aria-hidden />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            >
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('password')}
                placeholder="••••••••"
                className={`${inputClass(!!errors.password)} pe-11`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'reg-password-error' : undefined}
              />
            </FormField>

            {/* Confirm Password */}
            <FormField
              id="reg-confirm"
              label={t('confirmPassword')}
              error={errors.confirmPassword?.message}
              icon={<Lock className="w-4 h-4 text-white/30" aria-hidden />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            >
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('confirmPassword')}
                placeholder="••••••••"
                className={`${inputClass(!!errors.confirmPassword)} pe-11`}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'reg-confirm-error' : undefined}
              />
            </FormField>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white mt-2
                         transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-[0_4px_24px_rgba(201,168,76,0.25)]
                         hover:shadow-[0_6px_32px_rgba(201,168,76,0.40)]
                         active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  {tc('loading')}
                </span>
              ) : t('registerLink')}
            </button>
          </form>

          <p className="text-center text-sm text-white/40">
            {t('alreadyHaveAccount')}{' '}
            <Link href={`/${locale}/login`} className="text-[#c9a84c] hover:text-[#e8cc7a] font-semibold transition-colors">
              {t('loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Reusable form field wrapper */
function FormField({
  id,
  label,
  error,
  icon,
  trailing,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute start-3 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
