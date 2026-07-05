'use client';
// components/shared/ListingCard.tsx
//
// ── Anatomy ──────────────────────────────────────────────────────────────
// ┌─────────────────────────────────────┐
// │  [1] HERO IMAGE  (4:3 ratio)         │  ← ratio fixed across verticals so
// │      ┌──────────┐        ┌────────┐  │    a mixed grid never jitters
// │      │ FEATURED │        │  ♥ save │  │
// │      └──────────┘        └────────┘  │
// │      ┌──────────────────────────┐    │
// │      │ SOLD (overlay, if any)   │    │
// │      └──────────────────────────┘    │
// ├─────────────────────────────────────┤
// │  [2] PRICE  ─────────────  [3] TRUST │  ← price is the single largest,
// │      $24,500                 ✓ Dealer│    boldest number on the card
// ├─────────────────────────────────────┤
// │  Title (2-line clamp)                │
// │  [4] Vertical-specific meta row      │  ← year · mileage · fuel · city
// │      (icons + text, wraps to chips   │    OR compat · condition · brand
// │       on narrow cards)                │
// ├─────────────────────────────────────┤
// │  [5] Location · posted-time footer   │
// ├─────────────────────────────────────┤
// │  [6] SPLIT CONTACT: 📞 Call │ 💬 WA  │  ← two-part action, stops the
// └─────────────────────────────────────┘    parent <Link> from navigating
//
// One component, four data-driven variants (via `listing.type`) — not four
// separate designs. Built on existing tokens only: --r-xl, --shadow-*,
// --t-expo/--t-base, --gold* family. No new colors or fonts introduced.

import Image from 'next/image';
import Link from 'next/link';
import { useState, type MouseEvent, type ElementType, type ReactNode } from 'react';
import { Heart, MapPin, Gauge, Fuel, Cog, Calendar, ShieldCheck, Wrench, Tag, Phone, MessageCircle } from 'lucide-react';
import { cn, formatCurrency, resolveLocaleText } from '@cars-auto/utils';
import {
  Listing,
  ListingType,
  ListingStatus,
  ListingCondition,
  ListingImage,
  ListingUser,
} from '@cars-auto/types';
import { isRTL, type Locale } from '@/i18n/config';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';

/* ────────────────────────────────────────────────────────────────────────
   Props
   ──────────────────────────────────────────────────────────────────── */

export interface ListingCardProps {
  /** The listing itself — union type, variant is derived from `listing.type`. */
  listing: Listing;
  /** Ordered images; first is used as the hero. */
  images?: ListingImage[];
  /** Poster/dealer info — drives the trust badge. */
  seller?: ListingUser & { isDealer?: boolean; rating?: number };
  /**
   * Resolved, human-readable location (e.g. "Erbil, Kurdistan Region").
   * `listing.locationId` is a foreign key, not display text — pass the
   * resolved label here rather than rendering the id.
   */
  locationLabel?: string;
  /** Current locale — drives text direction, title language, and href. */
  locale: Locale;
  /** Whether this card is currently saved/favorited by the viewer. */
  saved?: boolean;
  /** Called when the save/heart button is toggled. Card itself is optimistic. */
  onToggleSave?: (id: string, next: boolean) => void;
  /** Renders the skeleton state instead of real content. */
  loading?: boolean;
  className?: string;
}

/* ────────────────────────────────────────────────────────────────────────
   Vertical → icon/label config (single source of truth for "what makes
   each vertical different", so adding a 5th vertical later is additive).
   ──────────────────────────────────────────────────────────────────── */

const CONDITION_LABEL: Record<ListingCondition, string> = {
  [ListingCondition.NEW]: 'New',
  [ListingCondition.USED]: 'Used',
  [ListingCondition.SALVAGE]: 'Salvage',
};

