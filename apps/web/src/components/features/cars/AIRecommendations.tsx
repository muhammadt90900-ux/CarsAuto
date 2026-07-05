'use client';
// components/features/cars/AIRecommendations.tsx
// AI-powered recommendation engine UI — similar cars, budget, search, country, personalised

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles, Brain, MapPin, Gauge, Fuel,
  TrendingUp, Search, Wallet, Globe, Heart,
  ChevronRight, RefreshCw, Zap, Star,
  SlidersHorizontal, X, ArrowRight,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';

/* ── Types ─────────────────────────────────────────────────────────────── */

type ReasonKey = 'similar_car' | 'budget' | 'search' | 'country' | 'trending';

interface RecommendedListing {
  id: string;
  score: number;
  reason: string;
  reasonKey: ReasonKey;
  listing: any;
}

type Tab = 'similar' | 'budget' | 'search' | 'country' | 'personalised';

interface AIRecommendationsProps {
  listingId?: string;
  currentPrice?: number;
  locale?: string;
  country?: string;
  apiBaseUrl?: string;
}

/* ── i18n ───────────────────────────────────────────────────────────────── */

const T: Record<string, Record<string, string>> = {
  title: {
    ku: 'پێشنیارەکانی AI',
    ar: 'توصيات الذكاء الاصطناعي',
    en: 'AI Recommendations',
  },
  subtitle: {
    ku: 'ئۆتۆمبێلی گونجاو بۆ تۆ دەدۆزێتەوە',
    ar: 'يجد السيارة المثالية لك',
    en: 'Finding the perfect car for you',
  },
  tab_similar: { ku: 'هاوشێوەکان', ar: 'مماثلة', en: 'Similar' },
  tab_budget:  { ku: 'بودجە', ar: 'الميزانية', en: 'Budget' },
  tab_search:  { ku: 'گەڕان', ar: 'البحث', en: 'Searches' },
  tab_country: { ku: 'هەرێم', ar: 'المنطقة', en: 'Region' },
  tab_personalised: { ku: 'تایبەت بەتۆ', ar: 'مخصص لك', en: 'For You' },
  budget_label:    { ku: 'بودجەکەت بنووسە (USD)', ar: 'أدخل ميزانيتك (USD)', en: 'Enter your budget (USD)' },
  search_label:    { ku: 'گەڕانەکانی نوێت', ar: 'عمليات بحثك الأخيرة', en: 'Your recent searches' },
  search_hint:     { ku: 'Toyota, SUV, 2020...', ar: 'Toyota, SUV, 2020...', en: 'Toyota, SUV, 2020...' },
  load_more:       { ku: 'زیاتر ببینە', ar: 'عرض المزيد', en: 'Load more' },
  loading:         { ku: 'داواکاری دەکرێ...', ar: 'جارٍ التحميل...', en: 'Loading...' },
  no_results:      { ku: 'هیچ ئۆتۆمبێلێک نەدۆزرایەوە', ar: 'لا توجد نتائج', en: 'No cars found' },
  match_score:     { ku: 'هاوخۆشی', ar: 'التطابق', en: 'Match' },
  refresh:         { ku: 'نوێکردنەوە', ar: 'تحديث', en: 'Refresh' },
  view_all:        { ku: 'هەمووی ببینە', ar: 'عرض الكل', en: 'View all' },
  powered_by:      { ku: 'بە هێزی AI', ar: 'مدعوم بالذكاء الاصطناعي', en: 'Powered by AI' },
};

const t = (key: string, locale: string) =>
  T[key]?.[locale] ?? T[key]?.['en'] ?? key;

/* ── Reason badge colours ─────────────────────────────────────────────── */

