// app/[locale]/(public)/cars/[id]/page.tsx
// Elite Car Details Page — AutoBazaar Pro

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CarDetailClient } from '@/components/features/cars/CarDetailClient';

/* ── Data fetchers ─────────────────────────────────────────────── */
async function getListing(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listings/${id}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getSimilarCars(listing: any) {
  try {
    const brandId = listing?.vehicleSpec?.brandId;
    const type    = listing?.type ?? 'car';
    const params  = new URLSearchParams({ type, limit: '6' });
    if (brandId) params.set('brandId', brandId);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listings?${params}`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const all  = data.data ?? data ?? [];
    // Exclude current listing
    return all.filter((c: any) => c.id !== listing.id).slice(0, 6);
  } catch {
    return [];
  }
}

/* ── Metadata ───────────────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: { id: string; locale: string };
}): Promise<Metadata> {
  const listing = await getListing(params.id);
  if (!listing) return { title: 'Listing Not Found' };

  const locale  = params.locale as 'ku' | 'ar' | 'en' | 'zh';
  const titleKey = `title${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof listing;
  const title   = listing[titleKey] ?? listing.titleEn ?? 'Car Listing';
  const cover   = listing.images?.find((i: any) => i.isCover)?.url ?? listing.images?.[0]?.url;

  return {
    title: `${title} — AutoBazaar Pro`,
    description: listing.descriptionEn?.slice(0, 155) ?? `${title} for sale on AutoBazaar Pro`,
    openGraph: {
      title,
      images: cover ? [cover] : [],
      type: 'website',
    },
  };
}

/* ── Page ────────────────────────────────────────────────────────── */
export default async function CarDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const [listing, similarCars] = await Promise.all([
    getListing(params.id),
    getListing(params.id).then(l => l ? getSimilarCars(l) : []),
  ]);

  if (!listing) notFound();

  return (
    <CarDetailClient
      listing={listing}
      similarCars={similarCars}
      locale={params.locale}
    />
  );
}
