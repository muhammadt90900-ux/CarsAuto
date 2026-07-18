'use client';
// components/features/marketplace/ListingDetailClient.tsx
//
// AUDIT FIX (C1 — Critical): SPARE_PART, ACCESSORY, and SERVICE listings
// had grid/filter pages (SparePartsClient / ListingTypeClient) but no
// detail page — every card linked to /{routeSegment}/{id}, which 404'd.
// This is the shared detail-page client for all three, parametrized by
// DetailConfig (below), mirroring the existing config-driven pattern
// already used for the ACCESSORY/SERVICE grid (see ListingTypeClient.tsx).
//
// Deliberately does NOT try to unify with CarDetailClient/
// MotorcycleDetailClient — those have materially different domain logic
// (compare tool, 360° viewer, vehicle-specific JSON-LD). This component
// covers the three listing types that share the same generic
// spec-list + seller-card + similar-listings shape.

import { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Phone, Shield, CheckCircle2, MapPin, Heart, MessageCircle } from 'lucide-react';
import { ImageGallery } from '@/components/features/cars/ImageGallery';
import { TrustScoreChip } from '@/components/trust/TrustScoreChip';
import { BadgeRow } from '@/components/trust/BadgeRow';
import { useIsFavorited, useToggleFavorite } from '@/hooks/useFavorites';
import { useStartChat } from '@/hooks/useStartChat';

export interface DetailSpecField {
  key: string;
  label: string;
}

export interface DetailConfig {
  routeSegment: string;
  titleKu: string;
  titleEn: string;
  cardIcon: string;
  /** Ordered spec rows shown in the "Specifications" panel. */
  specFields: DetailSpecField[];
  /**
   * Some API responses nest type-specific fields under a spec object
   * (e.g. `listing.accessorySpec.brand`) rather than flat on the listing
   * (`listing.brand`) — mirrors the defensive `listing.accessorySpec ??
   * listing` fallback already used in ListingTypeClient.tsx. List the
   * possible nested keys in priority order; the first one present wins.
   */
  specObjectKeys?: string[];
}

const fmtPrice = (price: number, currency?: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency && currency.length === 3 ? currency : 'USD',
    maximumFractionDigits: 0,
  }).format(price ?? 0);

function getLocalized(value: any, locale: string): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.ku ?? Object.values(value)[0] ?? '';
}

function formatSpecValue(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length ? v.join(', ') : null;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('from' in o || 'to' in o) return `${o.from ?? '—'} – ${o.to ?? '—'}`;
    return null;
  }
  return String(v);
}