const REASON_STYLE: Record<ReasonKey, { bg: string; text: string; icon: any }> = {
  similar_car: { bg: 'bg-violet-500/15', text: 'text-violet-400', icon: Star },
  budget:      { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: Wallet },
  search:      { bg: 'bg-sky-500/15',     text: 'text-sky-400',     icon: Search },
  country:     { bg: 'bg-amber-500/15',   text: 'text-amber-400',   icon: Globe },
  trending:    { bg: 'bg-rose-500/15',    text: 'text-rose-400',    icon: TrendingUp },
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const fmtPrice = (v: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(v);

const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);

/* ── Score Ring ─────────────────────────────────────────────────────────── */

const ScoreRing = memo(function ScoreRing({ score }: { score: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 45 ? 'var(--gold)' : '#6b7280';
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke={color} strokeWidth="3"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  );
});

/* ── AI Car Card ─────────────────────────────────────────────────────────── */

const AICarCard = memo(function AICarCard({
  item, locale,
}: {
  item: RecommendedListing;
  locale: string;
}) {
  const [liked, setLiked] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { listing, score, reason, reasonKey } = item;
  const spec   = listing.vehicleSpec;
  const image  = listing.images?.[0]?.url;
  const title  = listing[`title${locale.charAt(0).toUpperCase() + locale.slice(1)}`]
                 ?? listing.titleEn
                 ?? `${spec?.brand?.name ?? ''} ${spec?.model?.name ?? ''}`.trim();

  const rStyle = REASON_STYLE[reasonKey] ?? REASON_STYLE.trending;
  const ReasonIcon = rStyle.icon;

  return (
    <Link
      href="/cars/${listing.id}"
      prefetch={false}
      className="group block"
    >
      <article
        className={cn(
          'relative flex flex-col rounded-2xl overflow-hidden h-full',
          'bg-[var(--ink-750)] border border-white/[0.06]',
          'transition-all duration-300 ease-out',
          'hover:border-[rgba(201,168,76,0.4)] hover:shadow-[0_20px_60px_rgba(201,168,76,0.12)]',
          'hover:-translate-y-0.5',
        )}
      >
        {/* Image */}
        <div className="relative h-44 overflow-hidden bg-[var(--ink-800)]">
          {image && !imgError ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, 300px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center">
                <Zap className="w-7 h-7 text-white/20" />
              </div>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink-750)] via-transparent to-transparent opacity-80" />

          {/* Like button */}
          <button
            onClick={(e) => { e.preventDefault(); setLiked(v => !v); }}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center',
              'backdrop-blur-md border border-white/10 transition-all duration-200',
              liked
                ? 'bg-rose-500/30 border-rose-500/40'
                : 'bg-black/30 hover:bg-black/50',
            )}
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-colors',
                liked ? 'fill-rose-400 text-rose-400' : 'text-white/60',
              )}
            />
          </button>

          {/* Score ring */}
          <div className="absolute bottom-3 right-3">
            <ScoreRing score={score} />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4 gap-3">
          {/* Reason badge */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-xs font-semibold',
              rStyle.bg, rStyle.text,
            )}
          >
            <ReasonIcon className="w-3 h-3" />
            {reason}
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-[var(--gold)] transition-colors duration-200">
            {title}
          </h3>

          {/* Specs row */}
          <div className="flex items-center gap-3 text-xs text-white/45">
            {spec?.year && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {spec.year}
              </span>
            )}
            {spec?.mileageKm != null && (
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                {fmtNum(spec.mileageKm)} km
              </span>
            )}
            {spec?.trim?.fuelType && (
              <span className="flex items-center gap-1">
                <Fuel className="w-3 h-3" />
                {spec.trim.fuelType}
              </span>
            )}
          </div>

          {/* Location */}
          {listing.location && (
            <div className="flex items-center gap-1.5 text-xs text-white/35">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {listing.location.nameEn ?? listing.location.city ?? ''}
              </span>
            </div>
          )}

          {/* Price + Arrow */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.05]">
            <span className="text-base font-black text-[var(--gold)] tracking-tight">
              {fmtPrice(listing.price, listing.currency ?? 'USD')}
            </span>
            <div
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center',
                'bg-[var(--gold-subtle)] text-[var(--gold)]',
                'group-hover:bg-[rgba(201,168,76,0.25)] transition-colors duration-200',
              )}
            >
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
});

