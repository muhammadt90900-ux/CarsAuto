'use client';
// components/features/motorcycles/MotorcycleDetailClient.tsx
//
// PROMPT 3 — dedicated component rather than retrofitting a `type` prop
// onto CarDetailClient.tsx. Reasoning: CarDetailClient.tsx is a live,
// heavily perf-tuned (lazy financing/report, IntersectionObserver sticky
// bar, memoised sub-components) 620-line file that's already working in
// production for the Cars page. Its car-specific surface area is small in
// *character count* (two hardcoded strings, one hardcoded /cars link) but
// the risk of a regression in a file this performance-sensitive — for the
// sake of a page (Motorcycles) that has zero current traffic to protect —
// outweighs the DRY savings. A dedicated file, kept structurally identical
// so the two can be reconciled later if desired, was the safer call. This
// mirrors the same "well-contained vs. risky refactor" judgment applied in
// Prompt 2 (ListingTypeClient vs. touching SparePartsClient/CarsMarketplaceClient).
//
// Field differences from CarDetailClient: no trim/doors/seats/bodyType/
// fuelType/transmission/drivetrain (motorcycles don't have a CarTrim
// relation) — instead: engineCC/engineLabel, powerKw, condition, mileage,
// color, brand, model, year (all still live on the same shared
// ListingVehicleSpec table/relation as cars).

import { useState, useEffect, useCallback, useRef, memo, lazy, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart, Share2, GitCompare, Phone, MessageCircle,
  MapPin, Eye, Calendar, CheckCircle2, Shield, Star,
  AlertTriangle, ChevronDown, ChevronUp, Copy,
  Gauge, Settings, Palette, Zap, Banknote, ArrowLeft,
  Flag, Clock, Bike,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { ImageGallery } from '../cars/ImageGallery';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { CarBrandLogo } from '@/components/shared/CarBrandLogo';

const _fmtPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const _fmtNum = new Intl.NumberFormat('en-US');
function fmtPrice(v: number, currency = 'USD') {
  if (currency === 'USD') return _fmtPrice.format(v);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}
const fmtNum = (v: number) => _fmtNum.format(v);

// NOTE: cast through `any` — this repo has duplicate @types/react copies
// hoisted at different paths (the root cause of ~65 pre-existing TS2786/
// TS2322 errors elsewhere, e.g. CarDetailClient.tsx, Toast.tsx). Importing
// FinancingSection across the motorcycles/→cars/ directory boundary walks
// straight into that mismatch; erasing the type at this one boundary avoids
// it without touching the actual shared root cause (a monorepo dependency
// dedup issue, well outside Prompt 3's scope).
const FinancingSection = lazy(async () => {
  try {
    const m: any = await import('../cars/FinancingSection');
    return { default: m.FinancingSection };
  } catch {
    return { default: () => null };
  }
}) as unknown as React.ComponentType<{ price: number }>;
const ReportModal = lazy(() => Promise.resolve({ default: ReportModalInline }));

const SpecRow = memo(function SpecRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  if (!value) return null;
  return (
    <tr className="border-b border-white/[0.05] last:border-0">
      <th scope="row" className="py-3 pr-4 text-xs font-semibold uppercase tracking-[0.09em] text-white/35 whitespace-nowrap w-1/2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-[rgba(201,168,76,0.5)] flex-shrink-0" aria-hidden="true" />}
          {label}
        </div>
      </th>
      <td className="py-3 text-sm font-semibold text-white/85">{value}</td>
    </tr>
  );
});

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-3">
      <span className="w-1 h-5 rounded-full bg-gradient-to-b from-[var(--gold)] to-[#9e6e1e]" />
      {children}
    </h2>
  );
}

