'use client';
// components/features/home/RecentParts.tsx
// Redesigned — Clean premium spare-parts grid

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Tag, ArrowLeft, Package } from 'lucide-react';

const PART_CATEGORIES = [
  { id: 'engine',     emoji: '⚙️',  label: 'موتەر',    labelEn: 'Engine'     },
  { id: 'suspension', emoji: '🔧',  label: 'سەسپێنشن',  labelEn: 'Suspension' },
  { id: 'brakes',     emoji: '🔴',  label: 'فرێن',      labelEn: 'Brakes'     },
  { id: 'body',       emoji: '🚗',  label: 'جەستە',     labelEn: 'Body'       },
  { id: 'electrical', emoji: '⚡',  label: 'کارەبا',    labelEn: 'Electrical' },
  { id: 'tires',      emoji: '⭕',  label: 'تایەر',     labelEn: 'Tires'      },
];

/* ── Skeleton ─────────────────────────────────────────────────── */
function PartCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden
                    bg-white dark:bg-[#0b1525]
                    border border-slate-100 dark:border-white/[0.06]
                    shadow-[var(--shadow-sm)]">
      <div className="h-32 skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-3 skeleton rounded w-3/4" />
        <div className="h-2.5 skeleton rounded w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 skeleton rounded w-2/5" />
          <div className="h-4 w-4 skeleton rounded" />
        </div>
      </div>
    </div>
  );
}

/* ── Part Card ────────────────────────────────────────────────── */
function PartCard({ part }: { part: any }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/parts/${part.id}`} className="block group">
      <article className="rounded-xl overflow-hidden h-full flex flex-col
                          bg-white dark:bg-[#0b1525]
                          border border-slate-100 dark:border-white/[0.06]
                          shadow-[var(--shadow-sm)]
                          hover:border-[#c9a84c]/30 dark:hover:border-[#c9a84c]/30
                          hover:shadow-[var(--shadow-md)]
                          transition-all duration-250
                          hover:-translate-y-1">
        {/* Image */}
        <div className="h-32 overflow-hidden flex-shrink-0
                        bg-slate-50 dark:bg-[#060f1a] relative">
          {!imgError ? (
            <img
              src={part.images?.[0] || '/placeholder.jpg'}
              alt={part.title}
              className="w-full h-full object-cover
                         transition-transform duration-500
                         group-hover:scale-[1.06]"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-slate-200 dark:text-white/10" />
            </div>
          )}
          <div className="absolute inset-0
                          bg-gradient-to-t from-black/30 to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col flex-1" dir="rtl">
          <h4 className="text-xs font-semibold text-[var(--text-primary)]
                         truncate mb-1 leading-snug
                         group-hover:text-[#c9a84c] transition-colors duration-200 line-clamp-2">
            {part.title}
          </h4>
          {part.make && (
            <p className="text-[var(--text-faint)] text-[10px] mb-2">
              {part.make} {part.model}
            </p>
          )}
          <div className="flex items-center justify-between mt-auto pt-2
                          border-t border-slate-100 dark:border-white/[0.05]">
            <span className="text-sm font-extrabold text-gold tabular-nums font-display">
              ${part.price?.toLocaleString() || '---'}
            </span>
            <Tag className="w-3 h-3 text-[var(--text-faint)]
                            group-hover:text-[#c9a84c]/70 transition-colors duration-200" />
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ── RecentParts section ──────────────────────────────────────── */
export function RecentParts() {
  const [parts,          setParts]          = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    const params: any = { type: 'part', limit: '6' };
    if (activeCategory) params.category = activeCategory;
    setLoading(true);
    (api.listings?.getAll ? api.listings.getAll(params) : Promise.resolve([]))
      .then(res => setParts(res.data || res || []))
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div dir="rtl">
      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap mb-6 no-scrollbar overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory('')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                      text-xs font-semibold transition-all duration-200 whitespace-nowrap
                      ${activeCategory === ''
                        ? 'bg-gradient-to-r from-[#b8922e] to-[#dab445] text-[#050b14] shadow-[var(--shadow-gold-sm)]'
                        : 'bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-[var(--text-muted)] hover:border-[#c9a84c]/30 hover:text-[#c9a84c] hover:bg-[#c9a84c]/[0.06]'
                      }`}
        >
          هەموو / All
        </button>

        {PART_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? '' : cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                        text-xs font-semibold transition-all duration-200 whitespace-nowrap
                        ${activeCategory === cat.id
                          ? 'bg-gradient-to-r from-[#b8922e] to-[#dab445] text-[#050b14] shadow-[var(--shadow-gold-sm)]'
                          : 'bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-[var(--text-muted)] hover:border-[#c9a84c]/30 hover:text-[#c9a84c] hover:bg-[#c9a84c]/[0.06]'
                        }`}
          >
            <span role="img" aria-label={cat.labelEn}>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Parts grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <PartCardSkeleton key={i} />)}
        </div>
      ) : parts.length === 0 ? (
        <div className="text-center py-14">
          <div className="text-5xl mb-4 opacity-15">🔧</div>
          <p className="text-[var(--text-muted)] text-sm">هیچ پارچەیەک نەدۆزرایەوە</p>
          <p className="text-[var(--text-faint)] text-xs mt-1">No parts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {parts.map((part: any) => <PartCard key={part.id} part={part} />)}
        </div>
      )}
    </div>
  );
}
