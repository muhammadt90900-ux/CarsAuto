'use client';
// components/features/spare-parts/SparePartsClient.tsx
import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Search, Grid3X3, List, Filter, X, Tag, Package, Zap, Shield, Star, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { listingsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const PART_CATEGORIES = [
  { id: 'engine',     emoji: '⚙️',  label: 'موتەر',     labelEn: 'Engine'      },
  { id: 'suspension', emoji: '🔧',  label: 'سەسپێنشن', labelEn: 'Suspension'  },
  { id: 'brakes',     emoji: '🔴',  label: 'فرێن',      labelEn: 'Brakes'      },
  { id: 'body',       emoji: '🚗',  label: 'جەستە',     labelEn: 'Body Parts'  },
  { id: 'electrical', emoji: '⚡',  label: 'کارەبا',    labelEn: 'Electrical'  },
  { id: 'tires',      emoji: '⭕',  label: 'تایەر',     labelEn: 'Tires'       },
  { id: 'exhaust',    emoji: '💨',  label: 'مووفلەر',   labelEn: 'Exhaust'     },
  { id: 'interior',   emoji: '🪑',  label: 'ناوەوە',    labelEn: 'Interior'    },
  { id: 'cooling',    emoji: '❄️',  label: 'سارکردنەوە',labelEn: 'Cooling'     },
  { id: 'filters',    emoji: '🌀',  label: 'فلتەر',     labelEn: 'Filters'     },
  { id: 'lighting',   emoji: '💡',  label: 'ڕووناکایی', labelEn: 'Lighting'    },
  { id: 'transmission',emoji:'⚙️', label: 'گێرکردن',   labelEn: 'Transmission'},
];

const MAKES = ['Toyota','BMW','Mercedes','Lexus','KIA','Hyundai','Honda','Nissan','Ford','Audi'];
const CONDITIONS = ['New (OEM)','New (Aftermarket)','Used — Good','Used — Fair'];
const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc','label': 'Price: High → Low' },
  { value: 'popular',   label: 'Most Popular' },
];

const MOCK_PARTS = Array.from({ length: 12 }, (_, i) => ({
  id: `part-${i+1}`,
  title: ['Engine Oil Filter', 'Brake Pads Set', 'Air Filter', 'Spark Plugs x4',
    'Alternator', 'Water Pump', 'Radiator', 'Shock Absorber Pair',
    'Timing Belt Kit', 'Headlight Assembly', 'Fuel Pump', 'CV Joint'][i],
  partNumber: `OEM-${String(i + 1).padStart(5, '0')}`,
  price: [25,85,18,45,320,145,280,195,165,240,175,95][i],
  condition: CONDITIONS[i % 4],
  make: MAKES[i % MAKES.length],
  category: PART_CATEGORIES[i % PART_CATEGORIES.length].id,
  city: ['Erbil','Sulaymaniyah','Baghdad','Dubai'][i % 4],
  verified: i % 3 !== 2,
  images: [],
  stock: i % 5 === 0 ? 1 : 3 + (i % 8),
  rating: 4.2 + (i % 8) * 0.1,
}));

