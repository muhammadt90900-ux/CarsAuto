'use client';
// components/features/home/RecentParts.tsx
// Optimised: react-query, next/image, memoised PartCard

import { useState, memo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Tag, Package, Zap } from 'lucide-react';
import { listingsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const PART_CATEGORIES = [
  { id: 'engine',     emoji: '⚙️',  label: 'موتەر',    labelEn: 'Engine'     },
  { id: 'suspension', emoji: '🔧',  label: 'سەسپێنشن', labelEn: 'Suspension' },
  { id: 'brakes',     emoji: '🔴',  label: 'فرێن',     labelEn: 'Brakes'     },
  { id: 'body',       emoji: '🚗',  label: 'جەستە',    labelEn: 'Body'       },
  { id: 'electrical', emoji: '⚡',  label: 'کارەبا',   labelEn: 'Electrical' },
  { id: 'tires',      emoji: '⭕',  label: 'تایەر',    labelEn: 'Tires'      },
] as const;

function PartCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-[#0b1525] border border-slate-100 dark:border-white/[0.06]" aria-hidden="true">
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

const PartCard = memo(function PartCard({ part }: { part: any }) {
  const [imgError, setImgError] = useState(false);
  const handleImgError = useCallback(() => setImgError(true), []);
  const imageUrl = part.images?.[0] || null;

  return (
    <Link href={`/parts/${part.id}`} className="block group" prefetch={false}>
      <article className="rounded-xl overflow-hidden h-full flex flex-col
                          bg-white dark:bg-[#0b1525]
                          border border-slate-100 dark:border-white/[0.06]
                          hover:border-[#c9a84c]/30 dark:hover:border-[#c9a84c]/30
                          hover:shadow-[var(--shadow-md)]
                          transition-all duration-250 hover:-translate-y-1">
        <div className="h-32 overflow-hidden flex-shrink-0 bg-slate-50 dark:bg-[#060f1a] relative">
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={part.title || 'Spare part'}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              onError={handleImgError}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0b1525] dark:to-[#0f1c2e]">
              <Package className="w-8 h-8 text-slate-200 dark:text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {part.isNew && (
            <div className="absolute top-2 start-2">
              <span className="inline-flex items-center gap-0.5 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                <Zap className="w-2 h-2" />NEW
              </span>
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1" dir="rtl">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate mb-1 leading-snug group-hover:text-[#c9a84c] transition-colors duration-200 line-clamp-2">
            {part.title}
          </h4>
          {part.make && (
            <p className="text-[var(--text-faint)] text-[10px] mb-2">{part.make} {part.model}</p>
          )}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-white/[0.05]">
            <span className="text-sm font-extrabold text-gold tabular-nums font-display">
              ${part.price?.toLocaleString() || '---'}
            </span>
            <Tag className="w-3 h-3 text-[var(--text-faint)] group-hover:text-[#c9a84c]/70 transition-colors duration-200" />
          </div>
        </div>
      </article>
    </Link>
  );
});

export function RecentParts() {
  const [activeCategory, setActiveCategory] = useState('');

  const { data: parts = [], isLoading } = useQuery({
    queryKey: queryKeys.listings.list({ type: 'SPARE_PART', limit: '6', category: activeCategory }),
    queryFn: () => listingsApi.getAll({ type: 'SPARE_PART', limit: '6', ...(activeCategory ? { category: activeCategory } : {}) }),
    select: (res: any) => res?.data ?? res ?? [],
    staleTime: 60_000,
  });

  return (
    <div dir="rtl">
      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setActiveCategory('')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap
            ${activeCategory === ''
              ? 'bg-gradient-to-r from-[#b8922e] to-[#dab445] text-[#050b14] shadow-[var(--shadow-gold-sm)]'
              : 'bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-[var(--text-muted)] hover:border-[#c9a84c]/30 hover:text-[#c9a84c]'
            }`}
        >
          هەموو / All
        </button>
        {PART_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(prev => prev === cat.id ? '' : cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap
              ${activeCategory === cat.id
                ? 'bg-gradient-to-r from-[#b8922e] to-[#dab445] text-[#050b14] shadow-[var(--shadow-gold-sm)]'
                : 'bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-[var(--text-muted)] hover:border-[#c9a84c]/30 hover:text-[#c9a84c]'
              }`}
          >
            <span role="img" aria-label={cat.labelEn}>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
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