const ShareModal = memo(function ShareModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [url]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-[var(--ink-750)] border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.8)] p-6 space-y-4">
        <h3 className="font-display font-bold text-white text-lg">Share this listing</h3>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.05] border border-white/[0.07]">
          <span className="flex-1 text-xs text-white/50 truncate">{url}</span>
          <button onClick={copy} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200', copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[rgba(201,168,76,0.2)] text-[var(--gold)] hover:bg-[rgba(201,168,76,0.3)]')}>
            <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'WhatsApp', color: 'bg-[#25D366]/20 text-[#25D366]', href: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}` },
            { label: 'Telegram', color: 'bg-blue-500/20 text-blue-400', href: `https://t.me/share/url?url=${encodeURIComponent(url)}` },
            { label: 'Twitter', color: 'bg-sky-400/20 text-sky-400', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
          ].map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${s.label} (opens in new tab)`}
               className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-semibold transition-all hover:scale-105', s.color)}>
              {s.label}
            </a>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-white/[0.05] text-white/50 text-sm font-semibold hover:bg-white/[0.09] transition-all">Cancel</button>
      </div>
    </div>
  );
});

function ReportModalInline({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState('');
  const reasons = ['Incorrect information', 'Fraudulent listing', 'Already sold', 'Duplicate listing', 'Wrong price', 'Other'];
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-[var(--ink-750)] border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.8)] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Flag className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="font-display font-bold text-white text-lg">Report this listing</h3>
        </div>
        <div className="space-y-2">
          {reasons.map(r => (
            <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} className="w-4 h-4 accent-[var(--gold)]" />
              <span className="text-sm text-white/70 group-hover:text-white transition-colors">{r}</span>
            </label>
          ))}
        </div>
        <button disabled={!reason} onClick={onClose}
                className="w-full py-3 rounded-xl bg-red-500/90 text-white font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-500 transition-all">
          Submit Report
        </button>
      </div>
    </div>
  );
}

const LocationMap = memo(function LocationMap({ location }: { location: any }) {
  if (!location) return null;
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--ink-750)] border border-white/[0.06] h-48 flex items-center justify-center">
      <div className="text-center">
        <MapPin className="w-6 h-6 text-[rgba(201,168,76,0.5)] mx-auto mb-2" />
        <p className="text-sm text-white/60">{location.nameEn ?? location.city}</p>
      </div>
    </div>
  );
});

const SellerCard = memo(function SellerCard({ user, phone }: { user: any; phone?: string; locale?: string }) {
  const [showPhone, setShowPhone] = useState(false);
  const togglePhone = useCallback(() => setShowPhone(v => !v), []);
  if (!user) return null;
  return (
    <div className="rounded-3xl bg-[var(--ink-750)] border border-white/[0.06] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--gold)] to-[#9e6e1e] flex items-center justify-center text-[var(--ink-900)] font-bold flex-shrink-0">
          {(user.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
            {user.name}
            {user.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
          </p>
          <p className="text-xs text-white/35">Seller</p>
        </div>
      </div>
      <button onClick={togglePhone} className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-white/[0.06] border border-white/[0.10] text-white font-bold text-sm hover:bg-white/[0.10] transition-all duration-200">
        <Phone className="w-4 h-4" />
        {showPhone && phone ? phone : 'Show Phone Number'}
      </button>
    </div>
  );
});

const SimilarMotorcycles = memo(function SimilarMotorcycles({ motorcycles }: { motorcycles: any[] }) {
  if (!motorcycles?.length) return null;
  return (
    <div>
      <SectionHeading>Similar Motorcycles</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {motorcycles.slice(0, 6).map((m: any) => {
          const cover = m.images?.[0]?.url;
          const title = m.titleEn ?? m.titleKu ?? 'Motorcycle';
          return (
            <Link key={m.id} href={`/motorcycles/${m.id}`} prefetch={false} data-prefetch-listing={m.id}
              className="group rounded-2xl overflow-hidden bg-[var(--ink-750)] border border-white/[0.06] hover:border-[rgba(201,168,76,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
              <div className="relative h-40 overflow-hidden bg-[#060f1a]">
                {cover ? (
                  <Image src={cover} alt={title} fill sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.06]" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <Bike className="w-12 h-12 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <span className="text-base font-display font-black text-[var(--gold)]">{fmtPrice(m.price, m.currency)}</span>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  {m.vehicleSpec?.brand?.nameEn && <CarBrandLogo brand={m.vehicleSpec.brand.nameEn} size="xs" />}
                  <p className="text-sm font-semibold text-white truncate group-hover:text-[var(--gold)] transition-colors">{title}</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {m.vehicleSpec?.year && <span className="text-xs text-white/35">{m.vehicleSpec.year}</span>}
                  {m.vehicleSpec?.mileageKm && (
                    <span className="text-xs text-white/35 flex items-center gap-1"><Gauge className="w-3 h-3" />{fmtNum(m.vehicleSpec.mileageKm)} km</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

export interface MotorcycleDetailClientProps {
  listing: any;
  similarMotorcycles: any[];
  locale: string;
}

export function MotorcycleDetailClient({ listing, similarMotorcycles, locale }: MotorcycleDetailClientProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const headerRef = useRef<HTMLDivElement>(null);

  const spec = listing.vehicleSpec ?? {};
  const brand = spec.brand ?? {};
  const model = spec.model ?? {};

  const localeKey = locale.charAt(0).toUpperCase() + locale.slice(1);
  const title = listing[`title${localeKey}`] ?? listing.titleEn ?? 'Motorcycle Listing';
  const desc = listing[`description${localeKey}`] ?? listing.descriptionEn ?? '';

  useEffect(() => { setCurrentUrl(window.location.href); }, []);

  const toggleFavorite = useCallback(() => setIsFavorite(v => !v), []);
  const openShare = useCallback(() => setShowShare(true), []);
  const closeShare = useCallback(() => setShowShare(false), []);
  const openReport = useCallback(() => setShowReport(true), []);
  const closeReport = useCallback(() => setShowReport(false), []);
  const toggleDesc = useCallback(() => setDescExpanded(v => !v), []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const engineDisplay = spec.engineLabel ?? (spec.engineCC ? `${spec.engineCC} cc` : null);

  const specs = [
    { label: 'Brand', value: brand.nameEn, icon: Bike },
    { label: 'Model', value: model.nameEn, icon: Bike },
    { label: 'Year', value: spec.year, icon: Calendar },
    { label: 'Condition', value: spec.condition, icon: Shield },
    { label: 'Mileage', value: spec.mileageKm ? `${fmtNum(spec.mileageKm)} km` : null, icon: Gauge },
    { label: 'Engine', value: engineDisplay, icon: Settings },
    { label: 'Power', value: spec.powerKw ? `${spec.powerKw} kW (${Math.round(spec.powerKw * 1.341)} hp)` : null, icon: Zap },
    { label: 'Color', value: spec.color, icon: Palette },
  ];

  return (
    <>
      <div className={cn('fixed top-0 inset-x-0 z-40 transition-all duration-300',
        stickyVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none')}>
        <div className="bg-[#070d18]/98 backdrop-blur-2xl border-b border-[rgba(201,168,76,0.2)] shadow-[0_4px_32px_rgba(0,0,0,0.7)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Viewing</p>
              <p className="text-sm font-bold text-white truncate">{title}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="hidden sm:block text-[var(--gold)] font-display font-black text-xl tabular-nums">
                <CurrencyDisplay amount={listing.price} currency={listing.currency} locale={locale} showConverted />
                {fmtPrice(listing.price, listing.currency)}
              </span>
              <button onClick={toggleFavorite}
                className={cn('hidden sm:flex items-center justify-center w-9 h-9 rounded-xl transition-all border',
                  isFavorite ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/[0.05] border-white/[0.10] text-white/50 hover:text-red-400')}>
                <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
              </button>
              <a href={`https://wa.me/${(listing.user?.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent("Hi, I'm interested in: " + title)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#1fb659] transition-all duration-200 shadow-[0_4px_16px_rgba(37,211,102,0.35)]">
                <Phone className="w-4 h-4" /> Contact Seller
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-[var(--ink-900)] pt-[66px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <Link href="/motorcycles" className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-[var(--gold)] transition-colors duration-200 group">
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to listings
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 xl:gap-10">
            <div className="space-y-8 min-w-0">
              <ImageGallery images={listing.images ?? []} title={title} />

              <div ref={headerRef}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap gap-2">
                    {listing.featured && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#b8922e] to-[#dab445] text-[var(--ink-900)] text-xs font-black">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </span>
                    )}
                    {spec.condition === 'NEW' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        <Zap className="w-3 h-3" /> New
                      </span>
                    )}
                    {listing.user?.verified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                        <Shield className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleFavorite} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={isFavorite}
                      className={cn('flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
                        isFavorite ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-red-400')}>
                      <Heart className={cn('w-4 h-4 transition-all', isFavorite && 'fill-current scale-110')} />
                    </button>
                    <button onClick={openShare} aria-label="Share"
                      className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-[var(--gold)] transition-all duration-200">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <Link href={`/compare?add=${listing.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-[var(--gold)] transition-all duration-200">
                      <GitCompare className="w-3.5 h-3.5" /> Compare
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  {brand.nameEn && <CarBrandLogo brand={brand.nameEn} size="lg" />}
                  <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white leading-tight">{title}</h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-white/35 mb-4">
                  {listing.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[rgba(201,168,76,0.5)]" />
                      {listing.location.nameEn ?? listing.location.city}
                    </span>
                  )}
                  {listing.views && <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{fmtNum(listing.views)} views</span>}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(listing.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <span className="text-4xl font-display font-black text-[var(--gold)] tabular-nums">
                    <CurrencyDisplay amount={listing.price} currency={listing.currency} locale={locale} showConverted />
                    {fmtPrice(listing.price, listing.currency)}
                  </span>
                  {listing.negotiable && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full mb-1 bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.2)] text-[rgba(201,168,76,0.8)] text-xs font-semibold">
                      <Banknote className="w-3 h-3" /> Negotiable
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Year', value: spec.year, icon: Calendar },
                  { label: 'Mileage', value: spec.mileageKm ? `${fmtNum(spec.mileageKm)} km` : null, icon: Gauge },
                  { label: 'Engine', value: engineDisplay, icon: Settings },
                  { label: 'Condition', value: spec.condition, icon: Shield },
                ].filter(s => s.value).map(s => (
                  <div key={s.label} className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06] text-center">
                    <s.icon className="w-4 h-4 text-[rgba(201,168,76,0.6)]" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{s.label}</span>
                    <span className="text-sm font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>

              {desc && (
                <div className="rounded-3xl bg-[var(--ink-750)] border border-white/[0.06] p-6">
                  <SectionHeading>Description</SectionHeading>
                  <div className={cn('relative overflow-hidden transition-all duration-500', !descExpanded && 'max-h-32')}>
                    <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{desc}</p>
                    {!descExpanded && <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[var(--ink-750)] to-transparent pointer-events-none" />}
                  </div>
                  {desc.length > 200 && (
                    <button onClick={toggleDesc} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors">
                      {descExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>}
                    </button>
                  )}
                </div>
              )}

              <div className="rounded-3xl bg-[var(--ink-750)] border border-white/[0.06] overflow-hidden">
                <div className="px-6 py-5">
                  <SectionHeading>Full Specifications</SectionHeading>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <tbody>
                        {specs.filter(s => s.value).map(s => (
                          <SpecRow key={s.label} label={s.label} value={String(s.value)} icon={s.icon} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <Suspense fallback={<div className="h-48 skeleton rounded-3xl" />}>
                <FinancingSection price={listing.price} />
              </Suspense>

              {listing.location && (
                <div>
                  <SectionHeading>Location</SectionHeading>
                  <LocationMap location={listing.location} />
                </div>
              )}

              <SimilarMotorcycles motorcycles={similarMotorcycles} />

              <div className="pt-2 pb-8">
                <button onClick={openReport} className="flex items-center gap-2 text-xs text-white/25 hover:text-red-400 transition-colors duration-200">
                  <Flag className="w-3.5 h-3.5" /> Report this listing
                </button>
              </div>
            </div>

            <div className="space-y-5 xl:sticky xl:top-[86px] xl:self-start">
              <div className="rounded-3xl bg-gradient-to-br from-[var(--ink-750)] to-[var(--ink-700)] border border-[rgba(201,168,76,0.2)] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Asking Price</p>
                  <div className="text-3xl font-display font-black text-[var(--gold)] tabular-nums">
                    <CurrencyDisplay amount={listing.price} currency={listing.currency} locale={locale} showConverted />
                    {fmtPrice(listing.price, listing.currency)}
                  </div>
                  {listing.negotiable && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-xs text-emerald-400 font-semibold">Open to negotiation</p>
                    </div>
                  )}
                </div>

                {listing.views > 50 && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Eye className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-300 font-semibold">{fmtNum(listing.views)} people viewed this listing</p>
                  </div>
                )}

                <div className="space-y-2.5">
                  <a href={`https://wa.me/${(listing.user?.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent("Hi, I'm interested in: " + title)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#1fb659] text-white font-bold text-sm transition-all duration-200 hover:shadow-[0_8px_24px_rgba(37,211,102,0.35)] hover:-translate-y-0.5 active:translate-y-0">
                    <MessageCircle className="w-5 h-5" /> WhatsApp Seller
                  </a>
                  <button className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.10] text-white font-bold text-sm hover:bg-white/[0.10] hover:-translate-y-0.5 transition-all duration-200">
                    <Phone className="w-5 h-5" /> Call Seller
                  </button>
                  <button onClick={toggleFavorite}
                    className={cn('flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl text-sm font-semibold transition-all duration-200',
                      isFavorite ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-red-400 hover:border-red-500/30')}>
                    <Heart className={cn('w-4 h-4 transition-all', isFavorite && 'fill-current')} />
                    {isFavorite ? '♥ Saved to Favorites' : 'Save to Favorites'}
                  </button>
                </div>
              </div>

              <SellerCard user={listing.user} phone={listing.user?.phone} locale={locale} />

              <div className="rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Safety Tips</span>
                </div>
                <ul className="space-y-1">
                  {['Meet in a safe, public location', 'Always test-ride before buying', 'Verify all documents are authentic', 'Never send money in advance'].map(tip => (
                    <li key={tip} className="text-xs text-amber-200/50 flex items-start gap-1.5">
                      <span className="text-amber-400/60 mt-0.5">·</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-0.5">Listing ID</p>
                <p className="text-xs text-white/50 font-mono">{listing.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showShare && <ShareModal url={currentUrl} title={title} onClose={closeShare} />}
      {showReport && (
        <Suspense fallback={null}>
          <ReportModal onClose={closeReport} />
        </Suspense>
      )}
    </>
  );
}
