'use client';
// apps/web/src/components/features/home/HeroSearch.tsx

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, MapPin, SlidersHorizontal, X, Car, Wrench, Bike } from 'lucide-react';

const MAKES = ['تۆیۆتا / Toyota', 'کیا / KIA', 'هیوندای / Hyundai', 'BMW', 'Mercedes-Benz', 'Lexus', 'Honda', 'Nissan', 'Mitsubishi', 'Ford', 'BYD', 'Geely', 'Chery', 'Haval'];
const MODELS: Record<string, string[]> = {
  'تۆیۆتا / Toyota': ['Camry', 'Corolla', 'Land Cruiser', 'Prado', 'Hilux', 'RAV4', 'Fortuner'],
  'کیا / KIA': ['Sportage', 'Sorento', 'Cerato', 'Optima', 'Carnival'],
  'هیوندای / Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Creta'],
  'BMW': ['3 Series', '5 Series', '7 Series', 'X5', 'X7', 'M3', 'M5'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLS', 'G-Class'],
};
const YEARS = Array.from({ length: 26 }, (_, i) => String(2025 - i));
const CITIES = ['سلێمانی / Sulaymaniyah', 'هەولێر / Erbil', 'دهۆک / Duhok', 'کەرکوک / Kirkuk', 'بەغدا / Baghdad', 'بەسرە / Basra', 'دبی / Dubai', 'شارجە / Sharjah'];
const PRICE_RANGES = ['زیر 5,000$', '5,000 - 15,000$', '15,000 - 30,000$', '30,000 - 60,000$', '60,000 - 100,000$', 'زیاتر لە 100,000$'];
const CATEGORIES = [
  { id: 'cars', label: 'ئۆتۆمبێل', labelEn: 'Cars', icon: Car },
  { id: 'parts', label: 'پارچەکان', labelEn: 'Parts', icon: Wrench },
  { id: 'bikes', label: 'مۆتۆسیکل', labelEn: 'Motorcycles', icon: Bike },
];

