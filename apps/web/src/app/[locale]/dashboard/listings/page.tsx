'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ── Icons ──────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M10 4v12M4 10h12"/>
  </svg>
);
const CarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
    <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
  </svg>
);
const MotoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/>
    <path d="M12 17V7l-3 5h6"/><path d="M8 7h4"/>
  </svg>
);
const SpareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93A10 10 0 1 0 4.93 19.07M12 2v2M12 20v2M2 12h2M20 12h2"/>
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4l4 4L5 18H1v-4L11 4Z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h14M8 6V4h4v2M5 6l1 12h8l1-12"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z"/><circle cx="10" cy="10" r="3"/>
  </svg>
);
const EmptyIcon = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="8" y="20" width="48" height="32" rx="4" opacity=".3"/>
    <path d="M16 20l4-8h24l4 8" opacity=".5"/>
    <circle cx="22" cy="44" r="5" opacity=".5"/><circle cx="42" cy="44" r="5" opacity=".5"/>
    <path d="M30 32h4M32 30v4" opacity=".6"/>
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────
type ListingType = 'CAR' | 'MOTORCYCLE' | 'SPARE_PART' | string;
type ListingStatus = 'ACTIVE' | 'PENDING' | 'SOLD' | 'EXPIRED' | string;

function typeIcon(type: ListingType) {
  if (type === 'MOTORCYCLE') return <MotoIcon />;
  if (type === 'SPARE_PART') return <SpareIcon />;
  return <CarIcon />;
}

