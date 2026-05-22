// apps/web/src/components/features/home/HeroSearch.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, ChevronDown, Sparkles, ArrowRight } from 'lucide-react';

/* ── Types ────────────────────────────────────────────────── */
type Category = 'cars' | 'motorcycles' | 'parts';

interface Market {
  code: string;
  label: string;
  flag: string;
  city: string;
}

/* ── Static data ──────────────────────────────────────────── */
const MARKETS: Market[] = [
  { code: 'IQ',  label: 'Iraq',       flag: '🇮🇶', city: 'Baghdad'  },
  { code: 'KRD', label: 'Kurdistan',  flag: '🏔️', city: 'Erbil'    },
  { code: 'AE',  label: 'Dubai',      flag: '🇦🇪', city: 'Dubai'    },
  { code: 'CN',  label: 'China',      flag: '🇨🇳', city: 'Shanghai' },
];

const QUICK_LINKS = [
  'Toyota Camry',
  'BMW 5 Series',
  'Mercedes GLE',
  'Kia Sportage',
  'Hyundai Tucson',
];

const STATS = [
  { value: '24K+', label: 'Verified Listings' },
  { value: '4',    label: 'Markets'           },
  { value: '99%',  label: 'Trusted Sellers'   },
];

const CATEGORY_LABELS: Record<Category, string> = {
  cars:        'Cars',
  motorcycles: 'Motorcycles',
  parts:       'Spare Parts',
};

