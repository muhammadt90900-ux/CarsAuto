'use client';
// apps/web/src/app/[locale]/(public)/dealers/register/page.tsx
// Become a dealer — application form

import React, { useState, useCallback, useId } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  Building2, CheckCircle2, ChevronRight,
  Loader2, Shield, Star, Zap,
} from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';
import { api } from '@/lib/api';

const STEPS = ['Business Info', 'Contact', 'Details', 'Review'] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8" role="list" aria-label="Form steps">
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all',
                done   ? 'bg-[#c9a84c] text-[#0d1b2e]' :
                active ? 'bg-[#c9a84c]/20 border-2 border-[#c9a84c] text-[#e8cc7a]' :
                         'bg-white/[0.06] border border-white/[0.1] text-white/30',
              )}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn('text-[0.6rem] uppercase tracking-wider font-semibold whitespace-nowrap hidden sm:block',
                active ? 'text-[#e8cc7a]' : done ? 'text-white/50' : 'text-white/25'
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px mt-0 sm:-mt-4 transition-all', done ? 'bg-[#c9a84c]/50' : 'bg-white/[0.07]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  const fieldId = useId();
  const hintId  = hint ? `${fieldId}-hint` : undefined;
  const child = children as React.ReactElement;
  const enhancedChild = child && typeof child === 'object'
    ? React.cloneElement(child as React.ReactElement<any>, {
        id: (child as any)?.props?.id || fieldId,
        'aria-describedby': hintId,
        'aria-required': required ? 'true' : undefined,
      })
    : children;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={(child as any)?.props?.id || fieldId}
        className="text-[0.72rem] font-semibold text-white/50 uppercase tracking-wider"
      >
        {label}
        {required && <span className="ml-1 text-[#ef4444]" aria-hidden="true">*</span>}
      </label>
      {enhancedChild}
      {hint && <p id={hintId} className="text-[0.68rem] text-white/25">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40 transition-colors"
    />
  );
}

export default function DealerRegisterPage() {
  const router = useRouter();

  const [step,     setStep]     = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  // Step 0
  const [nameEn,   setNameEn]   = useState('');
  const [nameAr,   setNameAr]   = useState('');
  const [nameKu,   setNameKu]   = useState('');
  // Step 1
  const [phone,    setPhone]    = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email,    setEmail]    = useState('');
  const [website,  setWebsite]  = useState('');
  // Step 2
  const [address,  setAddress]  = useState('');
  const [specialties, setSpecialties] = useState('');
  const [descEn,   setDescEn]   = useState('');

  const canNext = [
    !!nameEn && !!nameAr && !!nameKu,
    !!phone || !!whatsapp,
    !!address,
    true,
  ][step];

  const submit = useCallback(async () => {
    setLoading(true); setError('');
    try {
      await api.post('/dealers', {
        nameEn, nameAr, nameKu,
        phone, whatsapp, email, website,
        address,
        specialties: specialties.split(',').map(s => s.trim()).filter(Boolean),
        descriptionEn: descEn,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  }, [nameEn, nameAr, nameKu, phone, whatsapp, email, website, address, specialties, descEn]);

  if (success) {
    return (
      <div className="min-h-screen bg-[#060e1a] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="font-display font-black text-white text-2xl">Application Submitted!</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Your dealer application is under review. We'll notify you once it's approved — usually within 24 hours.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060e1a]">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1a2e] to-[#060e1a] border-b border-white/[0.06] py-12 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(201,168,76,0.07),transparent_70%)]" />
        <div className="max-w-xl mx-auto relative text-center">
          <div className="flex items-center justify-center gap-2 text-[#c9a84c] text-xs font-semibold uppercase tracking-widest mb-3">
            <Building2 className="w-4 h-4" />
            Become a Dealer
          </div>
          <h1 className="font-display font-black text-white text-3xl mb-2">List Your Dealership</h1>
          <p className="text-white/50 text-sm">Join hundreds of verified dealers growing their business on Auto Bazaar Pro.</p>

          {/* Perks */}
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            {[
              { icon: Shield, label: 'Verified Badge' },
              { icon: Zap,    label: 'Priority Placement' },
              { icon: Star,   label: 'Reviews & Ratings' },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-2 text-xs text-white/50">
                <p.icon className="w-4 h-4 text-[#c9a84c]" />
                {p.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-xl mx-auto px-4 py-10">
        <StepIndicator current={step} />

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="p-6 rounded-2xl bg-[#0d1b2e] border border-white/[0.08] space-y-5">

          {/* Step 0: Business name */}
          {step === 0 && (
            <>
              <div>
                <h2 className="font-display font-bold text-white text-lg mb-1">Business Name</h2>
                <p className="text-white/40 text-sm">Enter your dealership name in all three languages.</p>
              </div>
              <Field label="Name (English)" required>
                <Input value={nameEn} onChange={setNameEn} placeholder="e.g. Kurdistan Motors" />
              </Field>
              <Field label="Name (Arabic)" required>
                <Input value={nameAr} onChange={setNameAr} placeholder="مثال: موتورز كوردستان" />
              </Field>
              <Field label="Name (Kurdish)" required>
                <Input value={nameKu} onChange={setNameKu} placeholder="نموونە: کوردستان موتۆرز" />
              </Field>
            </>
          )}

          {/* Step 1: Contact */}
          {step === 1 && (
            <>
              <div>
                <h2 className="font-display font-bold text-white text-lg mb-1">Contact Information</h2>
                <p className="text-white/40 text-sm">How customers will reach you.</p>
              </div>
              <Field label="Phone" required>
                <Input value={phone} onChange={setPhone} placeholder="+964 7XX XXX XXXX" />
              </Field>
              <Field label="WhatsApp" hint="Include country code — digits only">
                <Input value={whatsapp} onChange={setWhatsapp} placeholder="+9647001234567" />
              </Field>
              <Field label="Email">
                <Input value={email} onChange={setEmail} placeholder="info@yourdealer.com" type="email" />
              </Field>
              <Field label="Website">
                <Input value={website} onChange={setWebsite} placeholder="https://yourdealer.com" />
              </Field>
            </>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <>
              <div>
                <h2 className="font-display font-bold text-white text-lg mb-1">Business Details</h2>
                <p className="text-white/40 text-sm">Tell us more about your dealership.</p>
              </div>
              <Field label="Address" required>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, district, city"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40 transition-colors resize-none"
                />
              </Field>
              <Field label="Specialties" hint="e.g. Toyota, Lexus, Import Specialist (comma-separated)">
                <Input value={specialties} onChange={setSpecialties} placeholder="Toyota, Luxury, Electric…" />
              </Field>
              <Field label="About your dealership">
                <textarea
                  value={descEn}
                  onChange={e => setDescEn(e.target.value)}
                  placeholder="Brief description of your business, experience, brands you carry…"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40 transition-colors resize-none"
                />
              </Field>
            </>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <>
              <div>
                <h2 className="font-display font-bold text-white text-lg mb-1">Review & Submit</h2>
                <p className="text-white/40 text-sm">Confirm your details before submitting.</p>
              </div>
              {[
                { label: 'Business Name',   value: nameEn },
                { label: 'Phone',           value: phone || '—' },
                { label: 'WhatsApp',        value: whatsapp || '—' },
                { label: 'Email',           value: email || '—' },
                { label: 'Address',         value: address },
                { label: 'Specialties',     value: specialties || '—' },
              ].map(r => (
                <div key={r.label} className="flex gap-4 text-sm py-2 border-b border-white/[0.05] last:border-0">
                  <span className="text-white/35 w-32 flex-shrink-0">{r.label}</span>
                  <span className="text-white/80">{r.value}</span>
                </div>
              ))}
              <p className="text-xs text-white/30 pt-2">
                By submitting, you agree that your information is accurate. Applications are reviewed within 24 hours.
              </p>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-5">
          {step > 0 && (
            <button
              onClick={() => setStep(p => p - 1)}
              className="px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-sm font-semibold hover:bg-white/[0.09] transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={step === 3 ? submit : () => setStep(p => p + 1)}
            disabled={!canNext || loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            ) : step === 3 ? (
              <><CheckCircle2 className="w-4 h-4" /> Submit Application</>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