interface DropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function Dropdown({ label, value, options, onChange, placeholder, disabled }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`
          w-full flex items-center justify-between gap-2 px-4 py-3
          bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12]
          hover:border-[#c8a84b]/60 rounded-xl text-sm text-left
          transition-all duration-200 group
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          ${open ? 'border-[#c8a84b]/80 bg-white/[0.10]' : ''}
        `}
      >
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-widest text-[#c8a84b]/70 font-semibold mb-0.5">{label}</span>
          <span className={`truncate text-sm font-medium ${value ? 'text-white' : 'text-white/40'}`}>
            {value || placeholder || '---'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-[#c8a84b]' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#0f1923] border border-[#c8a84b]/30 rounded-xl shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl max-h-52 overflow-y-auto">
          <div
            className="px-4 py-2.5 text-white/40 text-sm hover:bg-white/5 cursor-pointer border-b border-white/5"
            onClick={() => { onChange(''); setOpen(false); }}
          >
            {placeholder || 'هەموو'}
          </div>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors
                ${value === opt
                  ? 'bg-[#c8a84b]/20 text-[#c8a84b] font-semibold'
                  : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('cars');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [focused, setFocused] = useState(false);

  const activeModels = make && MODELS[make] ? MODELS[make] : [];
  const activeFiltersCount = [make, model, yearFrom, yearTo, city, price].filter(Boolean).length;

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden min-h-[600px] flex items-center"
      style={{
        background: 'linear-gradient(135deg, #050e18 0%, #0a1628 40%, #0d1e35 70%, #06111c 100%)',
      }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gold shimmer lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c8a84b]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c8a84b]/20 to-transparent" />

        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #c8a84b22 0%, transparent 70%)' }}
        />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(200,168,75,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(200,168,75,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Diagonal accent */}
        <div
          className="absolute -right-40 top-10 w-[500px] h-[500px] opacity-5 rounded-full"
          style={{ background: 'radial-gradient(circle, #c8a84b 0%, transparent 60%)' }}
        />
        <div
          className="absolute -left-40 bottom-10 w-[400px] h-[400px] opacity-5 rounded-full"
          style={{ background: 'radial-gradient(circle, #1565c0 0%, transparent 60%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#c8a84b]/10 border border-[#c8a84b]/30 rounded-full px-4 py-1.5 text-[#c8a84b] text-xs font-semibold tracking-widest uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c8a84b] animate-pulse" />
            Iraq · Kurdistan · Dubai · China
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] mb-4 tracking-tight">
            دۆزینەوەی{' '}
            <span
              className="relative inline-block"
              style={{
                background: 'linear-gradient(135deg, #c8a84b 0%, #f5d98b 50%, #c8a84b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ئۆتۆمبێلی
            </span>{' '}
            تەواوت
          </h1>
          <p className="text-white/50 text-base md:text-lg font-light">
            Find Your Perfect Vehicle Across the Middle East & Beyond
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 justify-center mb-6">
          {CATEGORIES.map(({ id, label, labelEn, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${category === id
                  ? 'bg-[#c8a84b] text-[#050e18] shadow-lg shadow-[#c8a84b]/30'
                  : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white border border-white/10'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className="hidden sm:inline text-xs opacity-70">/ {labelEn}</span>
            </button>
          ))}
        </div>

        {/* Main Search Box */}
        <div
          className={`
            rounded-2xl border transition-all duration-300 overflow-hidden
            ${focused ? 'border-[#c8a84b]/60 shadow-[0_0_40px_rgba(200,168,75,0.15)]' : 'border-white/10'}
          `}
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}
        >
          {/* Search Input Row */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
            <Search className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${focused ? 'text-[#c8a84b]' : 'text-white/30'}`} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="گەڕان بکە... Toyota Land Cruiser، بەغدا، BMW 2023..."
              className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm md:text-base font-medium"
              dir="rtl"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-white/30 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="p-3">
            <div className="flex flex-wrap md:flex-nowrap gap-2 items-stretch">
              <Dropdown label="براند" value={make} options={MAKES} onChange={v => { setMake(v); setModel(''); }} placeholder="هەموو براندەکان" />
              <Dropdown label="مۆدێل" value={model} options={activeModels} onChange={setModel} placeholder="مۆدێل هەڵبژێرە" disabled={!make} />
              <Dropdown label="شار" value={city} options={CITIES} onChange={setCity} placeholder="هەموو شارەکان" />
              <Dropdown label="نرخ" value={price} options={PRICE_RANGES} onChange={setPrice} placeholder="هەموو نرخەکان" />

              {/* Search Button */}
              <button
                type="button"
                className="
                  flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm
                  transition-all duration-200 whitespace-nowrap flex-shrink-0
                  shadow-lg shadow-[#c8a84b]/20 hover:shadow-[#c8a84b]/40
                  hover:scale-[1.02] active:scale-[0.98]
                "
                style={{
                  background: 'linear-gradient(135deg, #c8a84b 0%, #e8c96b 50%, #c8a84b 100%)',
                  color: '#050e18',
                }}
              >
                <Search className="w-4 h-4" />
                گەڕان
              </button>
            </div>

            {/* Advanced Toggle */}
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#c8a84b] transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>فلتەری پیشکەوتوو</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-[#c8a84b] text-[#050e18] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setMake(''); setModel(''); setYearFrom(''); setYearTo(''); setCity(''); setPrice(''); }}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  سڕینەوەی فلتەرەکان
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: showAdvanced ? '200px' : '0px' }}
          >
            <div className="px-3 pb-3 border-t border-white/[0.06] pt-3">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Dropdown label="ساڵی دەستپێک" value={yearFrom} options={YEARS} onChange={setYearFrom} placeholder="2000" />
                  <span className="text-white/30 text-sm flex-shrink-0 pt-3">—</span>
                  <Dropdown label="ساڵی کۆتایی" value={yearTo} options={YEARS} onChange={setYearTo} placeholder="2025" />
                </div>

                {/* Condition chips */}
                <div className="flex flex-col min-w-[180px]">
                  <span className="text-[10px] uppercase tracking-widest text-[#c8a84b]/70 font-semibold mb-1.5">حاڵەت</span>
                  <div className="flex gap-2 flex-wrap">
                    {['نوێ / New', 'بەکارهاتوو / Used', 'گووشتی / Salvage'].map(c => (
                      <button
                        key={c}
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.06] border border-white/10 text-white/60 hover:border-[#c8a84b]/50 hover:text-[#c8a84b] transition-all"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick search tags */}
        <div className="mt-5 flex items-center gap-3 flex-wrap justify-center">
          <span className="text-white/30 text-xs">گەڕانی خێرا:</span>
          {['Land Cruiser 2023', 'BMW 5 Series', 'Toyota Camry هەولێر', 'Kia Sportage'].map(tag => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="px-3 py-1 rounded-full text-xs bg-white/[0.05] border border-white/10 text-white/50 hover:border-[#c8a84b]/40 hover:text-white/80 transition-all duration-150"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
