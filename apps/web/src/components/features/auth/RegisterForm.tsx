'use client';
// components/features/auth/RegisterForm.tsx (Accessibility-enhanced)
import { useState, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth.schema';

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
  return Math.min(3, Math.floor(score / 1.5));
}

export function RegisterForm({ locale = 'en' }: { locale?: string }) {
  const router                = useRouter();
  const { register: registerUser } = useAuthStore();
  const uid                   = useId();

  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');

  const {
    register: registerField,
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', phone: '', role: 'BUYER', agreed: false },
  });

  const password = watch('password');
  const agreed   = watch('agreed');

  const pwStrength = getPasswordStrength(password);
  const pwColors   = ['', '#ef4444', '#f59e0b', '#22c55e'];
  const pwLabels   = ['', 'Weak — add uppercase, number', 'Fair', 'Strong ✓'];
  const pwAriaLabels = ['', 'Weak password', 'Fair password', 'Strong password'];

  const onSubmit = async (data: RegisterFormValues) => {
    setError('');
    try {
      await registerUser(data.name, data.email, data.password, data.role, data.phone || undefined);
      router.push("/dashboard");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please try again.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    }
  };

  // Same priority as the original manual checks: terms-not-accepted took
  // precedence over the password-strength message.
  const onError = (errors: FieldErrors<RegisterFormValues>) => {
    const msg =
      errors.agreed?.message ||
      errors.password?.message ||
      errors.email?.message ||
      errors.name?.message ||
      'Please check the form and try again.';
    setError(msg);
  };

  // IDs for form fields
  const nameId     = `${uid}-name`;
  const emailId    = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const phoneId    = `${uid}-phone`;
  const termsId    = `${uid}-terms`;
  const strengthId = `${uid}-strength`;
  const errorId    = `${uid}-error`;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand mark */}
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[var(--ink-900)] text-xl mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)', boxShadow: '0 8px 32px rgba(201,168,76,0.30)' }}
          aria-hidden="true"
        >A</div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Create Account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Join CarsAuto — it's free</p>
      </div>

      {/* Trust signals */}
      <div className="flex items-center justify-center gap-6 mb-6 text-xs text-[var(--text-muted)]" aria-label="Trust indicators">
        {[['✅', 'Free forever'], ['🔒', 'SSL secured'], ['🚀', 'List in 2 mins']].map(([icon, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>

      <div className="card-premium p-4 sm:p-7 auth-card-inner">
        <div className="h-0.5 -mx-7 -mt-7 mb-7 rounded-t-2xl" aria-hidden="true"
             style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)' }} />

        {/* Role selector */}
        <fieldset className="mb-5">
          <legend className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            I want to
          </legend>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(r => (
                  <button key={r.id} type="button"
                    onClick={() => field.onChange(r.id as 'BUYER' | 'DEALER')}
                    aria-pressed={field.value === r.id}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200
                      ${field.value === r.id
                        ? 'border-[var(--gold)] bg-[var(--gold-subtle)]'
                        : 'border-[var(--border-default)] hover:border-[var(--border-gold)]'}`}
                  >
                    <div className="text-2xl mb-1" aria-hidden="true">{r.icon}</div>
                    <div className="font-bold text-[var(--text-primary)] text-sm">{r.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            )}
          />
        </fieldset>

        {error && (
          <div id={errorId} role="alert" aria-live="assertive"
               className="mb-5 px-4 py-3 rounded-xl text-sm text-[#ef4444] bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.18)]">
            <span aria-hidden="true">⚠ </span>{error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4" noValidate aria-describedby={error ? errorId : undefined}>
          {/* Name */}
          <div>
            <label htmlFor={nameId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Full Name <span className="text-[#ef4444]" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
              <input
                id={nameId}
                type="text"
                {...registerField('name')}
                required
                aria-required="true"
                minLength={2} maxLength={80}
                autoComplete="name"
                placeholder="Ahmad Al-Rashidi"
                className="input-base pl-11 h-12"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor={emailId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Email <span className="text-[#ef4444]" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
              <input
                id={emailId}
                type="email"
                {...registerField('email')}
                required
                aria-required="true"
                autoComplete="email"
                placeholder="your@email.com"
                className="input-base pl-11 h-12"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor={passwordId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Password <span className="text-[#ef4444]" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
              <input
                id={passwordId}
                type={showPw ? 'text' : 'password'}
                {...registerField('password')}
                required
                aria-required="true"
                aria-describedby={password ? strengthId : undefined}
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 chars — uppercase, lowercase, number"
                className="input-base pl-11 pr-11 h-12"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                aria-controls={passwordId}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded"
              >
                {showPw ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            {/* Strength meter */}
            {password && (
              <div id={strengthId} className="mt-2" aria-live="polite">
                <div className="flex gap-1 h-1" aria-hidden="true">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="flex-1 rounded-full transition-all duration-300"
                      style={{ background: n <= pwStrength ? pwColors[pwStrength] : 'var(--surface-200)' }} />
                  ))}
                </div>
                <p className="text-[10px] mt-1" style={{ color: pwColors[pwStrength] }}
                   aria-label={`Password strength: ${pwAriaLabels[pwStrength]}`}>
                  {pwLabels[pwStrength]}
                </p>
              </div>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label htmlFor={phoneId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Phone <span className="font-normal normal-case opacity-60">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
              <input
                id={phoneId}
                type="tel"
                {...registerField('phone')}
                autoComplete="tel"
                placeholder="+964 750 000 0000"
                className="input-base pl-11 h-12"
              />
            </div>
          </div>

          {/* Terms */}
          <Controller
            control={control}
            name="agreed"
            render={({ field }) => (
              <div className="flex items-start gap-2.5">
                <div
                  id={`${termsId}-box`}
                  role="checkbox"
                  aria-checked={field.value}
                  tabIndex={0}
                  onClick={() => field.onChange(!field.value)}
                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); field.onChange(!field.value); } }}
                  aria-labelledby={termsId}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2
                    ${field.value ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-[var(--border-strong)] hover:border-[var(--gold)]'}`}
                >
                  {field.value && <Check className="w-3 h-3 text-[var(--ink-900)]" aria-hidden="true" />}
                </div>
                <label id={termsId} className="text-xs text-[var(--text-muted)] leading-relaxed cursor-pointer"
                       onClick={() => field.onChange(!field.value)}>
                  I agree to the{' '}
                  <Link href="/terms" className="text-[var(--gold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded-sm">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[var(--gold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded-sm">Privacy Policy</Link>
                </label>
              </div>
            )}
          />

          <button
            type="submit"
            disabled={isSubmitting || !agreed}
            aria-disabled={isSubmitting || !agreed}
            aria-busy={isSubmitting}
            className="btn-gold w-full h-12 text-sm rounded-xl flex items-center justify-center gap-2
                       disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200
                       shadow-[0_4px_20px_rgba(201,168,76,0.35)] hover:shadow-[0_6px_28px_rgba(201,168,76,0.50)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-[var(--ink-900)] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span>Creating account…</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Already have an account?{' '}
          <Link href="/login"
                className="text-[var(--gold)] font-semibold hover:text-[var(--gold-light)] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
