'use client';
// components/features/home/FeaturedCars.tsx — now built on the shared
// ListingCard (components/shared/ListingCard.tsx) instead of a local,
// one-off CarCard. The local CarCard/CarCardSkeleton were exactly the kind
// of "one page reinvents the card" drift flagged in the design audit —
// duplicated badge styles, a hardcoded `$` prefix on price regardless of
// `currency` (IQD/AED/CNY/EUR all render as USD before this change), and a
// heart button with no vertical-specific meta reuse. Removed in favor of
// one component used everywhere.

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { listingsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ListingCard, ListingCardGrid } from '@/components/shared/ListingCard';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import { ListingType, ListingStatus, ListingCondition, Currency, type Listing } from '@cars-auto/types';

/**
 * Adapter: `packages/types` declares CarListing.title as `MultiLangContent`
 * and images/seller as separate joins (only present on the detail
 * response), but the real `/listings` list endpoint this page calls
 * returns a denormalized shape (titleEn/titleKu, make, city, images[],
 * verified, phone) that isn't fully captured by the strict type yet. This
 * adapter bridges that gap in one place instead of every card guessing
 * field names inline — flagging it here rather than silently working
 * around it everywhere, since it points at a real types-package/API
 * contract drift worth reconciling on the backend side separately.
 */
function toListingCardProps(car: any, locale?: string) {
  const rawImages: any[] = car.images ?? [];
  const images = rawImages.map((img) =>
    typeof img === 'string' ? { url: img, key: img, width: 0, height: 0 } : img
  );

  const listing: Listing = {
    id: car.id,
    type: ListingType.CAR,
    title: typeof car.title === 'object'
      ? car.title
      : { en: car.titleEn ?? car.title ?? '', ku: car.titleKu ?? car.titleEn ?? car.title ?? '', ar: car.titleAr ?? '', zh: car.titleZh ?? '' },
    description: { en: '', ku: '', ar: '', zh: '' },
    price: car.price ?? 0,
    currency: car.currency ?? Currency.USD,
    negotiable: !!car.negotiable,
    locationId: car.locationId ?? car.city ?? '',
    userId: car.userId ?? car.dealer?.id ?? '',
    status: car.status ?? (car.sold ? ListingStatus.SOLD : ListingStatus.ACTIVE),
    views: car.views ?? 0,
    featured: !!car.featured,
    createdAt: car.createdAt ?? new Date(),
    updatedAt: car.updatedAt ?? new Date(),
    makeId: car.makeId ?? '',
    modelId: car.modelId ?? '',
    year: car.year ?? 0,
    bodyType: car.bodyType ?? '',
    condition: car.condition ?? ListingCondition.USED,
    mileage: car.mileage ?? 0,
    color: car.color ?? '',
    fuelType: car.fuelType ?? '—',
    transmission: car.transmission ?? '—',
    engineSize: car.engineSize ?? 0,
    driveType: car.driveType ?? '',
    doors: car.doors ?? 0,
    seats: car.seats ?? 0,
    features: car.features ?? [],
  };

  const seller = {
    id: car.dealer?.id ?? car.userId ?? '',
    name: car.dealer?.name ?? car.sellerName ?? '',
    avatar: car.dealer?.avatar ?? null,
    phone: car.phone ?? car.dealer?.phone ?? null,
    verified: !!car.verified,
    isDealer: !!car.dealer,
  };

  return {
    listing,
    images,
    seller,
    locationLabel: car.city ?? car.location ?? undefined,
    locale: (locale ?? 'en') as any,
  };
}

/* ── Featured Cars Section ────────────────────────────────────── */
export function FeaturedCars({ locale }: { locale?: string }) {
  const [activeTab, setActiveTab] = useState<'featured' | 'new' | 'deals'>('featured');
  const { data: favorites } = useFavorites();
  const { toggle } = useToggleFavorite();
  const favoritedIds = new Set((favorites ?? []).map((f) => f.id));

  // BUG FIX: Removed `featured: true` filter.
  // All new listings have featured=false by default (schema: `featured Boolean @default(false)`).
  // Filtering by featured:true means regular seller listings NEVER appear on the homepage.
  // The featured badge is still shown per-card via `car.featured`. The backend already
  // sorts featured listings first: orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }].
  // staleTime reduced from 5 min → 60 s so newly created listings appear quickly.
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: queryKeys.listings.list({ type: 'CAR', limit: 8 }),
    queryFn: () => listingsApi.getAll({ type: 'CAR', limit: 8 }),
    staleTime: 60 * 1000,
  });

  // Separate query for the "⭐ Featured" tab — only when user clicks it
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: queryKeys.listings.list({ type: 'CAR', featured: true, limit: 8 }),
    queryFn: () => listingsApi.getAll({ type: 'CAR', featured: true, limit: 8 }),
    staleTime: 60 * 1000,
    enabled: activeTab === 'featured',
  });

  // For "New Arrivals" tab: most recent (already default sort)
  // For "Best Deals" tab: lowest price (could add sortBy=price later, for now same pool)
  const isLoading = activeTab === 'featured' ? featuredLoading : allLoading;

  const rawCars = activeTab === 'featured'
    ? (featuredData?.data ?? allData?.data ?? [])  // fall back to allData if no featured listings
    : (allData?.data ?? []);

  const cars = rawCars;

  const tabs = [
    { id: 'featured', label: '⭐ Featured' },
    { id: 'new',      label: '⚡ New Arrivals' },
    { id: 'deals',    label: '🏷️ Best Deals' },
  ] as const;

  return (
    <section className="py-16 bg-[var(--surface-0)] dark:bg-[var(--ink-900)] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none hidden dark:block opacity-[0.02]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.8) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-px bg-gradient-to-r from-[var(--gold)] to-transparent" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--gold)]">Handpicked Listings</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-[var(--text-primary)]">
              Featured Cars
            </h2>
          </div>
          <Link
            href="/cars"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)]
                       hover:text-[var(--gold-light)] transition-colors group"
          >
            View all listings
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Car listing categories"
          className="flex gap-1.5 mb-6 bg-white dark:bg-[#070e1c]/80 p-1 rounded-xl w-fit
                        border border-slate-100 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.20)]"
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]
                          ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-[#a87828] to-[var(--gold)] text-[var(--ink-900)] shadow-[0_2px_12px_rgba(201,168,76,0.38)] font-bold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <ListingCardGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCard key={i} loading {...toListingCardProps({ id: `sk-${i}` }, locale)} />
            ))}
          </ListingCardGrid>
        ) : cars.length > 0 ? (
          <div
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
          >
            <ListingCardGrid>
              {cars.map((car: any) => {
                const cardProps = toListingCardProps(car, locale);
                return (
                  <ListingCard
                    key={car.id}
                    {...cardProps}
                    saved={favoritedIds.has(car.id)}
                    onToggleSave={(id, next) => toggle(cardProps.listing, next)}
                  />
                );
              })}
            </ListingCardGrid>
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-400 dark:text-white/30 text-sm">
              No listings yet. Check back soon!
            </p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <Link
            href="/cars"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl text-sm font-bold
                       border border-[var(--gold-glow-lg)] text-[var(--gold)]
                       hover:bg-[rgba(201,168,76,0.08)] hover:border-[rgba(201,168,76,0.7)]
                       hover:shadow-[0_0_24px_rgba(201,168,76,0.15)] hover:-translate-y-0.5
                       active:translate-y-0 transition-all duration-250"
          >
            Browse All Cars
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
