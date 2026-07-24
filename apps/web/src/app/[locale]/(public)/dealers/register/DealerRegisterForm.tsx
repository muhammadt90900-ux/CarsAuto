'use client';
// apps/web/src/app/[locale]/(public)/dealers/register/DealerRegisterForm.tsx
//
// F-QUALITY fix: this is the client-side form for the public dealer
// registration page (page.tsx handles generateMetadata as a server
// component and renders this). Fields mirror CreateDealerDto
// (apps/api/src/modules/dealers/dto/create-dealer.dto.ts): nameEn/Ar/Ku
// are required, everything else is optional. Submits via dealersApi.register
// (POST /dealers). Requires an authenticated user — visitors who aren't
// logged in are prompted to log in first, same pattern as SellCarForm.tsx.
// Styling follows the existing dealer settings page
// (dashboard/dealers/settings/page.tsx) Field/Input/Textarea/Section
// building blocks so the two forms look and feel consistent.

import { useState, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth.store';
import { dealersApi } from '@/lib/api';
import {
  Save, Loader2, CheckCircle2, AlertCircle,
  Phone, MessageCircle, Globe,
} from 'lucide-react';

// ── Field building blocks (matches dashboard/dealers/settings/page.tsx) ────

function Field({
  label, children, hint, required,
}: {
  label: string; children: React.ReactNode; hint?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[0.72rem] font-semibold text-white/50 uppercase tracking-wider">
        {label}{required && <span className="text-[var(--gold)] ms-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[0.68rem] text-white/25">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = 'text', prefix, dir,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; prefix?: string; dir?: 'rtl' | 'ltr' | 'auto';
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute start-3.5 text-xs text-white/30 pointer-events-none select-none">{prefix}</span>
      )}
      <input
        type={type}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full py-3 rounded-xl bg-white/[0.05] border border-white/[0.09]
          text-white text-sm placeholder:text-white/25
          focus:outline-none focus:border-[rgba(201,168,76,0.4)] transition-colors
          ${prefix ? 'ps-16 pe-4' : 'px-4'}`}
      />
    </div>
  );
}

function Textarea({
  value, onChange, placeholder, rows = 4, dir,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; dir?: 'rtl' | 'ltr' | 'auto';
}) {
  return (
    <textarea
      value={value}
      dir={dir}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)] transition-colors resize-none"
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-2xl bg-ink-700 border border-white/[0.07] space-y-5">
      <h2 className="flex items-center gap-2 font-display font-bold text-white text-base">
        <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[var(--gold)] to-[#9e6e1e]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────

export default function DealerRegisterForm() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore((s) => ({ user: s.user, isHydrated: s.isHydrated }));

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameKu, setNameKu] = useState('');
  const [taglineEn, setTaglineEn] = useState('');
  const [taglineAr, setTaglineAr] = useState('');
  const [taglineKu, setTaglineKu] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionKu, setDescriptionKu] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [telegram, setTelegram] = useState('');
  const [address, setAddress] = useState('');
  const [specialtiesRaw, setSpecialtiesRaw] = useState('');

  const validate = useCallback(() => {
    if (!nameEn.trim() || nameEn.trim().length < 2) return 'English name is required (min 2 characters)';
    if (!nameAr.trim() || nameAr.trim().length < 2) return 'Arabic name is required (min 2 characters)';
    if (!nameKu.trim() || nameKu.trim().length < 2) return 'Kurdish name is required (min 2 characters)';
    return '';
  }, [nameEn, nameAr, nameKu]);

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!user) { setError('You must be logged in to register as a dealer.'); return; }

    setSubmitting(true);
    setError('');
    try {
      await dealersApi.register({
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        nameKu: nameKu.trim(),
        taglineEn: taglineEn.trim() || undefined,
        taglineAr: taglineAr.trim() || undefined,
        taglineKu: taglineKu.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        descriptionAr: descriptionAr.trim() || undefined,
        descriptionKu: descriptionKu.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        telegram: telegram.trim() || undefined,
        address: address.trim() || undefined,
        specialties: specialtiesRaw
          ? specialtiesRaw.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      setSubmitted(true);
      setTimeout(() => router.push('/dashboard/dealers'), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    validate, user, nameEn, nameAr, nameKu, taglineEn, taglineAr, taglineKu,
    descriptionEn, descriptionAr, descriptionKu, phone, whatsapp, email,
    website, instagram, facebook, telegram, address, specialtiesRaw, router,
  ]);

  // Not logged in — prompt to log in first, preserving the return path.
  if (isHydrated && !user) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="p-6 rounded-2xl bg-ink-700 border border-white/[0.07] text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[var(--gold)] mx-auto" />
          <p className="text-white font-semibold">Please log in to register as a dealer</p>
          <p className="text-white/40 text-sm">You'll need an account before you can create a dealer showroom.</p>
          <button
            onClick={() => router.push('/login?redirect=/dealers/register')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700 font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="p-6 rounded-2xl bg-ink-700 border border-white/[0.07] text-center space-y-4">
          <CheckCircle2 className="w-8 h-8 text-[var(--gold)] mx-auto" />
          <p className="text-white font-semibold">Your dealer profile has been created!</p>
          <p className="text-white/40 text-sm">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="font-display font-black text-white text-2xl">Become a Dealer</h1>
        <p className="text-white/40 text-sm mt-0.5">
          Register your dealership and reach buyers across Iraq, Kurdistan, and the UAE
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Identity ── */}
      <Section title="Dealership Name">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="English" required>
            <Input value={nameEn} onChange={setNameEn} placeholder="e.g. Kurdistan Motors" />
          </Field>
          <Field label="Arabic" required>
            <Input value={nameAr} onChange={setNameAr} placeholder="الاسم بالعربي" dir="rtl" />
          </Field>
          <Field label="Kurdish" required>
            <Input value={nameKu} onChange={setNameKu} placeholder="ناوی کوردی" dir="rtl" />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Tagline EN" hint="Short description, max 160 chars">
            <Input value={taglineEn} onChange={setTaglineEn} placeholder="Your trusted auto partner" />
          </Field>
          <Field label="Tagline AR">
            <Input value={taglineAr} onChange={setTaglineAr} placeholder="شعارك بالعربي" dir="rtl" />
          </Field>
          <Field label="Tagline KU">
            <Input value={taglineKu} onChange={setTaglineKu} placeholder="ناساندنی کورت" dir="rtl" />
          </Field>
        </div>
      </Section>

      {/* ── Description ── */}
      <Section title="About Your Dealership">
        <Field label="Description (English)">
          <Textarea value={descriptionEn} onChange={setDescriptionEn}
            placeholder="Tell customers about your dealership, brands you carry, years of experience…" rows={4} />
        </Field>
        <Field label="Description (Arabic)">
          <Textarea value={descriptionAr} onChange={setDescriptionAr} placeholder="وصف بالعربي" rows={3} dir="rtl" />
        </Field>
        <Field label="Description (Kurdish)">
          <Textarea value={descriptionKu} onChange={setDescriptionKu} placeholder="وەسف بە کوردی" rows={3} dir="rtl" />
        </Field>
        <Field label="Specialties" hint="Comma-separated: Toyota, Lexus, Electric, Luxury">
          <Input value={specialtiesRaw} onChange={setSpecialtiesRaw} placeholder="Toyota, Lexus, Import Specialist…" />
        </Field>
      </Section>

      {/* ── Contact ── */}
      <Section title="Contact Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phone">
            <Input value={phone} onChange={setPhone} placeholder="+964 7XX XXX XXXX" prefix="📞" />
          </Field>
          <Field label="WhatsApp" hint="Include country code, digits only">
            <Input value={whatsapp} onChange={setWhatsapp} placeholder="+9647001234567" prefix="💬" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={setEmail} placeholder="info@yourdealer.com" type="email" />
          </Field>
          <Field label="Website">
            <Input value={website} onChange={setWebsite} placeholder="https://yourdealer.com" prefix="🌐" />
          </Field>
        </div>
      </Section>

      {/* ── Social ── */}
      <Section title="Social Media">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Instagram">
            <Input value={instagram} onChange={setInstagram} placeholder="username" prefix="@" />
          </Field>
          <Field label="Facebook">
            <Input value={facebook} onChange={setFacebook} placeholder="page-name" prefix="fb/" />
          </Field>
          <Field label="Telegram">
            <Input value={telegram} onChange={setTelegram} placeholder="username" prefix="t.me/" />
          </Field>
        </div>
      </Section>

      {/* ── Location ── */}
      <Section title="Location">
        <Field label="Full Address">
          <Textarea value={address} onChange={setAddress} placeholder="Street, district, city, country" rows={2} />
        </Field>
      </Section>

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-sm font-semibold hover:bg-white/[0.09] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
            : <><Save className="w-4 h-4" /> Register as Dealer</>
          }
        </button>
      </div>
    </div>
  );
}
