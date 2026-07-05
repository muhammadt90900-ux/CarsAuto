'use client';
// components/shared/CarBrandLogo.tsx
//
// Renders an official car brand logo from the Simple Icons CDN.
// Falls back to a colored text-initials badge for brands not in the library.
//
// ── Usage ──────────────────────────────────────────────────────────────────
//   <CarBrandLogo brand="Toyota" />
//   <CarBrandLogo brand="BMW" size="lg" showName />
//   <CarBrandLogo brand="تۆیۆتا / Toyota" size="sm" showName />   ← bilingual OK
//
// ── Design notes ───────────────────────────────────────────────────────────
//   • Logo always sits inside a white rounded container so it is readable
//     on both dark and light backgrounds without any CSS filter hacks.
//   • The Simple Icons CDN serves the brand's official SVG in the exact
//     dark color we request — no runtime JS needed to flip colors.
//   • Images load lazily; a CSS skeleton placeholder prevents layout shift.
//   • When showName is true the brand name renders in the caller's text color.

import { useState } from 'react';
import {
  getBrandLogoUrl,
  getBrandColor,
  getBrandInitials,
  normaliseBrand,
} from '@/lib/brand-logos';

// ── Size tokens ───────────────────────────────────────────────────────────

const SIZES = {
  xs:  { outer: 'w-5 h-5',    inner: 'w-3.5 h-3.5',  text: 'text-[8px]',   gap: 'gap-1.5',  nameSize: 'text-xs'  },
  sm:  { outer: 'w-6 h-6',    inner: 'w-4 h-4',       text: 'text-[9px]',   gap: 'gap-2',    nameSize: 'text-xs'  },
  md:  { outer: 'w-8 h-8',    inner: 'w-5 h-5',       text: 'text-[11px]',  gap: 'gap-2.5',  nameSize: 'text-sm'  },
  lg:  { outer: 'w-11 h-11',  inner: 'w-7 h-7',       text: 'text-[13px]',  gap: 'gap-3',    nameSize: 'text-base'},
  xl:  { outer: 'w-16 h-16',  inner: 'w-10 h-10',     text: 'text-[18px]',  gap: 'gap-3.5',  nameSize: 'text-lg'  },
} as const;

export type BrandLogoSize = keyof typeof SIZES;

interface CarBrandLogoProps {
  brand:      string;
  size?:      BrandLogoSize;
  showName?:  boolean;
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Extra classes on the name span */
  nameClassName?: string;
}

// ── Logo badge ────────────────────────────────────────────────────────────

function LogoBadge({
  brand,
  sizeKey,
}: {
  brand:   string;
  sizeKey: BrandLogoSize;
}) {
  const sz       = SIZES[sizeKey];
  const logoUrl  = getBrandLogoUrl(brand, '1a1a1a');   // dark logo on white bg
  const color    = getBrandColor(brand);
  const initials = getBrandInitials(brand);

  const [imgOk,  setImgOk]  = useState(true);
  const [loaded, setLoaded] = useState(false);

  if (logoUrl && imgOk) {
    return (
      <span
        className={`
          ${sz.outer}
          inline-flex items-center justify-center flex-shrink-0
          rounded-md bg-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.06)]
          overflow-hidden
          relative
        `}
        aria-hidden
      >
        {/* Skeleton while loading */}
        {!loaded && (
          <span className="absolute inset-0 bg-slate-100 dark:bg-white/80 animate-pulse rounded-md" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          className={`
            ${sz.inner}
            object-contain
            transition-opacity duration-200
            ${loaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={() => setLoaded(true)}
          onError={() => setImgOk(false)}
        />
      </span>
    );
  }

  // ── Text-initial fallback ─────────────────────────────────────────────
  return (
    <span
      className={`
        ${sz.outer}
        inline-flex items-center justify-center flex-shrink-0
        rounded-md font-black leading-none select-none
        ${sz.text}
      `}
      style={{ background: `#${color}`, color: 'var(--surface-0)' }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

// ── Public component ──────────────────────────────────────────────────────

export function CarBrandLogo({
  brand,
  size          = 'md',
  showName      = false,
  className     = '',
  nameClassName = '',
}: CarBrandLogoProps) {
  const sz           = SIZES[size];
  const displayName  = normaliseBrand(brand);

  if (!showName) {
    return (
      <span className={`inline-block ${className}`}>
        <LogoBadge brand={brand} sizeKey={size} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${sz.gap} ${className}`}>
      <LogoBadge brand={brand} sizeKey={size} />
      <span className={`${sz.nameSize} ${nameClassName}`}>{displayName}</span>
    </span>
  );
}

// ── Grid variant — for brand selector pages ───────────────────────────────
// Shows a grid of brand logos with names, useful for brand-picker dropdowns.

interface BrandGridProps {
  brands:     string[];
  selected?:  string;
  onSelect:   (brand: string) => void;
  columns?:   2 | 3 | 4 | 5 | 6;
  className?: string;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export function BrandGrid({
  brands,
  selected,
  onSelect,
  columns   = 4,
  className = '',
}: BrandGridProps) {
  return (
    <div className={`grid ${GRID_COLS[columns]} gap-2 ${className}`}>
      {brands.map(b => {
        const name   = normaliseBrand(b);
        const active = selected && normaliseBrand(selected) === name;
        return (
          <button
            key={b}
            type="button"
            onClick={() => onSelect(b)}
            className={`
              flex flex-col items-center gap-1.5 p-2 rounded-xl
              border transition-all duration-150 text-center
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]
              ${active
                ? 'border-[var(--gold)] bg-[var(--gold-subtle)] shadow-[0_0_0_1px_var(--gold)]'
                : 'border-[var(--border-default)] hover:border-[rgba(201,168,76,0.5)] hover:bg-[var(--surface-elevated)]'
              }
            `}
          >
            <LogoBadge brand={b} sizeKey="md" />
            <span className={`text-[10px] font-semibold leading-tight truncate w-full
              ${active ? 'text-[var(--gold)]' : 'text-[var(--text-secondary)]'}`}>
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Pill variant — compact selected-brand display ─────────────────────────

export function BrandPill({
  brand,
  onRemove,
  size = 'xs',
}: {
  brand:     string;
  onRemove?: () => void;
  size?:     BrandLogoSize;
}) {
  const sz   = SIZES[size];
  const name = normaliseBrand(brand);
  return (
    <span className={`
      inline-flex items-center ${sz.gap}
      px-2.5 py-1 rounded-full
      bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.3)]
      text-[var(--gold)] text-xs font-semibold
    `}>
      <LogoBadge brand={brand} sizeKey={size} />
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center
                     hover:bg-[rgba(201,168,76,0.2)] transition-colors ml-0.5"
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
