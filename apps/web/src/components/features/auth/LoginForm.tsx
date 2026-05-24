'use client';
// components/features/auth/LoginForm.tsx — Redesigned: Unified Gold/Midnight design system

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

const schema = z.object({
  email:    z.string().email('ئیمەیڵی دروست بنووسە'),
  password: z.string().min(6, 'پاسوۆرد دەبێت لانیکەم ٦ پیت بێت'),
});

export function LoginForm() {
  const { login }  = useAuthStore();
  const router     = useRouter();
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [srvError, setSrvError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setSrvError('');
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch {
      setSrvError('ئیمەیڵ یان پاسوۆرد هەڵەیە. دووبارە هەوڵ بدەوە.');
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
      />
      {/* Central glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse,rgba(201,168,76,.07) 0%,transparent 65%)', filter: 'blur(40px)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 reveal">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5
                       shadow-[0_0_24px_rgba(201,168,76,0.40)]"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92"/>
              <circle cx="6.5" cy="15" r="2" fill="white"/>
              <circle cx="13.5" cy="15" r="2" fill="white"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white mb-2 tracking-tight">
            بەخێربێی دەگەڕێیتەوە
          </h1>
          <p className="text-white/35 text-sm">Welcome Back to AutoBazaar Pro</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.09] p-8 reveal stagger-1"
          style={{
            background: 'linear-gradient(135deg,rgba(11,21,37,.88),rgba(8,15,28,.92))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Gold top accent */}
          <div className="gold-line h-[2px] rounded-full -mx-8 -mt-8 mb-8 rounded-t-2xl" />

          <div className="space-y-5" dir="rtl">
            {/* Server error */}
            {srvError && (
              <div className="bg-red-500/[0.10] border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {srvError}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
                ئیمەیڵ / Email
              </label>
              <div className="relative">
                <Mail className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="you@example.com"
                  dir="ltr"
                  className={`
                    w-full pe-11 ps-4 py-3.5 rounded-xl text-sm text-white
                    placeholder-white/20 bg-white/[0.05] border outline-none
                    transition-all duration-200 caret-[#c9a84c]
                    focus:bg-white/[0.08] focus:border-[#c9a84c]/55
                    focus:shadow-[0_0_0_3px_rgba(201,168,76,0.10)]
                    ${errors.email ? 'border-red-500/50' : 'border-white/[0.10] hover:border-white/[0.18]'}
                  `}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message as string}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
                  پاسوۆرد / Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] text-[#c9a84c]/65 hover:text-[#c9a84c] transition-colors"
                >
                  پاسوۆردت بیر چوێتەوە؟
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  dir="ltr"
                  className={`
                    w-full pe-11 ps-11 py-3.5 rounded-xl text-sm text-white
                    placeholder-white/20 bg-white/[0.05] border outline-none
                    transition-all duration-200 caret-[#c9a84c]
                    focus:bg-white/[0.08] focus:border-[#c9a84c]/55
                    focus:shadow-[0_0_0_3px_rgba(201,168,76,0.10)]
                    ${errors.password ? 'border-red-500/50' : 'border-white/[0.10] hover:border-white/[0.18]'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute start-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs">{errors.password.message as string}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              className="btn-gold w-full py-4 rounded-xl font-bold text-sm mt-2
                         disabled:opacity-60 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  چاوەڕێ بکە...
                </>
              ) : (
                <>
                  چوونەژوورەوە / Sign In
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-white/20 text-xs">یان / or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* Register link */}
            <p className="text-center text-sm text-white/35">
              ئەکاونتت نییە؟{' '}
              <Link href="/register" className="text-[#c9a84c] hover:text-[#e8cc7a] font-semibold transition-colors">
                خۆت تۆمار بکە / Register
              </Link>
            </p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-6 mt-6">
          {['Iraq 🇮🇶', 'Kurdistan 🏔️', 'Dubai 🇦🇪'].map(r => (
            <span key={r} className="text-xs text-white/20">{r}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