/* ── Budget Input ────────────────────────────────────────────────────────── */

function BudgetInput({
  value, onChange, locale,
}: {
  value: string;
  onChange: (v: string) => void;
  locale: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="relative flex-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold pointer-events-none">
          $
        </span>
        <input
          type="number"
          min={1000}
          step={1000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="25000"
          className={cn(
            'w-full pl-8 pr-4 py-3 rounded-xl text-sm font-semibold text-white',
            'bg-white/[0.05] border border-white/[0.08] outline-none',
            'focus:border-[rgba(201,168,76,0.5)] focus:bg-white/[0.07]',
            'placeholder:text-white/25 transition-all duration-200',
          )}
        />
      </div>
    </div>
  );
}

/* ── Search Tags Input ──────────────────────────────────────────────────── */

function SearchTagsInput({
  tags, onAdd, onRemove, locale,
}: {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
  locale: string;
}) {
  const [input, setInput] = useState('');
  const submit = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInput('');
    }
  }, [input, tags, onAdd]);

  return (
    <div className="mb-5 space-y-3">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('search_hint', locale)}
          className={cn(
            'flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white',
            'bg-white/[0.05] border border-white/[0.08] outline-none',
            'focus:border-[rgba(201,168,76,0.5)] placeholder:text-white/25 transition-all',
          )}
        />
        <button
          onClick={submit}
          className="px-4 py-3 rounded-xl bg-[rgba(201,168,76,0.15)] text-[var(--gold)] hover:bg-[rgba(201,168,76,0.25)] transition-colors font-semibold text-sm"
        >
          +
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/20"
            >
              {tag}
              <button
                onClick={() => onRemove(tag)}
                className="hover:text-sky-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Skeleton Card ──────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--ink-750)] border border-white/[0.06] animate-pulse">
      <div className="h-44 bg-white/[0.04]" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-white/[0.05] rounded-full w-1/3" />
        <div className="h-4 bg-white/[0.06] rounded-lg w-4/5" />
        <div className="flex gap-3">
          <div className="h-2.5 bg-white/[0.04] rounded-full w-1/4" />
          <div className="h-2.5 bg-white/[0.04] rounded-full w-1/4" />
        </div>
        <div className="h-px bg-white/[0.04]" />
        <div className="flex justify-between items-center">
          <div className="h-5 bg-white/[0.06] rounded-lg w-1/3" />
          <div className="h-7 w-7 bg-white/[0.04] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ── Tab Button ─────────────────────────────────────────────────────────── */

const TAB_META: { key: Tab; icon: any; labelKey: string }[] = [
  { key: 'similar',      icon: Star,         labelKey: 'tab_similar' },
  { key: 'budget',       icon: Wallet,        labelKey: 'tab_budget' },
  { key: 'search',       icon: Search,        labelKey: 'tab_search' },
  { key: 'country',      icon: Globe,         labelKey: 'tab_country' },
  { key: 'personalised', icon: Brain,         labelKey: 'tab_personalised' },
];

/* ── Main Component ─────────────────────────────────────────────────────── */