function PartCard({ part, locale, view }: { part: any; locale: string; view: 'grid'|'list' }) {
  const [imgError, setImgError] = useState(false);
  const fmtPrice = (v: number) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(v);

  if (view === 'list') {
    return (
      <Link href={`/${locale}/spare-parts/${part.id}`} className="block group">
        <article className="card-premium flex gap-4 p-4">
          <div className="flex-shrink-0 w-28 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0f1c2e] flex items-center justify-center text-4xl">
            {PART_CATEGORIES.find(c => c.id === part.category)?.emoji || '⚙️'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--gold)] mb-0.5">{part.make} · {part.category}</p>
                <h3 className="font-bold text-[var(--text-primary)] leading-tight">{part.title}</h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">#{part.partNumber}</p>
              </div>
              <span className="price-tag text-xl flex-shrink-0">{fmtPrice(part.price)}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
              <span className="badge badge-gold">{part.condition}</span>
              {part.verified && <span className="verified-badge"><Shield className="w-2.5 h-2.5"/>Verified</span>}
              <span>{part.city}</span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/${locale}/spare-parts/${part.id}`} className="block group">
      <article className="card-premium overflow-hidden h-full flex flex-col">
        <div className="aspect-square bg-slate-50 dark:bg-[#0f1c2e] flex items-center justify-center text-6xl
                        group-hover:scale-105 transition-transform duration-500 overflow-hidden">
          {PART_CATEGORIES.find(c => c.id === part.category)?.emoji || '⚙️'}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--gold)] mb-1">{part.make}</p>
          <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 mb-2 leading-snug">{part.title}</h3>
          <p className="text-[10px] font-mono text-[var(--text-muted)] mb-3">#{part.partNumber}</p>
          <div className="flex flex-wrap gap-1.5 mb-auto">
            <span className="badge badge-gold">{part.condition}</span>
            {part.stock <= 2 && <span className="badge badge-red">Low Stock</span>}
          </div>
          <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="price-tag text-lg">{fmtPrice(part.price)}</span>
            {part.verified && <span className="verified-badge"><Shield className="w-2.5 h-2.5"/>OEM</span>}
          </div>
        </div>
      </article>
    </Link>
  );
}

function FilterSection({ title, children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border-subtle)] pb-4 mb-4">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full text-sm font-bold text-[var(--text-primary)] mb-3">
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]"/> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]"/>}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
}

export function SparePartsClient({ locale, initialSearch }: { locale: string; initialSearch: Record<string,string> }) {
  const [query,     setQuery]     = useState('');
  const [category,  setCategory]  = useState('');
  const [make,      setMake]      = useState('');
  const [condition, setCondition] = useState('');
  const [view,      setView]      = useState<'grid'|'list'>('grid');
  const [sidebar,   setSidebar]   = useState(false);
  const [sort,      setSort]      = useState('newest');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.listings.list({ type: 'SPARE_PART', category, make, q: query }),
    queryFn: () => listingsApi.getAll({ type: 'SPARE_PART', category, make, q: query, limit: 24 }),
    placeholderData: p => p,
  });

  const parts = data?.data ?? MOCK_PARTS;
  const activeCount = [category, make, condition].filter(Boolean).length;
  const resetAll = useCallback(() => { setCategory(''); setMake(''); setCondition(''); }, []);

  const SidebarContent = () => (
    <div className="text-sm">
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]"/>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search parts…" className="input-base pl-9 h-10"/>
      </div>
      <FilterSection title="Category">
        <div className="space-y-1.5">
          {PART_CATEGORIES.map(c => (
            <label key={c.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={category === c.id} onChange={() => setCategory(category === c.id ? '' : c.id)}
                className="w-4 h-4 rounded accent-[var(--gold)]"/>
              <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">
                {c.emoji} {c.labelEn}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="Compatible Make">
        <div className="space-y-1.5">
          {MAKES.map(m => (
            <label key={m} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={make === m} onChange={() => setMake(make === m ? '' : m)}
                className="w-4 h-4 rounded accent-[var(--gold)]"/>
              <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{m}</span>
            </label>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="Condition">
        <div className="space-y-1.5">
          {CONDITIONS.map(c => (
            <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="cond" checked={condition === c} onChange={() => setCondition(c)}
                className="w-4 h-4 accent-[var(--gold)]"/>
              <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{c}</span>
            </label>
          ))}
        </div>
      </FilterSection>
      {activeCount > 0 && (
        <button onClick={resetAll}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl
                     text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/30
                     hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <X className="w-4 h-4"/>Clear All
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--surface-0)] dark:bg-[var(--ink-900)]">
      <div className="relative overflow-hidden border-b border-[var(--border-default)]"
           style={{ background:'linear-gradient(135deg, #050b14 0%, #0b1525 60%, #050b14 100%)' }}>
        <div className="absolute inset-0 opacity-[0.025] bg-dot-grid"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-2 text-xs text-white/40 mb-4">
            <Link href={`/${locale}`} className="hover:text-[var(--gold)] transition-colors">Home</Link>
            <span>/</span><span className="text-white/60">Spare Parts</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white mb-2">
            پارچە یەدەکەکان / <span className="text-[var(--gold)]">Spare Parts</span>
          </h1>
          <p className="text-white/45 text-sm">{parts.length}+ parts from verified sellers</p>
        </div>
      </div>

      {/* Category pills */}
      <div className="border-b border-[var(--border-default)] bg-white dark:bg-[var(--ink-850)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            <button onClick={() => setCategory('')}
              className={`filter-chip flex-shrink-0 ${!category ? 'active' : ''}`}>
              🏪 All Parts
            </button>
            {PART_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(category === c.id ? '' : c.id)}
                className={`filter-chip flex-shrink-0 ${category === c.id ? 'active' : ''}`}>
                {c.emoji} {c.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-[calc(var(--navbar-h)+1.5rem)] rounded-2xl
                            bg-white dark:bg-[#0b1525] border border-[var(--border-default)]
                            shadow-[var(--shadow-sm)] p-5 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
              <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2 mb-5">
                <Filter className="w-4 h-4 text-[var(--gold)]"/>Filters
                {activeCount > 0 && <span className="badge badge-gold">{activeCount}</span>}
              </h2>
              <SidebarContent/>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebar(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                             bg-white dark:bg-[#0b1525] border border-[var(--border-default)] shadow-[var(--shadow-sm)]
                             text-[var(--text-secondary)] hover:border-[var(--border-gold)]">
                  <SlidersHorizontal className="w-4 h-4"/>Filters
                  {activeCount > 0 && <span className="badge badge-gold">{activeCount}</span>}
                </button>
                <p className="text-sm text-[var(--text-muted)] hidden sm:block">
                  <strong className="text-[var(--text-primary)]">{parts.length}</strong> results
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select value={sort} onChange={e => setSort(e.target.value)} className="input-base h-9 text-xs w-44">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex rounded-xl overflow-hidden border border-[var(--border-default)] bg-white dark:bg-[#0b1525]">
                  {(['grid','list'] as const).map(v => (
                    <button key={v} onClick={() => setView(v)}
                      className={`p-2 transition-colors ${view===v ? 'bg-[var(--gold-subtle)] text-[var(--gold)]' : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}>
                      {v === 'grid' ? <Grid3X3 className="w-4 h-4"/> : <List className="w-4 h-4"/>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={view === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-3'}>
              {parts.map((part: any) => (
                <PartCard key={part.id} part={part} locale={locale} view={view}/>
              ))}
            </div>
          </div>
        </div>
      </div>

      {sidebar && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebar(false)}/>
          <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-[#0b1525] shadow-[var(--shadow-xl)] overflow-y-auto no-scrollbar lg:hidden anim-slide-l">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
              <h2 className="font-bold text-[var(--text-primary)]">Filters</h2>
              <button onClick={() => setSidebar(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-100)]">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <div className="p-5"><SidebarContent/></div>
          </div>
        </>
      )}
    </div>
  );
}
