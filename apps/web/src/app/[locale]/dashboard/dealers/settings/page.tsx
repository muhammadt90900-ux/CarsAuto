'use client';
// apps/web/src/app/[locale]/dashboard/dealer/settings/page.tsx
// Edit dealer profile, logo, cover, opening hours, social links

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Save, Upload, Globe, Phone, MessageCircle,
  Instagram, Facebook, Send, MapPin, Clock,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday',
  fri:'Friday', sat:'Saturday', sun:'Sunday',
};

const DEFAULT_HOURS: Record<string, string> = {
  mon:'09:00-18:00', tue:'09:00-18:00', wed:'09:00-18:00',
  thu:'09:00-18:00', fri:'09:00-18:00', sat:'10:00-16:00', sun:'Closed',
};

// ── Field component ────────────────────────────────────────────────────────

function Field({
  label, children, hint,
}: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[0.72rem] font-semibold text-white/50 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[0.68rem] text-white/25">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = 'text', prefix,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; prefix?: string;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3.5 text-xs text-white/30 pointer-events-none select-none">{prefix}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full py-3 rounded-xl bg-white/[0.05] border border-white/[0.09]',
          'text-white text-sm placeholder:text-white/25',
          'focus:outline-none focus:border-[#c9a84c]/40 transition-colors',
          prefix ? 'pl-16 pr-4' : 'px-4',
        )}
      />
    </div>
  );
}

function Textarea({
  value, onChange, placeholder, rows = 4,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40 transition-colors resize-none"
    />
  );
}

// ── Section heading ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-2xl bg-[#0d1b2e] border border-white/[0.07] space-y-5">
      <h2 className="flex items-center gap-2 font-display font-bold text-white text-base">
        <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#c9a84c] to-[#9e6e1e]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DealerSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  // Form state
  const [nameEn,   setNameEn]   = useState('');
  const [nameAr,   setNameAr]   = useState('');
  const [nameKu,   setNameKu]   = useState('');
  const [tagEn,    setTagEn]    = useState('');
  const [tagAr,    setTagAr]    = useState('');
  const [tagKu,    setTagKu]    = useState('');
  const [descEn,   setDescEn]   = useState('');
  const [descAr,   setDescAr]   = useState('');
  const [descKu,   setDescKu]   = useState('');
  const [phone,    setPhone]    = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email,    setEmail]    = useState('');
  const [website,  setWebsite]  = useState('');
  const [instagram,setInstagram]= useState('');
  const [facebook, setFacebook] = useState('');
  const [telegram, setTelegram] = useState('');
  const [address,  setAddress]  = useState('');
  const [hours,    setHours]    = useState<Record<string, string>>(DEFAULT_HOURS);
  const [specialtiesRaw, setSpecialtiesRaw] = useState('');
  const [logoUrl,  setLogoUrl]  = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  // Load existing profile
  useEffect(() => {
    fetch('/api/dealers/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setNameEn(d.nameEn ?? ''); setNameAr(d.nameAr ?? ''); setNameKu(d.nameKu ?? '');
        setTagEn(d.taglineEn ?? ''); setTagAr(d.taglineAr ?? ''); setTagKu(d.taglineKu ?? '');
        setDescEn(d.descriptionEn ?? ''); setDescAr(d.descriptionAr ?? ''); setDescKu(d.descriptionKu ?? '');
        setPhone(d.phone ?? ''); setWhatsapp(d.whatsapp ?? ''); setEmail(d.email ?? '');
        setWebsite(d.website ?? ''); setInstagram(d.instagram ?? '');
        setFacebook(d.facebook ?? ''); setTelegram(d.telegram ?? '');
        setAddress(d.address ?? '');
        setHours(d.openingHours ?? DEFAULT_HOURS);
        setSpecialtiesRaw((d.specialties ?? []).join(', '));
        setLogoUrl(d.logoUrl ?? ''); setCoverUrl(d.coverUrl ?? '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/dealers/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn, nameAr, nameKu,
          taglineEn: tagEn, taglineAr: tagAr, taglineKu: tagKu,
          descriptionEn: descEn, descriptionAr: descAr, descriptionKu: descKu,
          phone, whatsapp, email, website, instagram, facebook, telegram,
          address, openingHours: hours,
          specialties: specialtiesRaw.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [nameEn,nameAr,nameKu,tagEn,tagAr,tagKu,descEn,descAr,descKu,
      phone,whatsapp,email,website,instagram,facebook,telegram,
      address,hours,specialtiesRaw]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-white text-2xl">Showroom Settings</h1>
          <p className="text-white/40 text-sm mt-0.5">Manage your dealer profile</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : saved
            ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            : <><Save className="w-4 h-4" /> Save Changes</>
          }
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Identity ── */}
      <Section title="Dealership Name">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="English">
            <Input value={nameEn} onChange={setNameEn} placeholder="e.g. Kurdistan Motors" />
          </Field>
          <Field label="Arabic">
            <Input value={nameAr} onChange={setNameAr} placeholder="الاسم بالعربي" />
          </Field>
          <Field label="Kurdish">
            <Input value={nameKu} onChange={setNameKu} placeholder="ناوی کوردی" />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Tagline EN" hint="Short description, max 160 chars">
            <Input value={tagEn} onChange={setTagEn} placeholder="Your trusted auto partner" />
          </Field>
          <Field label="Tagline AR">
            <Input value={tagAr} onChange={setTagAr} placeholder="شعارك بالعربي" />
          </Field>
          <Field label="Tagline KU">
            <Input value={tagKu} onChange={setTagKu} placeholder="ناساندنی کورت" />
          </Field>
        </div>
      </Section>

      {/* ── Description ── */}
      <Section title="About Your Dealership">
        <Field label="Description (English)">
          <Textarea value={descEn} onChange={setDescEn} placeholder="Tell customers about your dealership, brands you carry, years of experience…" rows={4} />
        </Field>
        <Field label="Description (Arabic)">
          <Textarea value={descAr} onChange={setDescAr} placeholder="وصف بالعربي" rows={3} />
        </Field>
        <Field label="Description (Kurdish)">
          <Textarea value={descKu} onChange={setDescKu} placeholder="وەسف بە کوردی" rows={3} />
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

      {/* ── Opening hours ── */}
      <Section title="Opening Hours">
        <div className="space-y-2">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-4">
              <span className="text-sm text-white/50 w-24">{DAY_LABELS[day]}</span>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={hours[day] ?? ''}
                  onChange={e => setHours(p => ({ ...p, [day]: e.target.value }))}
                  placeholder="09:00-18:00 or Closed"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c9a84c]/40 transition-colors"
                />
                <button
                  onClick={() => setHours(p => ({ ...p, [day]: 'Closed' }))}
                  className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  Closed
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Save button (bottom) ── */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-sm font-semibold hover:bg-white/[0.09] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><Save className="w-4 h-4" /> Save Changes</>
          }
        </button>
      </div>
    </div>
  );
}
