// components/features/marketplace/createListingDetailPage.tsx
//
// AUDIT FIX (C1 — Critical): factory for the [id]/page.tsx route exports
// (generateStaticParams / generateMetadata / default page component)
// shared by spare-parts, accessories, and services detail pages. Mirrors
// the structure of app/[locale]/(public)/cars/[id]/page.tsx and
// .../motorcycles/[id]/page.tsx (ISR 60s, generateStaticParams for
// featured listings, Suspense-streamed "similar" section, JSON-LD +
// hreflang), but as one parametrized factory instead of three
// copy-pasted files — see M1 in the pre-beta audit report re: avoiding a
// fourth/fifth near-duplicate detail-page implementation.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Script from 'next/script';
import { ListingDetailClient, type DetailConfig } from './ListingDetailClient';
import { locales, hreflangMap, type Locale } from '@/i18n/config';
import { serverFetch } from '@/lib/server-api';
import { safeJsonLd } from '@/lib/json-ld-safe';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';

async function getListing(id: string) {
  return serverFetch<any>(`/listings/${id}`, { revalidate: 60, tags: [`listing-${id}`] });
}

async function getSimilarListings(listingType: string, listing: any): Promise<any[]> {
  const data = await serverFetch<any>('/listings', {
    revalidate: 120,
    tags: ['listings-list'],
    searchParams: { type: listingType, limit: 6 },
  });
  if (!data) return [];
  return (data.data ?? data ?? []).filter((l: any) => l.id !== listing.id).slice(0, 6);
}

function buildJsonLd(config: DetailConfig, listing: any, locale: string) {
  const title = listing.titleEn ?? listing.title?.en ?? config.titleEn;
  const url = `${BASE_URL}/${locale}/${config.routeSegment}/${listing.id}`;

  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: listing.descriptionEn ?? listing.description?.en ?? title,
    url,
    image: listing.images?.map((i: any) => i.url) ?? [],
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: listing.currency ?? 'USD',
      availability: 'https://schema.org/InStock',
      url,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: config.titleEn, item: `${BASE_URL}/${locale}/${config.routeSegment}` },
      { '@type': 'ListItem', position: 3, name: title, item: url },
    ],
  };

  return { productJsonLd, breadcrumbJsonLd };
}

/**
 * Builds the full set of App Router exports for a `[id]/page.tsx` route.
 * Usage in the route file:
 *
 *   export const { generateStaticParams, generateMetadata, default: default } =
 *     createListingDetailPage({ listingType: 'SPARE_PART', config: sparePartDetailConfig });
 */
export function createListingDetailPage({
  listingType,
  config,
}: {
  listingType: 'SPARE_PART' | 'ACCESSORY' | 'SERVICE';
  config: DetailConfig;
}) {
  async function generateStaticParams() {
    const data = await serverFetch<any>('/listings', {
      revalidate: 3600,
      searchParams: { type: listingType, featured: true, limit: 50, status: 'ACTIVE' },
    });
    if (!data) return [];
    return (data.data ?? []).flatMap((l: any) => locales.map((locale) => ({ locale, id: l.id })));
  }

  async function generateMetadata({
    params,
  }: {
    params: Promise<{ id: string; locale: string }>;
  }): Promise<Metadata> {
    const { id, locale } = await params;
    const listing = await getListing(id);
    if (!listing) return { title: 'Listing Not Found' };

    const title = (listing.titleEn ?? listing.title?.[locale] ?? listing.title?.en ?? `${config.titleEn} Listing`) as string;
    const cover = listing.images?.find((i: any) => i.isCover)?.url ?? listing.images?.[0]?.url;
    const rawDesc = (listing.descriptionEn ?? listing.description?.en ?? `${title} for sale on CarsAuto`) as string;
    const desc = rawDesc.slice(0, 155);
    const canonical = `${BASE_URL}/${locale}/${config.routeSegment}/${id}`;

    const languages: Record<string, string> = { 'x-default': `${BASE_URL}/ku/${config.routeSegment}/${id}` };
    for (const loc of locales) {
      languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/${config.routeSegment}/${id}`;
    }

    return {
      title: `${title} — CarsAuto`,
      description: desc,
      openGraph: {
        title,
        description: desc,
        type: 'website',
        url: canonical,
        siteName: 'CarsAuto',
        images: cover
          ? [{ url: cover, width: 1200, height: 630, alt: title }]
          : [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: 'CarsAuto' }],
      },
      twitter: {
        card: 'summary_large_image',
        site: '@CarsAuto',
        title,
        description: desc,
        images: cover ? [cover] : [`${BASE_URL}/og-default.jpg`],
      },
      alternates: { canonical, languages },
    };
  }

  async function DetailPage({
    params,
  }: {
    params: Promise<{ id: string; locale: string }>;
  }) {
    const { id, locale } = await params;
    const listing = await getListing(id);
    if (!listing) notFound();
    const { productJsonLd, breadcrumbJsonLd } = buildJsonLd(config, listing, locale);
    const similarPromise = getSimilarListings(listingType, listing);

    return (
      <>
        {/* safeJsonLd (not JSON.stringify) — productJsonLd embeds user-controlled title/description; unescaped "</script>" would break out of this tag (stored XSS) */}
        <Script
          id="jsonld-product"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
        />
        <Script
          id="jsonld-breadcrumb"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
        />
        <Suspense fallback={null}>
          <DetailWithSimilar listing={listing} similarPromise={similarPromise} locale={locale} config={config} />
        </Suspense>
      </>
    );
  }

  async function DetailWithSimilar({
    listing,
    similarPromise,
    locale,
    config: cfg,
  }: {
    listing: any;
    similarPromise: Promise<any[]>;
    locale: string;
    config: DetailConfig;
  }) {
    const similarListings = await similarPromise;
    return <ListingDetailClient listing={listing} similarListings={similarListings} locale={locale} config={cfg} />;
  }

  return { generateStaticParams, generateMetadata, DetailPage };
}
