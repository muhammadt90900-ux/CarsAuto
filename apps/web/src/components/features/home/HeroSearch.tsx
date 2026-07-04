'use client';
// components/features/home/HeroSearch.tsx

import { useState, useReducer, useRef, useEffect, useCallback, useMemo } from 'react';
import { CarBrandLogo, BrandGrid } from '@/components/shared/CarBrandLogo';
import {
  Search, ChevronDown, SlidersHorizontal, X,
  MapPin, Zap, Clock, TrendingUp, Star,
} from 'lucide-react';
import {
  MAKES, MODELS, YEARS, CITIES, COUNTRIES, FUEL_TYPES, TRANSMISSIONS,
  CONDITIONS, COLORS, PRICE_RANGES, CATEGORIES, TRENDING_SEARCHES,
  QUICK_SEARCHES, POPULAR_VEHICLES, STATS, SUGGESTIONS_MAP,
} from '@/data/heroSearchData';

/* ── Local-storage search history ───────────────────────────── */
const HISTORY_KEY = 'hero_search_history_v1';
function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}
function saveHistory(term: string) {
  if (!term.trim()) return;
  try {
    const h = [term, ...loadHistory().filter(t => t !== term)].slice(0, 8);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {}
}
function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

/* ── Fuzzy suggestion helper ─────────────────────────────────── */
function getSuggestions(query: string): string[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const explicit = Object.entries(SUGGESTIONS_MAP)
    .filter(([k]) => q.startsWith(k) || k.startsWith(q))
    .flatMap(([, v]) => v);
  const brandMatches = MAKES
    .filter(m => m.toLowerCase().includes(q))
    .flatMap(m => (MODELS[m] ?? []).slice(0, 2).map(mod => `${m.split('/')[1]?.trim() ?? m} ${mod}`));
  return [...new Set([...explicit, ...brandMatches])].slice(0, 6);
}

/* ── Dropdown ────────────────────────────────────────────────── */
interface DropdownProps {
  label: string; value: string; options: string[];
  onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}
function Dropdown({ label, value, options, onChange, placeholder, disabled }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`
          w-full flex items-center justify-between gap-2 px-4 py-3
          rounded-xl text-sm text-left transition-all duration-200 border
          ${disabled
            ? 'opacity-40 cursor-not-allowed bg-white/[0.03] border-white/[0.06]'
            : open
              ? 'bg-[#c9a84c]/[0.10] border-[#c9a84c]/60 shadow-[0_0_0_3px_rgba(201,168,76,0.12)]'
              : 'bg-white/[0.05] border-white/[0.10] hover:bg-white/[0.08] hover:border-[#c9a84c]/30 cursor-pointer'
          }
        `}
      >
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="text-[9px] uppercase tracking-[0.12em] text-[#c9a84c]/70 font-bold">{label}</span>
          <span className={`truncate text-sm font-medium ${value ? 'text-white' : 'text-white/30'}`}>
            {value || placeholder || '---'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${open ? 'rotate-180 text-[#c9a84c]' : 'text-white/30'}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50
                        bg-[#0b1525]/98 backdrop-blur-2xl
                        border border-[#c9a84c]/20 rounded-xl
                        shadow-[0_16px_48px_rgba(0,0,0,0.70)] overflow-hidden">
          <div className="max-h-52 overflow-y-auto no-scrollbar">
            <div
              onClick={() => { onChange(''); setOpen(false); }}
              className="px-4 py-2.5 text-white/35 text-xs cursor-pointer
                         hover:bg-white/[0.05] hover:text-white/60
                         border-b border-white/[0.06] transition-colors"
            >
              {placeholder || 'هەموو / All'}
            </div>
            {options.map(opt => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150
                  ${value === opt
                    ? 'bg-[#c9a84c]/[0.15] text-[#c9a84c] font-semibold'
                    : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Filters state (useReducer) ───────────────────────────────── */
interface FiltersState {
  category: string; make: string; model: string;
  yearFrom: string; yearTo: string; city: string; country: string;
  price: string; condition: string; fuelType: string;
  transmission: string; color: string; minMileage: string; maxMileage: string;
}
const initialFilters: FiltersState = {
  category: 'cars', make: '', model: '', yearFrom: '', yearTo: '',
  city: '', country: '', price: '', condition: '', fuelType: '',
  transmission: '', color: '', minMileage: '', maxMileage: '',
};
type FiltersAction =
  | { type: 'SET'; field: keyof FiltersState; value: string }
  | { type: 'RESET' };
function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      // Mirrors the original resetFilters(): clears filter fields but
      // preserves `category`, which behaves like a tab, not a filter.
      return {
        ...state,
        make: '', model: '', yearFrom: '', yearTo: '',
        city: '', country: '', price: '', condition: '',
        fuelType: '', transmission: '', color: '',
        minMileage: '', maxMileage: '',
      };
    default:
      return state;
  }
}

/* ── UI open/closed state ─────────────────────────────────────── */
interface UiState {
  showAdvanced: boolean; showPopular: boolean; focused: boolean; showDropdown: boolean;
}
const initialUi: UiState = { showAdvanced: false, showPopular: false, focused: false, showDropdown: false };

/* ── Search / autocomplete state ──────────────────────────────── */
interface SearchState {
  query: string; suggestions: string[]; history: string[];
}
const initialSearchState: SearchState = { query: '', suggestions: [], history: [] };

/* ── Main HeroSearch ─────────────────────────────────────────── */
export function HeroSearch() {
  const [filters, dispatchFilters] = useReducer(filtersReducer, initialFilters);
  const [ui, setUi] = useState<UiState>(initialUi);
  const [search, setSearch] = useState<SearchState>(initialSearchState);

  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const setFilter = useCallback((field: keyof FiltersState, value: string) => {
    dispatchFilters({ type: 'SET', field, value });
  }, []);

  const activeModels = useMemo(
    () => (filters.make && MODELS[filters.make] ? MODELS[filters.make] : []),
    [filters.make],
  );

  const activeFiltersCount = useMemo(
    () => [
      filters.make, filters.model, filters.yearFrom, filters.yearTo,
      filters.city, filters.country, filters.price, filters.condition,
      filters.fuelType, filters.transmission, filters.color,
      filters.minMileage, filters.maxMileage,
    ].filter(Boolean).length,
    [filters],
  );

  useEffect(() => { setSearch(s => ({ ...s, history: loadHistory() })); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (search.query.length >= 2) {
      const q = search.query;
      debounceRef.current = setTimeout(() => {
        setSearch(s => ({ ...s, suggestions: getSuggestions(q) }));
      }, 150);
    } else {
      setSearch(s => ({ ...s, suggestions: [] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.query]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUi(s => ({ ...s, showDropdown: false, focused: false }));
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSearch = useCallback((term = search.query) => {
    if (term.trim()) {
      saveHistory(term);
      setSearch(s => ({ ...s, history: loadHistory() }));
    }
    setUi(s => ({ ...s, showDropdown: false, focused: false }));
  }, [search.query]);

  const handleSuggestionClick = (s: string) => {
    setSearch(prev => ({ ...prev, query: s }));
    handleSearch(s);
  };

  const resetFilters = () => dispatchFilters({ type: 'RESET' });

  const showSuggestionPanel = ui.showDropdown && ui.focused &&
    (search.suggestions.length > 0 || search.history.length > 0 || search.query.length === 0);

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(175deg, #050b14 0%, #080f1c 35%, #0b1525 65%, #050b14 100%)',
        minHeight: 'calc(100vh * 0.82)',
      }}
    >
      {/* ── Background atmosphere ──────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage:'radial-gradient(circle, rgba(201,168,76,0.8) 1px, transparent 1px)', backgroundSize:'40px 40px' }} />
        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full"
          style={{ background:'radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 65%)', filter:'blur(40px)' }} />
        {/* Top-right accent */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{ background:'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 60%)', filter:'blur(80px)' }} />
        {/* Bottom-left blue */}
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background:'radial-gradient(circle, rgba(14,60,120,0.12) 0%, transparent 60%)', filter:'blur(80px)' }} />
        {/* Moving sweep shimmer */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ background:'linear-gradient(45deg, transparent 40%, rgba(201,168,76,1) 50%, transparent 60%)', backgroundSize:'200% 200%', animation:'sweep 8s ease-in-out infinite' }} />
        {/* Top fade (navbar bleed) */}
        <div className="absolute top-0 inset-x-0 h-[68px] bg-gradient-to-b from-[#050b14] to-transparent" />
        {/* Enterprise grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.022]"
          style={{
            backgroundImage: 'linear-gradient(rgba(201,168,76,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.08) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }} />
      </div>

      <style>{`
        @keyframes sweep { 0%,100%{background-position:-100% -100%} 50%{background-position:100% 100%} }
        @keyframes heroFadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes countUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .hero-line-1{animation:heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both}
        .hero-line-2{animation:heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both}
        .hero-line-3{animation:heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both}
        .hero-card  {animation:heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both}
        .stat-item  {animation:countUp    0.6s cubic-bezier(0.16,1,0.3,1) both}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .dropdown-anim{animation:fadeIn 0.18s ease-out both}
        @keyframes pulseGold{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4)}70%{box-shadow:0 0 0 8px rgba(201,168,76,0)}}
        .pulse-gold{animation:pulseGold 2s infinite}
      `}</style>

      {/* ── Content ────────────────────────────────────────────── */}
      <div
        className="relative z-10 w-full max-w-5xl mx-auto px-4"
        style={{ paddingTop:'calc(68px + 4rem)', paddingBottom:'4rem' }}
      >

        {/* Live badge */}
        <div className="flex justify-center mb-6 hero-line-1">
          <span className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-xs font-bold bg-[#c9a84c]/[0.09] border border-[#c9a84c]/22 text-[#c9a84c] shadow-[0_0_32px_rgba(201,168,76,0.06)] backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse pulse-gold" />
            <span className="text-[#c9a84c]/65">🇮🇶</span>
            <span className="text-white/50">Iraq</span>
            <span className="text-white/15">·</span>
            <span className="text-[#c9a84c]/65">🇦🇪</span>
            <span className="text-white/50">UAE</span>
            <span className="text-white/15">·</span>
            <span className="text-[#c9a84c]/65">🇨🇳</span>
            <span className="text-white/50">China</span>
          </span>
        </div>

        {/* Headline */}
        <div className="text-center mb-8 hero-line-2">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl
                         font-extrabold text-white leading-[1.08] tracking-tight mb-4">
            دۆزینەوەی{' '}
            <span className="relative" style={{ background: 'linear-gradient(135deg, #f0d87a 0%, #c9a84c 50%, #b8922e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ئۆتۆمبێلی
              <svg className="absolute -bottom-1 left-0 w-full" height="4" viewBox="0 0 200 4" preserveAspectRatio="none">
                <path d="M0,2 Q50,0 100,2 Q150,4 200,2" stroke="#c9a84c" strokeWidth="2" fill="none" opacity="0.5"/>
              </svg>
            </span>
            {' '}تەواوت
          </h1>
          <p className="text-white/45 text-sm sm:text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed">
            Find Your Perfect Vehicle Across the Middle East &amp; Beyond
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 justify-center mb-6 hero-line-3">
          {CATEGORIES.map(({ id, label, labelEn, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setFilter('category', id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-250
                ${filters.category === id
                  ? 'bg-gradient-to-r from-[#a87828] via-[#c9a84c] to-[#dab445] text-[#050b14] shadow-[0_6px_28px_rgba(201,168,76,0.45)] ring-1 ring-[#c9a84c]/25 scale-[1.03]'
                  : 'bg-white/[0.04] border border-white/[0.08] text-white/45 hover:bg-[#c9a84c]/[0.07] hover:text-white/90 hover:border-[#c9a84c]/28 hover:shadow-[0_4px_16px_rgba(201,168,76,0.10)] hover:scale-[1.01]'
                }`}
            >
              <Icon className={`w-4 h-4 transition-colors ${filters.category === id ? 'text-[#050b14]' : id === 'cars' ? 'text-sky-400' : id === 'parts' ? 'text-orange-400' : 'text-emerald-400'}`} />
              <span className="hidden xs:inline">{label}</span>
              <span className="hidden sm:inline text-[10px] opacity-60">/ {labelEn}</span>
            </button>
          ))}
        </div>

        {/* Quick category filters below tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-5 hero-line-3">
          {['New', 'Used', 'Electric', 'Under $20k', 'Luxury', '4×4'].map(tag => (
            <button
              key={tag}
              className="px-3 py-1 rounded-full text-[11px] font-semibold
                         bg-white/[0.05] border border-white/[0.10] text-white/45
                         hover:bg-[#c9a84c]/10 hover:border-[#c9a84c]/30 hover:text-[#c9a84c]
                         transition-all duration-200"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* ── Search Card ─────────────────────────────────────── */}
        <div
          className={`hero-card rounded-2xl border transition-all duration-350 overflow-visible
                       ${ui.focused
                         ? 'border-[#c9a84c]/55 shadow-[0_0_0_1px_rgba(201,168,76,0.14),0_24px_72px_rgba(0,0,0,0.55),0_0_48px_rgba(201,168,76,0.05)]'
                         : 'border-white/[0.09] shadow-[0_12px_40px_rgba(0,0,0,0.40)]'
                       }`}
          style={{ background:'linear-gradient(135deg, rgba(11,21,37,0.85) 0%, rgba(8,15,28,0.90) 100%)', backdropFilter:'blur(24px)' }}
        >
          {/* Search input + autocomplete */}
          <div ref={dropdownRef} className="relative">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
              <Search className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${ui.focused ? 'text-[#c9a84c]' : 'text-white/25'}`} />
              <input
                ref={inputRef}
                type="text"
                value={search.query}
                onChange={e => { setSearch(s => ({ ...s, query: e.target.value })); setUi(s => ({ ...s, showDropdown: true })); }}
                onFocus={() => setUi(s => ({ ...s, focused: true, showDropdown: true }))}
                placeholder="گەڕان بکە... Toyota Land Cruiser، بەغدا، BMW 2023..."
                className="flex-1 bg-transparent text-white placeholder-white/25
                           outline-none text-base font-medium caret-[#c9a84c] hero-search-input"
                dir="rtl"
              />
              {search.query && (
                <button
                  onClick={() => { setSearch(s => ({ ...s, query: '', suggestions: [] })); inputRef.current?.focus(); }}
                  className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0"
                  aria-label="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestion / History / Trending panel */}
            {showSuggestionPanel && (
              <div className="dropdown-anim absolute top-full left-0 right-0 z-50 mt-1
                              bg-[#0b1525]/98 backdrop-blur-2xl border border-[#c9a84c]/20
                              rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.70)] overflow-hidden">

                {search.suggestions.length > 0 && (
                  <div className="border-b border-white/[0.06]">
                    <div className="px-4 pt-2.5 pb-1 text-[9px] uppercase tracking-[0.12em] text-[#c9a84c]/60 font-bold">
                      پێشنیار / Suggestions
                    </div>
                    {search.suggestions.map(s => {
                      const parts = s.split(new RegExp(`(${search.query})`, 'gi'));
                      return (
                        <div key={s} onClick={() => handleSuggestionClick(s)}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm
                                     text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors">
                          <Search className="w-3.5 h-3.5 text-[#c9a84c]/50 flex-shrink-0" />
                          <span>
                            {parts.map((p, i) =>
                              p.toLowerCase() === search.query.toLowerCase()
                                ? <strong key={i} className="text-[#c9a84c] font-semibold">{p}</strong>
                                : p
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {search.history.length > 0 && (
                  <div className="border-b border-white/[0.06]">
                    <div className="px-4 pt-2.5 pb-1 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-[0.12em] text-white/40 font-bold">
                        دواین گەڕانەکان / Recent
                      </span>
                      <button onClick={() => { clearHistory(); setSearch(s => ({ ...s, history: [] })); }}
                        className="text-[9px] text-white/25 hover:text-red-400 transition-colors">
                        سڕینەوە / Clear
                      </button>
                    </div>
                    {search.history.slice(0, 5).map(h => (
                      <div key={h} onClick={() => handleSuggestionClick(h)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm
                                   text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors">
                        <Clock className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                        {h}
                      </div>
                    ))}
                  </div>
                )}

                {search.query.length === 0 && (
                  <div>
                    <div className="px-4 pt-2.5 pb-1 text-[9px] uppercase tracking-[0.12em] text-white/40 font-bold">
                      گەڕانی گەرمەکان / Trending
                    </div>
                    {TRENDING_SEARCHES.map(t => (
                      <div key={t} onClick={() => handleSuggestionClick(t)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm
                                   text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors">
                        <TrendingUp className="w-3.5 h-3.5 text-[#c9a84c]/50 flex-shrink-0" />
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter row */}
          <div className="p-3">
            {/* Mobile: 2-col grid; md+: single flex row */}
            <div className="grid grid-cols-2 md:flex md:flex-nowrap gap-2 items-stretch">
              <Dropdown label="براند" value={filters.make} options={MAKES}
                onChange={v => { setFilter('make', v); setFilter('model', ''); }} placeholder="هەموو براندەکان" />
              {/* Brand logo quick-picks */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {MAKES.slice(0, 8).map(m => {
                  const name = m.split(' / ').find((p: string) => /^[A-Za-z]/.test(p.trim())) ?? m;
                  const active = filters.make === m;
                  return (
                    <button key={m} type="button" onClick={() => setFilter('make', active ? '' : m)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium
                        transition-all duration-150
                        ${active
                          ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]'
                          : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white/80'}`}>
                      <CarBrandLogo brand={m} size="xs" />
                      {name}
                    </button>
                  );
                })}
              </div>
              <Dropdown label="مۆدێل" value={filters.model} options={activeModels}
                onChange={v => setFilter('model', v)} placeholder="مۆدێل هەڵبژێرە" disabled={!filters.make} />
              <Dropdown label="شار" value={filters.city} options={CITIES}
                onChange={v => setFilter('city', v)} placeholder="هەموو شارەکان" />
              <Dropdown label="نرخ" value={filters.price} options={PRICE_RANGES}
                onChange={v => setFilter('price', v)} placeholder="هەموو نرخەکان" />
              <button
                type="button"
                onClick={() => handleSearch()}
                className="col-span-2 md:col-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap flex-shrink-0
                           bg-gradient-to-r from-[#b8922e] to-[#dab445] text-[#050b14]
                           hover:from-[#c9a84c] hover:to-[#e6c258]
                           shadow-[0_4px_20px_rgba(201,168,76,0.30)]
                           transition-all duration-200 active:scale-[0.98]"
              >
                <Search className="w-4 h-4" />
                گەڕان
              </button>
            </div>

            {/* Advanced toggle */}
            <div className="mt-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setUi(s => ({ ...s, showAdvanced: !s.showAdvanced }))}
                className="flex items-center gap-1.5 text-xs text-white/35 hover:text-[#c9a84c] transition-colors duration-200"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>فلتەری پیشکەوتوو / Advanced Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-[#c9a84c] text-[#050b14] text-[9px] font-black
                                   rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${ui.showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {activeFiltersCount > 0 && (
                <button type="button" onClick={resetFilters}
                  className="text-xs text-white/25 hover:text-red-400 transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" />
                  سڕینەوەی فلتەرەکان
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <div
            className="overflow-hidden transition-all duration-350"
            style={{ maxHeight: ui.showAdvanced ? '500px' : '0' }}
          >
            <div className="px-3 pb-4 pt-3 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                <div className="flex items-center gap-2">
                  <Dropdown label="ساڵی دەستپێک" value={filters.yearFrom} options={YEARS} onChange={v => setFilter('yearFrom', v)} placeholder="2000" />
                  <span className="text-white/20 text-sm flex-shrink-0 mt-3">—</span>
                  <Dropdown label="ساڵی کۆتایی"  value={filters.yearTo}   options={YEARS} onChange={v => setFilter('yearTo', v)}   placeholder="2025" />
                </div>

                <Dropdown label="وڵات / Country"            value={filters.country}      options={COUNTRIES}     onChange={v => setFilter('country', v)}      placeholder="هەموو وڵاتەکان" />
                <Dropdown label="جۆری سووتەمەنی / Fuel"     value={filters.fuelType}     options={FUEL_TYPES}    onChange={v => setFilter('fuelType', v)}     placeholder="هەموو جۆرەکان" />
                <Dropdown label="گێرکردن / Transmission"    value={filters.transmission} options={TRANSMISSIONS} onChange={v => setFilter('transmission', v)} placeholder="هەموو جۆرەکان" />
                <Dropdown label="ڕەنگ / Color"              value={filters.color}        options={COLORS}        onChange={v => setFilter('color', v)}        placeholder="هەموو ڕەنگەکان" />

                <div className="flex items-center gap-2">
                  <div className="flex-1 flex flex-col min-w-0 gap-0.5">
                    <span className="text-[9px] uppercase tracking-[0.12em] text-[#c9a84c]/70 font-bold">کێلۆمەتری کەم / Min KM</span>
                    <input type="number" value={filters.minMileage} onChange={e => setFilter('minMileage', e.target.value)}
                      placeholder="0"
                      className="bg-white/[0.05] border border-white/[0.10] rounded-xl
                                 px-3 py-2 text-sm text-white placeholder-white/25
                                 outline-none focus:border-[#c9a84c]/60 transition-colors" />
                  </div>
                  <span className="text-white/20 text-sm flex-shrink-0 mt-3">—</span>
                  <div className="flex-1 flex flex-col min-w-0 gap-0.5">
                    <span className="text-[9px] uppercase tracking-[0.12em] text-[#c9a84c]/70 font-bold">کێلۆمەتری زۆر / Max KM</span>
                    <input type="number" value={filters.maxMileage} onChange={e => setFilter('maxMileage', e.target.value)}
                      placeholder="300,000"
                      className="bg-white/[0.05] border border-white/[0.10] rounded-xl
                                 px-3 py-2 text-sm text-white placeholder-white/25
                                 outline-none focus:border-[#c9a84c]/60 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Condition chips */}
              <div className="mt-4">
                <span className="text-[9px] uppercase tracking-[0.12em] text-[#c9a84c]/70 font-bold block mb-2">
                  حاڵەت / Condition
                </span>
                <div className="flex gap-2 flex-wrap">
                  {CONDITIONS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setFilter('condition', filters.condition === c ? '' : c)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all duration-200
                        ${filters.condition === c
                          ? 'bg-[#c9a84c]/[0.20] border-[#c9a84c]/60 text-[#c9a84c]'
                          : 'border-white/[0.10] text-white/50 bg-white/[0.04] hover:border-[#c9a84c]/40 hover:text-[#c9a84c]'
                        }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick search tags */}
        <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
          <span className="text-white/25 text-xs">گەڕانی خێرا:</span>
          {QUICK_SEARCHES.map(tag => (
            <button key={tag} onClick={() => { setSearch(s => ({ ...s, query: tag })); handleSearch(tag); }}
              className="px-3 py-1 rounded-full text-xs
                         bg-white/[0.04] border border-white/[0.08] text-white/45
                         hover:border-[#c9a84c]/35 hover:text-[#c9a84c]/90 hover:bg-[#c9a84c]/[0.06]
                         transition-all duration-200">
              {tag}
            </button>
          ))}
        </div>

        {/* Popular vehicles toggle */}
        <div className="mt-6 flex justify-center">
          <button onClick={() => setUi(s => ({ ...s, showPopular: !s.showPopular }))}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-[#c9a84c] transition-colors">
            <Star className="w-3.5 h-3.5" />
            <span>ئۆتۆمبێلی بەناوبانگ / Popular Vehicles</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${ui.showPopular ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Popular vehicles grid */}
        <div
          className="overflow-hidden transition-all duration-500"
          style={{ maxHeight: ui.showPopular ? '600px' : '0', opacity: ui.showPopular ? 1 : 0 }}
        >
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {POPULAR_VEHICLES.map((v, i) => (
              <div key={i}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03]
                           hover:border-[#c9a84c]/30 hover:bg-white/[0.05]
                           transition-all duration-200 cursor-pointer p-3">
                <div className="text-[10px] text-[#c9a84c]/70 mb-1">{v.badge}</div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <CarBrandLogo brand={v.brand} size="xs" />
                    {v.brand} {v.model}
                  </div>
                <div className="text-xs text-white/40 mt-0.5">{v.year} · {v.mileage}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[#c9a84c] font-bold text-sm">{v.price}</span>
                  <span className="text-white/30 text-[10px] flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" />{v.city}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-10">
          <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.15) 25%, rgba(201,168,76,0.35) 50%, rgba(201,168,76,0.15) 75%, transparent 100%)' }} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0">
            {STATS.map(({ value, label, labelEn }, i) => (
              <div key={label}
                className={`stat-item text-center py-2 relative ${i < STATS.length - 1 ? 'sm:border-e sm:border-white/[0.08]' : ''}`}
                style={{ animationDelay:`${0.35 + i * 0.07}s` }}>
                <div className="text-2xl sm:text-3xl font-display font-extrabold mb-0.5 tabular-nums"
                  style={{ background: 'linear-gradient(135deg, #f0d87a 0%, #c9a84c 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</div>
                <div className="text-white/40 text-xs font-medium">
                  {label}<span className="text-white/20 mx-1">/</span>{labelEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="relative z-10 h-12 overflow-hidden">
        <svg viewBox="0 0 1440 48" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <path d="M0,48 L0,24 Q180,0 360,24 Q540,48 720,24 Q900,0 1080,24 Q1260,48 1440,24 L1440,48 Z"
            fill="currentColor" className="text-[#f8fafc] dark:text-[#050b14]" />
        </svg>
      </div>
    </section>
  );
}