/* ── SellerCard ───────────────────────────────────────────────── */
const SellerCard = memo(function SellerCard({ user, title, listingId }: { user: any; title: string; listingId: string }) {
  const [showPhone, setShowPhone] = useState(false);
  const togglePhone = useCallback(() => setShowPhone((v) => !v), []);
  const { startChat, loading: chatLoading, error: chatError } = useStartChat();
  if (!user) return null;

  const identityVerified = !!user.identityVerifiedAt;
  const phone = user.phone as string | undefined;

  return (
    <div className="rounded-3xl bg-[var(--ink-750)] border border-white/[0.07] overflow-hidden">
      <div className="relative p-5 pb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(201,168,76,0.04)] to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="relative flex-shrink-0">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[rgba(201,168,76,0.2)] to-[rgba(201,168,76,0.05)] border-2 border-[rgba(201,168,76,0.2)] flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <Image src={user.avatar} alt={user.name ?? 'Seller'} fill sizes="56px" className="object-cover" />
              ) : (
                <span className="text-[var(--gold)] text-xl font-bold">{user.name?.[0] ?? '?'}</span>
              )}
            </div>
            {identityVerified && (
              <div className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[var(--ink-750)] flex items-center justify-center">
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
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <TrustScoreChip trustScore={user.trustScore} />
              <BadgeRow badges={user.badges} />
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 space-y-2.5">
        {/* FIX: in-app "Chat" button was entirely missing — only WhatsApp
            and phone reveal existed. */}
        <button
          onClick={() => startChat(listingId)}
          disabled={chatLoading}
          className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-[rgba(201,168,76,0.15)] border border-[rgba(201,168,76,0.3)] text-[var(--gold)] font-bold text-sm hover:bg-[rgba(201,168,76,0.25)] disabled:opacity-60 transition-all duration-200"
        >
          <MessageCircle className="w-4 h-4" />
          {chatLoading ? 'Opening chat...' : 'Chat with Seller'}
        </button>
        {chatError && (
          <p className="text-red-400 text-xs text-center">{chatError}</p>
        )}
        <a
          href={`https://wa.me/${(phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in: ${title}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#1fb659] text-white font-bold text-sm transition-all duration-200 hover:shadow-[0_8px_24px_rgba(37,211,102,0.35)] hover:-translate-y-0.5 active:translate-y-0"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
          Chat on WhatsApp
        </a>
        <button
          onClick={togglePhone}
          className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-white/[0.06] border border-white/[0.10] text-white font-bold text-sm hover:bg-white/[0.10] transition-all duration-200"
        >
          <Phone className="w-4 h-4" />
          {showPhone && phone ? phone : 'Show Phone Number'}
        </button>
      </div>
    </div>
  );
});

/* ── SimilarListings ──────────────────────────────────────────── */
const SimilarListings = memo(function SimilarListings({
  listings,
  config,
  locale,
}: {
  listings: any[];
  config: DetailConfig;
  locale: string;
}) {
  if (!listings?.length) return null;
  return (
    <div className="mt-14">
      <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-5">
        Similar {config.titleEn}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map((l) => (
          <Link key={l.id} href={`/${config.routeSegment}/${l.id}`} className="block group">
            <article className="card-premium overflow-hidden h-full flex flex-col">
              <div className="aspect-square bg-slate-50 dark:bg-[var(--ink-700)] flex items-center justify-center text-5xl">
                {config.cardIcon}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 mb-2">
                  {getLocalized(l.title, locale)}
                </h3>
                <span className="price-tag text-base font-bold text-[var(--gold)]">
                  {fmtPrice(l.price, l.currency)}
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
});

export function ListingDetailClient({
  listing,
  similarListings,
  locale,
  config,
}: {
  listing: any;
  similarListings: any[];
  locale: string;
  config: DetailConfig;
}) {
  const isRtl = locale === 'ku' || locale === 'ar';
  const title = getLocalized(listing.title, locale) || listing.titleEn || 'Listing';
  const description = getLocalized(listing.description, locale) || listing.descriptionEn || '';

  const { toggle: toggleFavoriteApi } = useToggleFavorite();
  const isSaved = useIsFavorited(listing.id);
  const handleToggleFavorite = useCallback(() => {
    toggleFavoriteApi(listing, !isSaved);
  }, [toggleFavoriteApi, listing, isSaved]);

  const specSource = (config.specObjectKeys ?? [])
    .map((k) => listing[k])
    .find((v) => v != null) ?? listing;

  const specRows = config.specFields
    .map((f) => {
      const raw = specSource[f.key] ?? listing[f.key];
      const formatted = formatSpecValue(raw);
      return formatted ? { label: f.label, value: formatted } : null;
    })
    .filter((r): r is { label: string; value: string } => r !== null);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[var(--surface-0)] dark:bg-[var(--ink-900)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href={`/${config.routeSegment}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors duration-200 mb-6"
        >
          <ChevronLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          Back to {config.titleEn}
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 xl:gap-10">
          <div className="min-w-0">
            {listing.images?.length ? (
              <ImageGallery images={listing.images} title={title} />
            ) : (
              <div className="aspect-video rounded-2xl bg-slate-100 dark:bg-[var(--ink-700)] flex items-center justify-center text-7xl">
                {config.cardIcon}
              </div>
            )}

            <div className="mt-8">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-[var(--text-primary)]">
                  {title}
                </h1>
                <button
                  onClick={handleToggleFavorite}
                  aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
                  className={`flex-shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center transition-colors ${
                    isSaved
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-500'
                      : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span
                  className="price-tag text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {fmtPrice(listing.price, listing.currency)}
                </span>
                {listing.negotiable && <span className="badge badge-gold">Negotiable</span>}
                {listing.verified && (
                  <span className="verified-badge">
                    <Shield className="w-2.5 h-2.5" /> Verified
                  </span>
                )}
                {listing.locationName && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <MapPin className="w-3 h-3" /> {listing.locationName}
                  </span>
                )}
              </div>

              {specRows.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">
                    Specifications
                  </h2>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-[var(--border-default)] p-5">
                    {specRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                        <dt className="text-[var(--text-muted)]">{row.label}</dt>
                        <dd className="font-semibold text-[var(--text-primary)] text-end">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {description && (
                <div className="mt-8">
                  <h2 className="text-lg font-display font-bold text-[var(--text-primary)] mb-3">
                    Description
                  </h2>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="xl:sticky xl:top-[calc(var(--navbar-h)+1.5rem)] xl:self-start">
            <SellerCard user={listing.user} title={title} listingId={listing.id} />
          </div>
        </div>

        <SimilarListings listings={similarListings} config={config} locale={locale} />
      </div>
    </div>
  );
}
