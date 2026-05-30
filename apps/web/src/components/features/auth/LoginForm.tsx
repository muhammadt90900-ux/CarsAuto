'use client';
// components/features/auth/LoginForm.tsx — Enterprise login
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Shield, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function LoginForm({ locale = 'en' }: { locale?: string }) {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push(`/${locale}/dashboard`);
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
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[var(--ink-900)] text-xl mx-auto mb-4"
             style={{ background:'linear-gradient(135deg,#c9a84c,#9e6e1e)', boxShadow:'0 8px 32px rgba(201,168,76,0.30)' }}>A</div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Welcome back</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to AutoBazaarPro</p>
      </div>

      <div className="card-premium p-7">
        <div className="h-0.5 -mx-7 -mt-7 mb-7 rounded-t-2xl" style={{ background:'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)' }}/>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm text-[#ef4444] bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.18)]">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"/>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="your@email.com"
                className="input-base pl-11 h-11"/>
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Password</label>
              <Link href={`/${locale}/forgot-password`} className="text-xs text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"/>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Enter your password"
                className="input-base pl-11 pr-11 h-11"/>
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
          </div>

          {/* Demo notice */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--gold-subtle)] border border-[var(--border-gold)] text-xs text-[var(--text-muted)]">
            <Shield className="w-4 h-4 text-[var(--gold)] flex-shrink-0 mt-0.5"/>
            <span><strong className="text-[var(--gold)]">Demo:</strong> seller@demo.com / buyer@demo.com — password: <strong>Demo1234!</strong></span>
          </div>

          <button type="submit" disabled={loading}
            className="btn-gold w-full h-11 text-sm rounded-xl flex items-center justify-center gap-2">
            {loading ? <span className="w-4 h-4 border-2 border-[var(--ink-900)] border-t-transparent rounded-full animate-spin"/> : (
              <><span>Sign In</span><ArrowRight className="w-4 h-4"/></>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="h-px bg-[var(--border-subtle)]"/>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-white dark:bg-[#0b1525] text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            or continue with
          </span>
        </div>

        {/* Social login */}
        <div className="grid grid-cols-2 gap-3">
          {[{ label:'Google', icon:'G' },{ label:'Apple', icon:'🍎' }].map(s => (
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
        <Link href={`/${locale}/register`} className="text-[var(--gold)] font-semibold hover:text-[var(--gold-light)] transition-colors">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