export function AIRecommendations({
  listingId,
  currentPrice,
  locale = 'en',
  country = 'IQ',
  apiBaseUrl = '/api',
}: AIRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(listingId ? 'similar' : 'personalised');
  const [results, setResults] = useState<RecommendedListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState(currentPrice ? String(currentPrice) : '');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Fetch logic ─────────────────────────────────────────────────────── */

  const fetchRecommendations = useCallback(async (tab: Tab) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setResults([]);

    try {
      let url = '';
      let options: RequestInit = { signal: ctrl.signal };

      switch (tab) {
        case 'similar':
          if (!listingId) { setLoading(false); return; }
          url = `${apiBaseUrl}/ai/similar?listingId=${listingId}&locale=${locale}&limit=8`;
          break;

        case 'budget': {
          const b = parseInt(budget, 10);
          if (!b || b < 100) { setLoading(false); return; }
          url = `${apiBaseUrl}/ai/budget?budget=${b}&country=${country}&locale=${locale}&limit=8`;
          break;
        }

        case 'search':
          if (!searchTags.length) { setLoading(false); return; }
          url = `${apiBaseUrl}/ai/search-history`;
          options = {
            ...options,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searches: searchTags, locale, limit: 8 }),
          };
          break;

        case 'country':
          url = `${apiBaseUrl}/ai/country?country=${country}&locale=${locale}&limit=8`;
          break;

        case 'personalised':
          url = `${apiBaseUrl}/ai/recommend`;
          options = {
            ...options,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listingId,
              budget: parseInt(budget, 10) || undefined,
              searchHistory: searchTags,
              country,
              locale,
              limit: 8,
            }),
          };
          break;
      }

      if (!url && options.method !== 'POST') { setLoading(false); return; }
      const res  = await fetch(url || `${apiBaseUrl}/ai/recommend`, options);
      if (!res.ok) throw new Error('API error');
      const data: RecommendedListing[] = await res.json();
      if (!ctrl.signal.aborted) setResults(data);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.warn('AI fetch error', err);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [activeTab, listingId, budget, searchTags, country, locale, apiBaseUrl]);

  /* Fetch when tab or inputs change */
  useEffect(() => {
    fetchRecommendations(activeTab);
    return () => { abortRef.current?.abort(); };
  }, [activeTab]);

  /* Auto-fetch budget/search tabs when data is ready */
  useEffect(() => {
    if (activeTab === 'budget' && budget) fetchRecommendations('budget');
  }, [budget]);

  useEffect(() => {
    if (activeTab === 'search' && searchTags.length > 0) fetchRecommendations('search');
  }, [searchTags]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const addTag = useCallback((tag: string) => setSearchTags(v => [...v, tag]), []);
  const removeTag = useCallback((tag: string) => setSearchTags(v => v.filter(t => t !== tag)), []);

  /* Tabs to show */
  const tabs = TAB_META.filter(tab => {
    if (tab.key === 'similar' && !listingId) return false;
    return true;
  });

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgba(201,168,76,0.3)] to-[#7c4dff]/30 flex items-center justify-center border border-white/[0.08]">
            <Sparkles className="w-4.5 h-4.5 text-[var(--gold)]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              {t('title', locale)}
            </h2>
            <p className="text-xs text-white/35">{t('subtitle', locale)}</p>
          </div>
        </div>
        <button
          onClick={() => fetchRecommendations(activeTab)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-white/40 hover:text-white/70 text-xs font-semibold transition-all duration-200"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          {t('refresh', locale)}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200',
              activeTab === key
                ? 'bg-[rgba(201,168,76,0.2)] text-[var(--gold)] border border-[rgba(201,168,76,0.3)] shadow-[0_0_12px_rgba(201,168,76,0.15)]'
                : 'bg-white/[0.04] text-white/45 hover:bg-white/[0.07] hover:text-white/65 border border-transparent',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(labelKey, locale)}
          </button>
        ))}
      </div>

      {/* Tab-specific inputs */}
      {activeTab === 'budget' && (
        <BudgetInput value={budget} onChange={setBudget} locale={locale} />
      )}
      {activeTab === 'search' && (
        <SearchTagsInput
          tags={searchTags}
          onAdd={addTag}
          onRemove={removeTag}
          locale={locale}
        />
      )}

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-4 text-white/30">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <Brain className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold">{t('no_results', locale)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((item) => (
            <AICarCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      )}

      {/* Footer */}
      {results.length > 0 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-2 text-xs text-white/25">
            <Sparkles className="w-3.5 h-3.5 text-[rgba(201,168,76,0.5)]" />
            {t('powered_by', locale)}
          </div>
          <Link
            href="/cars"
            className="flex items-center gap-1.5 text-xs font-semibold text-[rgba(201,168,76,0.7)] hover:text-[var(--gold)] transition-colors duration-200"
          >
            {t('view_all', locale)}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}

export default AIRecommendations;