function statusConfig(status: ListingStatus) {
  switch (status) {
    case 'ACTIVE':   return { label: 'چالاک',     labelEn: 'Active',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' };
    case 'SOLD':     return { label: 'فرۆشراو',   labelEn: 'Sold',     cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' };
    case 'EXPIRED':  return { label: 'بەسەرچووە', labelEn: 'Expired',  cls: 'bg-red-500/15 text-red-400 border-red-500/25' };
    default:         return { label: 'چاوەڕوان',  labelEn: 'Pending',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' };
  }
}

function formatPrice(price: number, currency: string) {
  const locale = currency === 'IQD' ? 'ar-IQ' : currency === 'AED' ? 'ar-AE' : 'zh-CN';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(price);
}

// ── Skeleton card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="relative bg-white dark:bg-[#111827] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/[0.06] shadow-sm">
      <div className="w-full h-44 bg-gray-200 dark:bg-white/[0.07] animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-white/[0.07] rounded-lg animate-pulse" />
        <div className="h-3 w-1/2 bg-gray-100 dark:bg-white/[0.04] rounded-lg animate-pulse" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-5 w-24 bg-gray-200 dark:bg-white/[0.07] rounded-lg animate-pulse" />
          <div className="h-5 w-16 bg-gray-100 dark:bg-white/[0.04] rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Listing card ───────────────────────────────────────────────────────────
function ListingCard({
  listing,
  onDelete,
  isRTL,
}: {
  listing: any;
  onDelete: (id: string) => void;
  isRTL: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cover = !imgErr ? listing.images?.[0]?.url : null;
  const title = listing.titleKu ?? listing.titleAr ?? listing.titleZh ?? listing.titleEn ?? '—';
  const { label, labelEn, cls } = statusConfig(listing.status);
  const TypeIcon = () => typeIcon(listing.type ?? 'CAR');

  async function confirmDelete() {
    if (!confirm('دڵنیایت لە سڕینەوەی ئەم ئۆتۆمبێلە؟')) return;
    setDeleting(true);
    await onDelete(listing.id);
  }

  return (
    <article
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`group relative bg-white dark:bg-[#111827] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/[0.06] shadow-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-300 ${deleting ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {/* ── Image ── */}
      <div className="relative w-full h-44 bg-gray-100 dark:bg-[#0d1117] overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={title}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300 dark:text-gray-700">
            <TypeIcon />
            <span className="text-[10px] font-medium tracking-wide uppercase opacity-60">No Image</span>
          </div>
        )}

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* type pill */}
        <div className={`absolute top-2.5 ${isRTL ? 'right-2.5' : 'left-2.5'} flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold tracking-wide`}>
          <TypeIcon />
          <span className="uppercase">{listing.type?.replace('_', ' ') ?? 'Car'}</span>
        </div>

        {/* view count */}
        {listing.views != null && (
          <div className={`absolute top-2.5 ${isRTL ? 'left-2.5' : 'right-2.5'} flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-medium`}>
            <EyeIcon />
            <span>{listing.views.toLocaleString()}</span>
          </div>
        )}

        {/* quick-action strip (visible on hover) */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 px-3 py-2.5 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
          <Link
            href={`dashboard/edit/${listing.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-gray-800 text-[11px] font-bold shadow-sm transition-colors"
          >
            <EditIcon /> دەستکاری
          </Link>
          <button
            onClick={confirmDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-[11px] font-bold shadow-sm transition-colors"
          >
            <TrashIcon /> سڕینەوە
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-4 space-y-3">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 flex-1">
            {title}
          </p>
          <span className={`flex-shrink-0 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full border ${cls}`}>
            {label}
            <span className="hidden sm:inline"> · {labelEn}</span>
          </span>
        </div>

        {/* Meta row */}
        {(listing.year || listing.mileage || listing.city) && (
          <div className={`flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            {listing.year && <span>{listing.year}</span>}
            {listing.year && listing.mileage && <span className="opacity-40">·</span>}
            {listing.mileage && <span>{listing.mileage.toLocaleString()} km</span>}
            {(listing.year || listing.mileage) && listing.city && <span className="opacity-40">·</span>}
            {listing.city && <span>{listing.city}</span>}
          </div>
        )}

        {/* Price row */}
        <div className={`flex items-center justify-between pt-0.5 border-t border-gray-100 dark:border-white/[0.05] ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5 uppercase tracking-wide font-medium">
              {listing.currency === 'IQD' ? 'دینار' : listing.currency === 'AED' ? 'درهم' : listing.currency === 'CNY' ? '人民币' : listing.currency}
            </p>
            <p className="text-lg font-black text-[#e94560] leading-none tracking-tight tabular-nums">
              {formatPrice(listing.price, listing.currency)}
            </p>
          </div>

          {/* Edit link (always visible on mobile, hidden on desktop since hover works) */}
          <Link
            href={`dashboard/edit/${listing.id}`}
            className="sm:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.07] text-gray-600 dark:text-gray-300 text-[11px] font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            <EditIcon /> دەستکاری
          </Link>
        </div>
      </div>
    </article>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function MyListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { locale } = useParams();
  const isRTL = locale === 'ar' || locale === 'ku';

  useEffect(() => {
    api.listings.myListings()
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await api.listings.delete(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  // ── counts ──
  const counts = {
    all: listings.length,
    active: listings.filter((l) => l.status === 'ACTIVE').length,
    pending: listings.filter((l) => l.status === 'PENDING').length,
    sold: listings.filter((l) => l.status === 'SOLD').length,
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-44 bg-gray-200 dark:bg-white/[0.07] rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 dark:bg-white/[0.07] rounded-xl animate-pulse" />
        </div>
        {/* stat pills skeleton */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-100 dark:bg-white/[0.04] rounded-full animate-pulse" />
          ))}
        </div>
        {/* grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (!listings.length) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
        <div className="text-gray-300 dark:text-gray-700">
          <EmptyIcon />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">هیچ ئۆتۆمبێلێکت نەنووستووە</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
            یەکەمین ئۆتۆمبێل، موتوسیکلێت، یان پارچەی خۆت زیاد بکە و دەستپێبکە بە فرۆشتن.
          </p>
        </div>
        <Link
          href="dashboard/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#e94560] hover:bg-[#c73652] text-white text-sm font-bold shadow-[0_4px_14px_rgba(233,69,96,0.4)] hover:shadow-[0_6px_20px_rgba(233,69,96,0.5)] transition-all duration-200 hover:-translate-y-0.5"
        >
          <PlusIcon />
          زیادکردنی ئۆتۆمبێل
        </Link>
      </div>
    );
  }

  // ── Listings ─────────────────────────────────────────────────────────────
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            ئۆتۆمبێلەکانم
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {counts.all} ئۆتۆمبێل تۆمارکراوە
          </p>
        </div>
        <Link
          href="dashboard/new"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-[#e94560] hover:bg-[#c73652] text-white text-sm font-bold shadow-[0_3px_10px_rgba(233,69,96,0.35)] hover:shadow-[0_4px_16px_rgba(233,69,96,0.5)] transition-all duration-200 hover:-translate-y-0.5"
        >
          <PlusIcon />
          <span className="hidden sm:inline">زیادکردن</span>
          <span className="sm:hidden">نوێ</span>
        </Link>
      </div>

      {/* ── Stat pills ── */}
      <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
        {[
          { label: 'هەموو', labelEn: 'All', count: counts.all, cls: 'bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/[0.1]' },
          { label: 'چالاک', labelEn: 'Active', count: counts.active, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
          { label: 'چاوەڕوان', labelEn: 'Pending', count: counts.pending, cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
          { label: 'فرۆشراو', labelEn: 'Sold', count: counts.sold, cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
        ].map(({ label, labelEn, count, cls }) => (
          <span key={labelEn} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cls}`}>
            {label}
            <span className="opacity-60">·</span>
            <span className="tabular-nums">{count}</span>
          </span>
        ))}
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onDelete={handleDelete}
            isRTL={isRTL}
          />
        ))}
      </div>
    </div>
  );
}