const TYPE_ROUTE: Record<ListingType, string> = {
  [ListingType.CAR]: 'cars',
  [ListingType.MOTORCYCLE]: 'motorcycles',
  [ListingType.SPARE_PART]: 'spare-parts',
  [ListingType.ACCESSORY]: 'accessories',
  [ListingType.SERVICE]: 'services',
};

function formatMileage(km: number): string {
  return `${new Intl.NumberFormat().format(km)} km`;
}

/* ────────────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────────── */

export function ListingCard({
  listing,
  images = [],
  seller,
  locationLabel,
  locale,
  saved = false,
  onToggleSave,
  loading,
  className,
}: ListingCardProps) {
  const [isSaved, setIsSaved] = useState(saved);
  const [imgError, setImgError] = useState(false);
  const rtl = isRTL(locale);

  if (loading) return <SkeletonCard />;

  const title = resolveLocaleText(listing.title, locale);
  const heroImage = !imgError && images[0]?.url ? images[0].url : '/placeholder.jpg';
  const isSold = listing.status === ListingStatus.SOLD;
  const href = `/${locale}/${TYPE_ROUTE[listing.type]}/${listing.id}`;

  const handleSave = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !isSaved;
    setIsSaved(next);
    onToggleSave?.(listing.id, next);
  };

  const phone = seller?.phone;

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className={cn(
        'group relative flex flex-col overflow-hidden',
        'rounded-[var(--r-xl)] border border-[var(--border-default)]',
        'bg-[var(--surface-card)] shadow-[var(--shadow-md)]',
        'transition-all duration-expo',
        !isSold && 'hover:-translate-y-1 hover:border-gold/28 hover:shadow-[var(--shadow-lg)] hover:ring-1 hover:ring-gold/10',
        isSold && 'grayscale-[0.4]',
        className
      )}
    >
      {/*
        `display: contents` (via the `contents` class) keeps the Link itself
        out of the flex layout — its children (image → location footer)
        become direct flex items of the outer column. This lets the whole
        navigable area be a single <a>, while the tel:/WhatsApp <a> tags in
        [6] stay OUTSIDE it as siblings — nesting an <a> inside another <a>
        is invalid HTML and silently breaks click behavior in every browser.
      */}
      <Link href={href} className="contents" aria-disabled={isSold} aria-label={title}>
        {/* [1] HERO IMAGE ────────────────────────────────────────────── */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[var(--surface-100)]">
          <Image
            src={heroImage}
            alt={title || 'Listing photo'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={cn(
              'object-cover transition-transform duration-slow',
              !isSold && 'group-hover:scale-[1.06]'
            )}
            onError={() => setImgError(true)}
          />

          {/* gradient scrim so badges stay legible on any photo */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent pointer-events-none" />

          {/* top-start: featured badge */}
          {listing.featured && !isSold && (
            <div className="absolute top-3 start-3">
              <Badge variant="gold" dot>Featured</Badge>
            </div>
          )}

          {/* sold / unavailable overlay */}
          {isSold && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--ink-950)]/55">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-[var(--ink-900)]/90 text-white border border-white/20">
                Sold
              </span>
            </div>
          )}
        </div>

        {/* [2] + [3] PRICE + TRUST ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-3.5">
          <span className="price-tag text-xl">
            {formatCurrency(listing.price, listing.currency)}
          </span>
          {seller?.verified && (
            <span className="verified-badge shrink-0">
              <ShieldCheck className="w-3 h-3" />
              {seller.isDealer ? 'Dealer' : 'Verified'}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="px-4 pt-1.5 text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 min-h-[2.5em]">
          {title}
        </h3>

        {/* [4] VERTICAL-SPECIFIC META ────────────────────────────────── */}
        <div className="px-4 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
          <VerticalMeta listing={listing} />
        </div>

        {/* [5] FOOTER: location ──────────────────────────────────────── */}
        <div className={cn(
          'mt-auto px-4 pt-2.5 flex items-center gap-1 text-[11px] text-[var(--text-faint)]',
          (!phone || isSold) && 'pb-3.5'
        )}>
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{locationLabel || listing.locationId}</span>
        </div>
      </Link>

      {/* top-end: save/favorite — a real sibling of the Link (not nested
          inside it), positioned above the image purely via z-index so it
          stays clickable without needing stopPropagation tricks */}
      {!isSold && (
        <button
          onClick={handleSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
          className={cn(
            'absolute top-3 end-3 z-10 w-9 h-9 rounded-full flex items-center justify-center',
            'bg-black/35 backdrop-blur-md border border-white/15',
            'transition-all duration-base hover:bg-black/55 hover:scale-110 active:scale-95'
          )}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors duration-base',
              isSaved ? 'fill-status-error stroke-status-error' : 'stroke-white fill-transparent'
            )}
          />
        </button>
      )}

      {/* [6] SPLIT CONTACT ACTION — Call | WhatsApp — also a sibling of the
          Link, so these are ordinary top-level <a> tags, not nested ones */}
      {!isSold && phone && (
        <div className="px-4 pt-2.5 pb-3.5">
          <div className="flex items-stretch rounded-xl overflow-hidden border border-[var(--border-default)]">
            <a
              href={`tel:${phone}`}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold',
                'text-[var(--text-secondary)] bg-[var(--surface-50)]',
                'transition-colors duration-base hover:text-gold hover:bg-gold/10'
              )}
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </a>
            <div className="w-px bg-[var(--border-default)]" />
            <a
              href={`https://wa.me/${phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold',
                'text-whatsapp bg-whatsapp/10',
                'transition-colors duration-base hover:bg-whatsapp/20'
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Per-vertical meta row — this is the only part that actually differs
   between verticals; everything else in the anatomy is shared.
   ──────────────────────────────────────────────────────────────────── */

function VerticalMeta({ listing }: { listing: Listing }) {
  switch (listing.type) {
    case ListingType.CAR:
      return (
        <>
          <MetaItem icon={Calendar} label={String(listing.year)} />
          <MetaItem icon={Gauge} label={formatMileage(listing.mileage)} />
          <MetaItem icon={Fuel} label={listing.fuelType} />
          <MetaItem icon={Cog} label={listing.transmission} />
        </>
      );
    case ListingType.MOTORCYCLE:
      return (
        <>
          <MetaItem icon={Calendar} label={String(listing.year)} />
          <MetaItem icon={Gauge} label={formatMileage(listing.mileage)} />
          <MetaItem icon={Tag} label={`${listing.engineCC}cc`} />
        </>
      );
    case ListingType.SPARE_PART: {
      const years = listing.compatibleYears;
      const compat = listing.compatibleMakes[0]
        ? `${listing.compatibleMakes[0]}${years ? ` ${years.from}-${years.to}` : ''}`
        : 'Universal fit';
      return (
        <>
          <MetaItem icon={Wrench} label={compat} />
          <Badge variant={listing.condition === ListingCondition.NEW ? 'green' : 'grey'} size="sm">
            {CONDITION_LABEL[listing.condition]}
          </Badge>
        </>
      );
    }
    case ListingType.ACCESSORY: {
      const compat = listing.compatibleBrands[0] || 'Universal fit';
      return (
        <>
          {listing.brand && <MetaItem icon={Tag} label={listing.brand} />}
          <MetaItem icon={Wrench} label={compat} />
          {listing.condition && (
            <Badge variant={listing.condition === ListingCondition.NEW ? 'green' : 'grey'} size="sm">
              {CONDITION_LABEL[listing.condition]}
            </Badge>
          )}
        </>
      );
    }
    default:
      return null;
  }
}

function MetaItem({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
      {label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Grid wrapper — same card, same component, works 1-col mobile → 4-col
   desktop. Kept here so every page uses one grid convention instead of
   re-deriving breakpoints per feature file.
   ──────────────────────────────────────────────────────────────────── */

export function ListingCardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid gap-4 sm:gap-5',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}
