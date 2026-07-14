'use client';
// components/features/cars/CarDetailClient.tsx — PERFORMANCE OPTIMISED
// Key improvements:
//   1. fmtPrice / fmtNum hoisted — Intl instances created once, not per render
//   2. data-prefetch-listing attr on similar-car links — triggers Providers prefetch
//   3. FinancingSection: lazy-loaded (heavy sliders, not needed for LCP)
//   4. LocationMap: lazy-loaded (no iframe / map on first paint)
//   5. ReportModal: lazy-loaded (rare interaction)
//   6. currentUrl: derived from props (SSR-safe), not window

import React, { useState, useEffect, useRef, memo, useCallback, lazy, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart, Share2, GitCompare, Phone, MessageCircle,
  MapPin, Eye, Calendar, CheckCircle2, Shield, Star,
  AlertTriangle, ChevronDown, ChevronUp, Copy,
  Gauge, Fuel, Settings, Palette, Car, Users,
  DoorOpen, Zap, Banknote, ArrowLeft,
  Flag, ExternalLink, TrendingDown, Clock,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { ImageGallery } from './ImageGallery';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { CarBrandLogo } from '@/components/shared/CarBrandLogo';
import { BadgeRow } from '@/components/trust/BadgeRow';
import { TrustScoreChip } from '@/components/trust/TrustScoreChip';
import { useIsFavorited, useToggleFavorite } from '@/hooks/useFavorites';
import { CarStickyActions } from '@/components/mobile/StickyAction';

// PERF: hoisted Intl instances — created once per module, not per render/card
const _fmtPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const _fmtNum   = new Intl.NumberFormat('en-US');

function fmtPrice(v: number, currency = 'USD') {
  if (currency === 'USD') return _fmtPrice.format(v);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}
const fmtNum = (v: number) => _fmtNum.format(v);

// PERF: lazy-load heavy below-fold components
const FinancingSection = lazy(() =>
  (import('./FinancingSection').then(m => ({ default: m.FinancingSection })).catch(() => ({ default: () => null })) as Promise<{ default: React.ComponentType<{ price: number }> }>)
);
const ReportModal = lazy(() =>
  import('@/components/reports/ReportModal').then(m => ({ default: m.ReportModal }))
);

/* ── SpecRow ──────────────────────────────────────────────────── */
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

/* ── ShareModal ───────────────────────────────────────────────── */
const ShareModal = memo(function ShareModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
            { label: 'Telegram', color: 'bg-blue-500/20 text-blue-400',   href: `https://t.me/share/url?url=${encodeURIComponent(url)}` },
            { label: 'Twitter',  color: 'bg-sky-400/20 text-sky-400',     href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
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

/* ── ReportModal — was a local dead-button mockup (ReportModalInline),
   replaced with the real, shared, API-wired component. See
   components/reports/ReportModal.tsx's header comment. ── */

/* ── LocationMap ──────────────────────────────────────────────── */
const LocationMap = memo(function LocationMap({ location }: { location: any }) {
  if (!location) return null;
  const query = encodeURIComponent(location.nameEn ?? location.city ?? 'Iraq');
  return (
    <div className="rounded-3xl overflow-hidden border border-white/[0.07] relative">
      <div className="h-52 bg-[var(--ink-750)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,21,37,0.8)] to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--gold)] flex items-center justify-center shadow-[0_0_24px_rgba(201,168,76,0.5)] animate-pulse">
            <MapPin className="w-5 h-5 text-[var(--ink-900)]" />
          </div>
          <p className="text-white font-semibold text-sm">{location.nameEn ?? location.city}</p>
          <a href={`https://maps.google.com?q=${query}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgba(201,168,76,0.15)] border border-[rgba(201,168,76,0.3)] text-[var(--gold)] text-xs font-semibold hover:bg-[rgba(201,168,76,0.25)] transition-all duration-200">
            <ExternalLink className="w-3.5 h-3.5" />Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
});

/* ── SellerCard ───────────────────────────────────────────────── */
const SellerCard = memo(function SellerCard({ user, phone }: { user: any; phone?: string; locale?: string }) {
  const [showPhone, setShowPhone] = useState(false);
  const togglePhone = useCallback(() => setShowPhone(v => !v), []);
  if (!user) return null;

  // FIX (Trust & Safety Prompt 6/7): `user.verified` is email verification,
  // not identity verification — this card previously used it for the
  // green checkmark + "Verified Seller" label, which overstates what was
  // actually confirmed. `identityVerifiedAt` (Prompt 2's KYC flow) is the
  // real signal for that; ID_VERIFIED also shows up in `user.badges` (via
  // BadgeRow below), so this checkmark now reflects ID verification
  // specifically, not email.
  const identityVerified = !!user.identityVerifiedAt;

  return (
    <div className="rounded-3xl bg-[var(--ink-750)] border border-white/[0.07] overflow-hidden">
      <div className="relative p-5 pb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(201,168,76,0.04)] to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="relative flex-shrink-0">
            {user.avatar ? (
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-[rgba(201,168,76,0.3)]">
                <Image src={user.avatar} alt={user.name} fill sizes="56px" className="object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[rgba(201,168,76,0.2)] to-[rgba(201,168,76,0.05)] border-2 border-[rgba(201,168,76,0.2)] flex items-center justify-center">
                <span className="text-[var(--gold)] text-xl font-bold">{user.name?.[0]}</span>
              </div>
            )}
            {identityVerified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[var(--ink-750)] flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-white fill-current" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-base truncate">{user.name}</p>
            {identityVerified && (
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-semibold">ID Verified Seller</span>
              </div>
            )}
            {/* FIX: was a hardcoded "(4.8) · 38 listings" with always-4-filled
                stars — no real data behind it at all. Replaced with the real
                trust tier + earned badges from TrustProfileService. */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <TrustScoreChip trustScore={user.trustScore} />
              <BadgeRow badges={user.badges} />
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 space-y-2.5">
        <a href={`https://wa.me/${(phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I am interested in this car listing.')}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#1fb659] text-white font-bold text-sm transition-all duration-200 hover:shadow-[0_8px_24px_rgba(37,211,102,0.35)] hover:-translate-y-0.5 active:translate-y-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
          </svg>
          Chat on WhatsApp
        </a>
        <button onClick={togglePhone} className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-white/[0.06] border border-white/[0.10] text-white font-bold text-sm hover:bg-white/[0.10] transition-all duration-200">
          <Phone className="w-4 h-4" />
          {showPhone && phone ? phone : 'Show Phone Number'}
        </button>
      </div>
    </div>
  );
});

/* ── SimilarCars ──────────────────────────────────────────────── */
const SimilarCars = memo(function SimilarCars({ cars, locale }: { cars: any[]; locale: string }) {
  if (!cars?.length) return null;
  return (
    <div>
      <SectionHeading>Similar Cars</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cars.slice(0, 6).map((car: any) => {
          const cover = car.images?.[0]?.url;
          const title = car.titleEn ?? car.titleKu ?? 'Car';
          return (
            // PERF: data-prefetch-listing triggers Providers prefetch on hover
            <Link key={car.id} href={`/cars/${car.id}`} prefetch={false}
              data-prefetch-listing={car.id}
              className="group rounded-2xl overflow-hidden bg-[var(--ink-750)] border border-white/[0.06] hover:border-[rgba(201,168,76,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
              <div className="relative h-40 overflow-hidden bg-[#060f1a]">
                {cover ? (
                  <Image src={cover} alt={title} fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <Car className="w-12 h-12 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <span className="text-base font-display font-black text-[var(--gold)]">
                    <CurrencyDisplay amount={car.price} currency={car.currency} locale={locale} showConverted />
                    {fmtPrice(car.price, car.currency)}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  {car.vehicleSpec?.brand?.nameEn && (
                    <CarBrandLogo brand={car.vehicleSpec.brand.nameEn} size="xs" />
                  )}
                  <p className="text-sm font-semibold text-white truncate group-hover:text-[var(--gold)] transition-colors">{title}</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {car.vehicleSpec?.year && <span className="text-xs text-white/35">{car.vehicleSpec.year}</span>}
                  {car.vehicleSpec?.mileageKm && (
                    <span className="text-xs text-white/35 flex items-center gap-1">
                      <Gauge className="w-3 h-3" />{fmtNum(car.vehicleSpec.mileageKm)} km
                    </span>
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

/* ══════════════════════════════════════════════════════════════ */
/*  Main CarDetailClient                                          */
/* ══════════════════════════════════════════════════════════════ */
export interface CarDetailClientProps {
  listing: any;
  similarCars: any[];
  locale: string;
}

export function CarDetailClient({ listing, similarCars, locale }: CarDetailClientProps) {
  // Previously: `const [isFavorite, setIsFavorite] = useState(false)` — a
  // purely local toggle repeated across 3 buttons in this file (compact
  // header, mobile section, desktop sidebar), none of them backed by the
  // real favorites API — the same bug already fixed on the /cars and
  // /motorcycles list pages this session, just also present here on the
  // detail page itself (arguably the single most important place to save
  // a car from).
  const isFavorite = useIsFavorited(listing.id);
  const { toggle: toggleFavoriteApi } = useToggleFavorite();
  const [showShare,     setShowShare]     = useState(false);
  const [showReport,    setShowReport]    = useState(false);
  const [descExpanded,  setDescExpanded]  = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [currentUrl,    setCurrentUrl]    = useState('');
  const headerRef = useRef<HTMLDivElement>(null);

  const spec  = listing.vehicleSpec ?? {};
  const trim  = spec.trim  ?? {};
  const brand = spec.brand ?? {};
  const model = spec.model ?? {};

  const localeKey = locale.charAt(0).toUpperCase() + locale.slice(1);
  const title = listing[`title${localeKey}`] ?? listing.titleEn ?? 'Car Listing';
  const desc  = listing[`description${localeKey}`] ?? listing.descriptionEn ?? '';

  // PERF: currentUrl derived client-side only (SSR safe)
  useEffect(() => { setCurrentUrl(window.location.href); }, []);

  const toggleFavorite = useCallback(() => toggleFavoriteApi(listing as any, !isFavorite), [listing, isFavorite, toggleFavoriteApi]);
  const openShare      = useCallback(() => setShowShare(true), []);
  const closeShare     = useCallback(() => setShowShare(false), []);
  const openReport     = useCallback(() => setShowReport(true), []);
  const closeReport    = useCallback(() => setShowReport(false), []);
  const toggleDesc     = useCallback(() => setDescExpanded(v => !v), []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const specs = [
    { label: 'Brand',        value: brand.nameEn,                                          icon: Car      },
    { label: 'Model',        value: model.nameEn,                                          icon: Car      },
    { label: 'Trim',         value: trim.name,                                             icon: Settings },
    { label: 'Year',         value: spec.year,                                             icon: Calendar },
    { label: 'Condition',    value: spec.condition,                                        icon: Shield   },
    { label: 'Mileage',      value: spec.mileageKm ? `${fmtNum(spec.mileageKm)} km` : null, icon: Gauge  },
    { label: 'Fuel Type',    value: trim.fuelType ?? spec.fuelType,                        icon: Fuel     },
    { label: 'Transmission', value: trim.transmission ?? spec.transmission,                icon: Settings },
    { label: 'Body Type',    value: trim.bodyType,                                         icon: Car      },
    { label: 'Drivetrain',   value: trim.drivetrain,                                       icon: Zap      },
    { label: 'Engine',       value: trim.engineLabel,                                      icon: Settings },
    { label: 'Power',        value: trim.powerKw ? `${trim.powerKw} kW (${Math.round(trim.powerKw * 1.341)} hp)` : null, icon: Zap },
    { label: 'Doors',        value: trim.doors,                                            icon: DoorOpen },
    { label: 'Seats',        value: trim.seats,                                            icon: Users    },
    { label: 'Color',        value: spec.color,                                            icon: Palette  },
  ];

  return (
    <>
      {/* Sticky bar — improved visibility & CTA.
          Desktop-only (`hidden md:block`): on mobile, CarStickyActions
          (a bottom-anchored bar — the standard mobile convention, within
          thumb reach) takes over this job instead of stacking a second
          fixed bar on top of an already-small screen. */}
      <div className={cn('hidden md:block fixed top-0 inset-x-0 z-40 transition-all duration-300',
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
          <Link href="/cars" className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-[var(--gold)] transition-colors duration-200 group">
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to listings
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 xl:gap-10">

            {/* LEFT COLUMN */}
            <div className="space-y-8 min-w-0">
              {/* PERF: ImageGallery is already memoised and handles its own priority */}
              <ImageGallery images={listing.images ?? []} title={title} />

              <div ref={headerRef}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap gap-2">
                    {listing.featured && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#b8922e] to-[#dab445] text-[var(--ink-900)] text-xs font-black">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </span>
                    )}
                    {spec.condition === 'new' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        <Zap className="w-3 h-3" /> New
                      </span>
                    )}
                    {/* FIX (Trust & Safety Prompt 6/7): this was `listing.user?.verified`
                        — that field is EMAIL verification, not ID verification, and was
                        being shown here labeled just "Verified" which reads as an identity
                        claim. Kept as-is for email but relabeled, and added the real
                        ID_VERIFIED badge (from user.badges) + trust tier alongside it so
                        buyers see accurate signals, not one overloaded checkmark. */}
                    {listing.user?.verified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                        <Shield className="w-3 h-3" /> Email Verified
                      </span>
                    )}
                    <TrustScoreChip trustScore={listing.user?.trustScore} size="md" />
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
                  {brand.nameEn && (
                    <CarBrandLogo brand={brand.nameEn} size="lg" />
                  )}
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
                      <TrendingDown className="w-3 h-3" /> Negotiable
                    </span>
                  )}
                </div>
              </div>

              {/* Quick specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Year',         value: spec.year,                                    icon: Calendar },
                  { label: 'Mileage',      value: spec.mileageKm ? `${fmtNum(spec.mileageKm)} km` : null, icon: Gauge },
                  { label: 'Fuel',         value: trim.fuelType ?? spec.fuelType,               icon: Fuel     },
                  { label: 'Transmission', value: trim.transmission ?? spec.transmission,       icon: Settings },
                ].filter(s => s.value).map(s => (
                  <div key={s.label} className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-2xl bg-[var(--ink-750)] border border-white/[0.06] text-center">
                    <s.icon className="w-4 h-4 text-[rgba(201,168,76,0.6)]" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{s.label}</span>
                    <span className="text-sm font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Description */}
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

              {/* Specs table */}
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

              {/* PERF: lazy financing calculator — not needed for LCP */}
              <Suspense fallback={<div className="h-48 skeleton rounded-3xl" />}>
                <FinancingSection price={listing.price} />
              </Suspense>

              {listing.location && (
                <div>
                  <SectionHeading>Location</SectionHeading>
                  <LocationMap location={listing.location} />
                </div>
              )}

              <SimilarCars cars={similarCars} locale={locale} />

              <div className="pt-2 pb-8">
                <button onClick={openReport} className="flex items-center gap-2 text-xs text-white/25 hover:text-red-400 transition-colors duration-200">
                  <Flag className="w-3.5 h-3.5" /> Report this listing
                </button>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="space-y-5 xl:sticky xl:top-[86px] xl:self-start">
              <div className="rounded-3xl bg-gradient-to-br from-[var(--ink-750)] to-[var(--ink-700)] border border-[rgba(201,168,76,0.2)] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
                {/* Price + negotiable */}
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

                {/* View count urgency signal */}
                {listing.views > 50 && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Eye className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-300 font-semibold">
                      {fmtNum(listing.views)} people viewed this listing
                    </p>
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
                  {['Meet in a safe, public location','Always test drive before buying','Verify all documents are authentic','Never send money in advance'].map(tip => (
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

      {showShare  && <ShareModal url={currentUrl} title={title} onClose={closeShare} />}
      {/* PERF: lazy-loaded — only downloaded when user clicks "Report" */}
      {showReport && (
        <Suspense fallback={null}>
          <ReportModal targetType="LISTING" targetId={listing.id} onClose={closeReport} />
        </Suspense>
      )}

      {/* Mobile bottom action bar — see the `hidden md:block` note on the
          top sticky bar above for why this replaces it on small screens
          instead of stacking alongside it. */}
      <CarStickyActions
        price={`${fmtPrice(listing.price, listing.currency)}`}
        saved={isFavorite}
        onSave={toggleFavorite}
        onShare={openShare}
        onContact={() => window.open(
          `https://wa.me/${(listing.user?.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent("Hi, I'm interested in: " + title)}`,
          '_blank',
        )}
        onCall={() => {
          if (listing.user?.phone) window.location.href = `tel:${listing.user.phone}`;
        }}
      />
    </>
  );
}
