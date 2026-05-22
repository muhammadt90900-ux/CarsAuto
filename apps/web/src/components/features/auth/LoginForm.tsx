'use client';
// apps/web/src/components/features/auth/LoginForm.tsx

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@auto-bazaar-pro/ui/components';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

const schema = z.object({
  email: z.string().email('ئیمەیڵی دروست بنووسە'),
  password: z.string().min(6, 'پاسوۆرد دەبێت لانیکەم ٦ پیت بێت'),
});

export function LoginForm() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setServerError('');
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch {
      setServerError('ئیمەیڵ یان پاسوۆرد هەڵەیە. دووبارە هەوڵ بدەوە.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #050e18 0%, #0a1628 60%, #050e18 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(ellipse, #c8a84b 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #c8a84b 0%, #e8c96b 100%)' }}
          >
            <span className="text-2xl">🚗</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">بەخێربێی دەگەڕێیتەوە</h1>
          <p className="text-white/40 text-sm">Welcome Back to Auto Bazaar Pro</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border border-white/[0.08] p-8"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          {/* Gold top bar */}
          <div
            className="h-1 rounded-full mb-8 -mx-8 -mt-8 rounded-t-3xl"
            style={{ background: 'linear-gradient(90deg, transparent, #c8a84b, transparent)' }}
          />

          <div onSubmit={handleSubmit(onSubmit)} className="space-y-5" dir="rtl">

            {/* Server error */}
            {serverError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {serverError}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-semibold tracking-wider uppercase">ئیمەیڵ / Email</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="you@example.com"
                  dir="ltr"
                  className={`
                    w-full pr-11 pl-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25
                    bg-white/[0.05] border transition-all duration-200 outline-none
                    focus:bg-white/[0.08] focus:border-[#c8a84b]/60 focus:shadow-[0_0_20px_rgba(200,168,75,0.1)]
                    ${errors.email ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}
                  `}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message as string}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/50 font-semibold tracking-wider uppercase">پاسوۆرد / Password</label>
                <Link href="/forgot-password" className="text-[10px] text-[#c8a84b]/70 hover:text-[#c8a84b] transition-colors">
                  پاسوۆردت بیر چوێتەوە؟
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  dir="ltr"
                  className={`
                    w-full pr-11 pl-11 py-3.5 rounded-xl text-sm text-white placeholder-white/25
                    bg-white/[0.05] border transition-all duration-200 outline-none
                    focus:bg-white/[0.08] focus:border-[#c8a84b]/60 focus:shadow-[0_0_20px_rgba(200,168,75,0.1)]
                    ${errors.password ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message as string}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
              className="
                w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 mt-2
                disabled:opacity-60 disabled:cursor-not-allowed
                hover:shadow-lg hover:shadow-[#c8a84b]/30 hover:scale-[1.01] active:scale-[0.99]
                flex items-center justify-center gap-2
              "
              style={{
                background: isLoading
                  ? 'rgba(200,168,75,0.5)'
                  : 'linear-gradient(135deg, #c8a84b 0%, #e8c96b 50%, #c8a84b 100%)',
                color: '#050e18',
              }}
            >
              {isLoading ? (
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
              <span className="text-white/25 text-xs">یان / or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* Register link */}
            <p className="text-center text-sm text-white/40">
              ئەکاونتت نییە؟{' '}
              <Link
                href="/register"
                className="text-[#c8a84b] hover:text-[#f5d98b] font-semibold transition-colors"
              >
                خۆت تۆمار بکە / Register
              </Link>
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-6">
          {['Iraq 🇮🇶', 'Kurdistan 🏔️', 'Dubai 🇦🇪'].map(region => (
            <span key={region} className="text-xs text-white/20">{region}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