/* ── Component ────────────────────────────────────────────── */
export function HeroSearch() {
  const [query,          setQuery]         = useState<string>('');
  const [selectedMarket, setSelectedMarket] = useState<Market>(MARKETS[0]!);
  const [marketOpen,     setMarketOpen]     = useState<boolean>(false);
  const [category,       setCategory]       = useState<Category>('cars');
  const [focusedIdx,     setFocusedIdx]     = useState<number>(-1);

  const dropdownRef   = useRef<HTMLDivElement>(null);
  const triggerRef    = useRef<HTMLButtonElement>(null);
  const optionRefs    = useRef<(HTMLButtonElement | null)[]>([]);

  /* Close dropdown on outside click / Escape */
  useEffect(() => {
    if (!marketOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMarketOpen(false);
        setFocusedIdx(-1);
        triggerRef.current?.focus();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((p) => {
          const next = Math.min(p + 1, MARKETS.length - 1);
          optionRefs.current[next]?.focus();
          return next;
        });
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((p) => {
          const prev = Math.max(p - 1, 0);
          optionRefs.current[prev]?.focus();
          return prev;
        });
      }
    };

    const handlePointer = (e: PointerEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node) &&
          !triggerRef.current?.contains(e.target as Node)) {
        setMarketOpen(false);
        setFocusedIdx(-1);
      }
    };

    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handlePointer);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handlePointer);
    };
  }, [marketOpen]);

  /* Focus first option when dropdown opens */
  useEffect(() => {
    if (marketOpen) {
      const idx = MARKETS.findIndex((m) => m.code === selectedMarket.code);
      setFocusedIdx(idx);
      // defer to let DOM paint
      requestAnimationFrame(() => optionRefs.current[idx]?.focus());
    }
  }, [marketOpen, selectedMarket.code]);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setMarketOpen(false);
    setFocusedIdx(-1);
    triggerRef.current?.focus();
  };

  const handleSearch = () => {
    /* hook up to router / search handler here */
  };

  const handleKeySubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <section className="hs-root" aria-label="Vehicle search">
      {/* ── decorative background (hidden from AT) ── */}
      <div className="hs-bg" aria-hidden="true">
        <div className="hs-mesh" />
        <div className="hs-orb hs-orb--1" />
        <div className="hs-orb hs-orb--2" />
        <div className="hs-orb hs-orb--3" />
        <div className="hs-grain" />
      </div>

      <div className="hs-inner">

        {/* ── badge ── */}
        <div className="hs-badge" aria-hidden="true">
          <Sparkles size={13} aria-hidden="true" />
          <span>Premium Automotive Marketplace</span>
        </div>

        {/* ── headline ── */}
        <h1 className="hs-heading">
          Find Your Perfect{' '}
          <span className="hs-heading--accent">Vehicle</span>
          <span className="hs-heading--ghost"> Anywhere</span>
        </h1>

        <p className="hs-sub">
          Iraq · Kurdistan · Dubai · China{' '}
          <span aria-hidden="true">—</span>
          <span className="sr-only">–</span>{' '}
          one platform, every dream car.
        </p>

        {/* ── search card ── */}
        <div
          className="hs-card"
          role="search"
          aria-label={`Search ${CATEGORY_LABELS[category]}`}
        >
          {/* category tabs */}
          <div className="hs-tabs" role="tablist" aria-label="Vehicle category">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                aria-controls="hs-search-panel"
                id={`hs-tab-${cat}`}
                onClick={() => setCategory(cat)}
                className={`hs-tab${category === cat ? ' hs-tab--active' : ''}`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* search panel */}
          <div
            id="hs-search-panel"
            role="tabpanel"
            aria-labelledby={`hs-tab-${category}`}
            className="hs-row"
          >
            {/* ── market picker ── */}
            <div className="hs-market" ref={dropdownRef}>
              <button
                ref={triggerRef}
                type="button"
                className="hs-market__btn"
                onClick={() => setMarketOpen((p) => !p)}
                aria-haspopup="listbox"
                aria-expanded={marketOpen}
                aria-label={`Select market, currently ${selectedMarket.label}`}
              >
                <MapPin size={14} className="hs-market__pin" aria-hidden="true" />
                <span className="hs-market__flag" aria-hidden="true">
                  {selectedMarket.flag}
                </span>
                <span className="hs-market__label">{selectedMarket.label}</span>
                <ChevronDown
                  size={14}
                  className={`hs-market__chevron${marketOpen ? ' hs-market__chevron--open' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {marketOpen && (
                <ul
                  className="hs-market__dropdown"
                  role="listbox"
                  aria-label="Select market"
                  aria-activedescendant={
                    focusedIdx >= 0 ? `hs-market-opt-${MARKETS[focusedIdx]?.code}` : undefined
                  }
                >
                  {MARKETS.map((m, idx) => (
                    <li key={m.code} role="presentation">
                      <button
                        ref={(el) => { optionRefs.current[idx] = el; }}
                        id={`hs-market-opt-${m.code}`}
                        type="button"
                        role="option"
                        aria-selected={m.code === selectedMarket.code}
                        className={`hs-market__option${m.code === selectedMarket.code ? ' hs-market__option--active' : ''}`}
                        onClick={() => handleSelectMarket(m)}
                      >
                        <span aria-hidden="true">{m.flag}</span>
                        <span>{m.label}</span>
                        <span className="hs-market__city" aria-label={`, ${m.city}`}>
                          {m.city}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hs-sep" aria-hidden="true" />

            {/* ── text input ── */}
            <div className="hs-input-wrap">
              <Search size={18} className="hs-input__icon" aria-hidden="true" />
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                id="hs-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeySubmit}
                placeholder={`Search ${CATEGORY_LABELS[category]}…`}
                className="hs-input"
                aria-label={`Search ${CATEGORY_LABELS[category]} in ${selectedMarket.label}`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            {/* ── CTA ── */}
            <button
              type="button"
              className="hs-cta"
              onClick={handleSearch}
              aria-label={`Search ${CATEGORY_LABELS[category]}`}
            >
              <span className="hs-cta__text">Search</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── quick links ── */}
        <nav className="hs-quick" aria-label="Popular searches">
          <span className="hs-quick__label" aria-hidden="true">Popular:</span>
          {QUICK_LINKS.map((term) => (
            <button
              key={term}
              type="button"
              className="hs-chip"
              onClick={() => setQuery(term)}
              aria-label={`Search for ${term}`}
            >
              {term}
            </button>
          ))}
        </nav>

        {/* ── stats ── */}
        <dl className="hs-stats" aria-label="Marketplace stats">
          {STATS.map((s) => (
            <div key={s.label} className="hs-stat">
              <dt className="hs-stat__label">{s.label}</dt>
              <dd className="hs-stat__value">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── scoped styles ── */}
      <style>{`
        /* sr-only utility */
        .sr-only {
          position: absolute;
          width: 1px; height: 1px;
          padding: 0; margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border-width: 0;
        }

        /* ── root ── */
        .hs-root {
          position: relative;
          overflow: hidden;
          min-height: 100vh; /* fallback */
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5rem 1.25rem 4rem;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* ── background ── */
        .hs-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg,#050810 0%,#0b1120 35%,#0d1a32 65%,#0a0e18 100%);
          z-index: 0;
        }
        .hs-mesh {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 20% 30%, rgba(210,90,30,.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 70%, rgba(30,100,210,.10) 0%, transparent 55%),
            radial-gradient(ellipse 50% 60% at 55% 10%, rgba(255,165,30,.08) 0%, transparent 50%);
        }
        .hs-orb {
          position: absolute; border-radius: 50%;
          filter: blur(80px);
          animation: hs-drift 12s ease-in-out infinite alternate;
        }
        .hs-orb--1 {
          width: 520px; height: 520px;
          inset-block-start: -160px; inset-inline-start: -100px;
          background: radial-gradient(circle, rgba(220,80,20,.22) 0%, transparent 70%);
          animation-duration: 14s;
        }
        .hs-orb--2 {
          width: 420px; height: 420px;
          inset-block-end: -120px; inset-inline-end: -80px;
          background: radial-gradient(circle, rgba(20,90,220,.18) 0%, transparent 70%);
          animation-duration: 10s; animation-delay: -4s;
        }
        .hs-orb--3 {
          width: 300px; height: 300px;
          inset-block-start: 40%; inset-inline-start: 60%;
          background: radial-gradient(circle, rgba(240,160,20,.12) 0%, transparent 70%);
          animation-duration: 16s; animation-delay: -7s;
        }
        .hs-grain {
          position: absolute; inset: 0; opacity: .035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px;
        }
        @keyframes hs-drift {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(30px,20px) scale(1.08); }
        }

        /* ── inner ── */
        .hs-inner {
          position: relative; z-index: 1;
          width: 100%; max-width: 780px;
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
        }

        /* ── badge ── */
        .hs-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 100px;
          border: 1px solid rgba(220,100,30,.35);
          background: rgba(220,100,30,.10);
          backdrop-filter: blur(12px);
          color: #f4a261;
          font-size: .72rem; font-weight: 700; letter-spacing: .07em;
          text-transform: uppercase;
          margin-block-end: 1.6rem;
          animation: hs-fadeup .6s ease both;
        }

        /* ── heading ── */
        .hs-heading {
          font-size: clamp(2.5rem, 7vw, 4.8rem);
          font-weight: 800; line-height: 1.08;
          letter-spacing: -.03em; color: #f0f4ff;
          margin: 0 0 1.1rem;
          animation: hs-fadeup .6s .1s ease both;
        }
        .hs-heading--accent {
          background: linear-gradient(110deg,#ff6b2b 0%,#f4a261 50%,#ffcf77 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hs-heading--ghost { color: rgba(200,215,255,.50); }

        /* ── sub ── */
        .hs-sub {
          color: rgba(180,200,240,.65);
          font-size: clamp(.88rem, 2vw, 1.05rem);
          letter-spacing: .04em;
          margin: 0 0 2.4rem;
          animation: hs-fadeup .6s .2s ease both;
        }

        /* ── card ── */
        .hs-card {
          width: 100%; max-width: 720px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.10);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border-radius: 20px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,.04) inset,
            0 24px 64px rgba(0,0,0,.45),
            0 0 80px rgba(220,80,20,.06);
          animation: hs-fadeup .6s .3s ease both;
          margin-block-end: 1.2rem;
        }

        /* category tabs */
        .hs-tabs {
          display: flex;
          padding: .55rem .55rem 0;
          gap: 4px;
          border-block-end: 1px solid rgba(255,255,255,.07);
        }
        .hs-tab {
          flex: 1;
          min-height: 44px; /* touch target */
          padding: .45rem .5rem;
          font-size: .82rem; font-weight: 600; letter-spacing: .02em;
          color: rgba(180,200,240,.50);
          background: transparent; border: none;
          border-radius: 10px 10px 0 0;
          cursor: pointer;
          transition: color .2s, background .2s;
          font-family: inherit;
        }
        .hs-tab--active { color: #f4a261; background: rgba(244,162,97,.08); }
        .hs-tab:hover:not(.hs-tab--active) { color: rgba(200,215,255,.80); }
        .hs-tab:focus-visible {
          outline: 2px solid rgba(244,162,97,.7);
          outline-offset: -2px;
        }

        /* search row */
        .hs-row {
          display: flex; align-items: center;
          padding: .65rem .65rem .65rem .2rem;
          flex-wrap: nowrap;
        }

        /* ── market picker ── */
        .hs-market { position: relative; flex-shrink: 0; }
        .hs-market__btn {
          display: flex; align-items: center; gap: 5px;
          min-height: 44px;
          padding: .5rem .85rem;
          background: transparent; border: none; border-radius: 12px;
          color: rgba(200,215,255,.80);
          font-size: .82rem; font-weight: 600;
          cursor: pointer; white-space: nowrap;
          transition: background .15s, color .15s;
          font-family: inherit;
        }
        .hs-market__btn:hover { background: rgba(255,255,255,.07); color: #fff; }
        .hs-market__btn:focus-visible {
          outline: 2px solid rgba(244,162,97,.7);
          outline-offset: 2px; border-radius: 12px;
        }
        .hs-market__pin { color: #f4a261; flex-shrink: 0; }
        .hs-market__flag { font-size: 1rem; }
        .hs-market__label { font-size: .82rem; }
        .hs-market__chevron { transition: transform .2s; flex-shrink: 0; }
        .hs-market__chevron--open { transform: rotate(180deg); }

        .hs-market__dropdown {
          position: absolute;
          inset-block-start: calc(100% + 8px);
          inset-inline-start: 0;
          min-width: 185px;
          background: rgba(12,20,38,.97);
          border: 1px solid rgba(255,255,255,.10);
          backdrop-filter: blur(24px);
          border-radius: 14px;
          padding: 6px;
          list-style: none; margin: 0;
          z-index: 50;
          box-shadow: 0 16px 48px rgba(0,0,0,.55);
          animation: hs-dropin .15s ease both;
        }
        @keyframes hs-dropin {
          from { opacity:0; transform:translateY(-6px) scale(.97); }
          to   { opacity:1; transform:none; }
        }
        .hs-market__option {
          display: flex; align-items: center; gap: 8px;
          width: 100%;
          min-height: 44px;
          padding: 8px 10px;
          background: transparent; border: none; border-radius: 9px;
          color: rgba(200,215,255,.75);
          font-size: .83rem; cursor: pointer; text-align: start;
          transition: background .15s, color .15s;
          font-family: inherit;
        }
        .hs-market__option:hover,
        .hs-market__option--active {
          background: rgba(244,162,97,.12); color: #f4a261;
        }
        .hs-market__option:focus-visible {
          outline: 2px solid rgba(244,162,97,.7);
          outline-offset: -2px; border-radius: 9px;
        }
        .hs-market__city {
          margin-inline-start: auto;
          font-size: .72rem; color: rgba(180,200,240,.40);
        }

        /* divider */
        .hs-sep {
          width: 1px; height: 28px;
          background: rgba(255,255,255,.12);
          flex-shrink: 0; margin-inline: 2px;
        }

        /* text input */
        .hs-input-wrap {
          flex: 1; display: flex; align-items: center; gap: 10px;
          padding-inline: .75rem;
          min-width: 0;
        }
        .hs-input__icon { color: rgba(180,200,240,.40); flex-shrink: 0; }
        .hs-input {
          flex: 1; min-width: 0;
          background: transparent; border: none; outline: none;
          color: #fff;
          font-size: 1rem; /* ≥16 px prevents iOS auto-zoom */
          font-family: inherit;
          /* hide browser native search-cancel button */
          -webkit-appearance: none; appearance: none;
        }
        .hs-input::-webkit-search-cancel-button { display: none; }
        .hs-input::placeholder { color: rgba(180,200,240,.35); }
        .hs-input:focus-visible { outline: none; } /* handled by card focus-within */
        .hs-card:focus-within {
          box-shadow:
            0 0 0 1px rgba(255,255,255,.04) inset,
            0 24px 64px rgba(0,0,0,.45),
            0 0 0 3px rgba(244,162,97,.30);
        }

        /* CTA */
        .hs-cta {
          flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 6px;
          min-height: 44px;
          padding: .65rem 1.4rem;
          background: linear-gradient(135deg,#e55a1a 0%,#f4a261 100%);
          border: none; border-radius: 13px;
          color: #fff;
          font-size: .88rem; font-weight: 700; letter-spacing: .02em;
          cursor: pointer; white-space: nowrap;
          box-shadow: 0 4px 20px rgba(220,80,20,.45), 0 0 0 1px rgba(255,200,150,.15) inset;
          transition: transform .15s, box-shadow .15s, filter .15s;
          font-family: inherit;
        }
        .hs-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(220,80,20,.55), 0 0 0 1px rgba(255,200,150,.20) inset;
          filter: brightness(1.06);
        }
        .hs-cta:active { transform: none; }
        .hs-cta:focus-visible {
          outline: 2px solid rgba(255,200,150,.80);
          outline-offset: 3px;
        }

        /* ── quick links ── */
        .hs-quick {
          display: flex; flex-wrap: wrap;
          align-items: center; justify-content: center;
          gap: 6px;
          animation: hs-fadeup .6s .4s ease both;
          margin-block-end: 2.8rem;
        }
        .hs-quick__label {
          font-size: .75rem; color: rgba(180,200,240,.40);
          letter-spacing: .04em; text-transform: uppercase; font-weight: 600;
          margin-inline-end: 2px;
        }
        .hs-chip {
          min-height: 44px;
          padding: 0 14px;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(200,215,255,.65);
          font-size: .78rem; cursor: pointer; white-space: nowrap;
          transition: border-color .15s, color .15s, background .15s;
          font-family: inherit;
        }
        .hs-chip:hover {
          border-color: rgba(244,162,97,.40);
          color: #f4a261; background: rgba(244,162,97,.07);
        }
        .hs-chip:focus-visible {
          outline: 2px solid rgba(244,162,97,.70);
          outline-offset: 2px;
        }

        /* ── stats ── */
        .hs-stats {
          display: flex; gap: 2.5rem;
          animation: hs-fadeup .6s .5s ease both;
          margin: 0;
        }
        .hs-stat {
          display: flex; flex-direction: column-reverse; /* value on top visually */
          align-items: center; gap: 2px;
        }
        .hs-stat__value {
          font-size: 1.55rem; font-weight: 800; letter-spacing: -.03em;
          background: linear-gradient(135deg,#fff 0%,rgba(200,215,255,.75) 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hs-stat__label {
          font-size: .72rem; color: rgba(180,200,240,.55);
          letter-spacing: .05em; text-transform: uppercase; font-weight: 600;
        }

        /* ── animation ── */
        @keyframes hs-fadeup {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hs-badge, .hs-heading, .hs-sub, .hs-card,
          .hs-quick, .hs-stats, .hs-orb {
            animation: none !important;
          }
        }

        /* ── responsive: ≤600 px ── */
        @media (max-width: 600px) {
          .hs-root  { padding: 4.5rem 1rem 3.5rem; }
          .hs-row   {
            flex-wrap: wrap;
            padding: .5rem;
            gap: 6px;
          }
          /* layout: [market][cta]  then [input full-width] */
          .hs-market    { order: 1; }
          .hs-sep       { display: none; }
          .hs-input-wrap {
            order: 3;
            width: 100%;
            border-block-start: 1px solid rgba(255,255,255,.07);
            padding: .5rem .6rem;
          }
          .hs-cta {
            order: 2;
            margin-inline-start: auto;
            padding-inline: 1.1rem;
          }
          .hs-stats { gap: 1.5rem; }
          .hs-stat__value { font-size: 1.3rem; }
          .hs-quick { gap: 5px; }
          .hs-market__dropdown {
            /* prevent clipping on narrow screens */
            inset-inline-start: 0;
            inset-inline-end: auto;
            max-width: calc(100vw - 2rem);
          }
        }
        @media (max-width: 400px) {
          .hs-heading { font-size: 2.2rem; }
          .hs-card    { border-radius: 16px; }
          .hs-stats   { gap: 1rem; }
          .hs-tab     { font-size: .75rem; }
        }

        /* ── RTL ── */
        [dir="rtl"] .hs-market__dropdown {
          inset-inline-start: auto;
          inset-inline-end: 0;
        }
        [dir="rtl"] .hs-heading {
          letter-spacing: 0; /* Arabic doesn't use negative tracking */
        }
      `}</style>
    </section>
  );
}
