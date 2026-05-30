'use client';
// components/features/auth/RegisterForm.tsx
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const ROLES = [
  { id: 'BUYER',  label: 'Buyer',          desc: 'Browse & purchase vehicles', icon: '🛒' },
  { id: 'DEALER', label: 'Seller / Dealer', desc: 'List and sell vehicles',     icon: '🏪' },
];

function getPasswordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw))    score++;
  if (pw.length >= 12)  score++;
  // clamp to 0-3
  return Math.min(3, Math.floor(score / 1.5));
}

export function RegisterForm({ locale = 'en' }: { locale?: string }) {
  const router   = useRouter();
  const { register } = useAuthStore();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [phone,    setPhone]    = useState('');
  const [role,     setRole]     = useState<'BUYER' | 'DEALER'>('BUYER');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [agreed,   setAgreed]   = useState(false);

  const pwStrength = getPasswordStrength(password);
  const pwColors   = ['', '#ef4444', '#f59e0b', '#22c55e'];
  const pwLabels   = ['', 'Weak — add uppercase, number', 'Fair', 'Strong ✓'];

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError('Please accept the terms to continue.'); return; }

    // Client-side password check before hitting the server
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register(name, email, password, role, phone || undefined);
      router.push(`/${locale}/dashboard`);
    } catch (err: any) {
      // Show the actual error message from the backend if available
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please try again.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setLoading(false);
    }
  }, [name, email, password, phone, role, agreed, register, router, locale]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand mark */}
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[var(--ink-900)] text-xl mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)', boxShadow: '0 8px 32px rgba(201,168,76,0.30)' }}
        >A</div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Create Account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Join AutoBazaarPro — it's free</p>
      </div>

      <div className="card-premium p-7">
        <div className="h-0.5 -mx-7 -mt-7 mb-7 rounded-t-2xl"
             style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)' }} />

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {ROLES.map(r => (
            <button key={r.id} type="button" onClick={() => setRole(r.id as 'BUYER' | 'DEALER')}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200
                ${role === r.id
                  ? 'border-[var(--gold)] bg-[var(--gold-subtle)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-gold)]'}`}>
              <div className="text-2xl mb-1">{r.icon}</div>
              <div className="font-bold text-[var(--text-primary)] text-sm">{r.label}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm text-[#ef4444] bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.18)]">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                minLength={2} maxLength={80}
                placeholder="Ahmad Al-Rashidi"
                className="input-base pl-11 h-11" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="your@email.com"
                className="input-base pl-11 h-11" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required minLength={8}
                placeholder="Min. 8 chars — uppercase, lowercase, number"
                className="input-base pl-11 pr-11 h-11"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength meter */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="flex-1 rounded-full transition-all duration-300"
                      style={{ background: n <= pwStrength ? pwColors[pwStrength] : 'var(--surface-200)' }} />
                  ))}
                </div>
                <p className="text-[10px] mt-1" style={{ color: pwColors[pwStrength] }}>
                  {pwLabels[pwStrength]}
                </p>
              </div>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Phone <span className="font-normal normal-case opacity-60">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+964 750 000 0000"
                className="input-base pl-11 h-11" />
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <div
              onClick={() => setAgreed(v => !v)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                ${agreed ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-[var(--border-strong)] hover:border-[var(--gold)]'}`}>
              {agreed && <Check className="w-3 h-3 text-[var(--ink-900)]" />}
            </div>
            <span className="text-xs text-[var(--text-muted)] leading-relaxed">
              I agree to the{' '}
              <Link href={`/${locale}/terms`} className="text-[var(--gold)] hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href={`/${locale}/privacy`} className="text-[var(--gold)] hover:underline">Privacy Policy</Link>
            </span>
          </label>

          <button type="submit" disabled={loading || !agreed}
            className="btn-gold w-full h-11 text-sm rounded-xl flex items-center justify-center gap-2">
            {loading
              ? <span className="w-4 h-4 border-2 border-[var(--ink-900)] border-t-transparent rounded-full animate-spin" />
              : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>
            }
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Already have an account?{' '}
        <Link href={`/${locale}/login`} className="text-[var(--gold)] font-semibold hover:text-[var(--gold-light)] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
