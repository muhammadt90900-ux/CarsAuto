// app/[locale]/(public)/cars/[id]/page.tsx — PERFORMANCE + SEO OPTIMISED
// SEO: Full JSON-LD (Car + BreadcrumbList), Twitter Cards, Canonical + hreflang
// Perf: ISR 60s, generateStaticParams pre-renders top 50, Suspense streaming

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { CarDetailClient } from "@/components/features/cars/CarDetailClient";
import { locales, hreflangMap, type Locale } from "@/i18n/config";
import { serverFetch } from "@/lib/server-api";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

// F-PERF fix: was a raw `fetch` hard-coded to NEXT_PUBLIC_API_URL (the
// public domain) — now routes through serverFetch, which prefers
// INTERNAL_API_URL for server-to-server calls. Same null-on-failure
// contract these callers already relied on, same revalidate/tags.
async function getListing(id: string) {
  return serverFetch<any>(`/listings/${id}`, { revalidate: 60, tags: [`listing-${id}`] });
}

async function getSimilarCars(listing: any): Promise<any[]> {
  const brandId = listing?.vehicleSpec?.brandId;
  const type    = listing?.type ?? "CAR";
  const data = await serverFetch<any>("/listings", {
    revalidate: 120,
    tags: ["listings-list"],
    searchParams: { type, limit: 6, ...(brandId ? { brandId } : {}) },
  });
  if (!data) return [];
  return (data.data ?? data ?? []).filter((c: any) => c.id !== listing.id).slice(0, 6);
}

export async function generateStaticParams() {
  const data = await serverFetch<any>("/listings", {
    revalidate: 3600,
    searchParams: { featured: true, limit: 50, status: "ACTIVE" },
  });
  if (!data) return [];
  return (data.data ?? []).flatMap((l: any) =>
    locales.map((locale) => ({ locale, id: l.id }))
  );
}

export async function generateMetadata({
  params,
}: {
 params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Listing Not Found" };
  const typedLocale = locale as Locale;

  const titleKey  = ("title" + locale.charAt(0).toUpperCase() + locale.slice(1)) as keyof typeof listing;
  const title     = (listing[titleKey] ?? listing.titleEn ?? "Car Listing") as string;
  const cover     = listing.images?.find((i: any) => i.isCover)?.url ?? listing.images?.[0]?.url;
  const desc      = (listing.descriptionEn?.slice(0, 155) ?? `${title} for sale on CarsAuto`) as string;
  const canonical = `${BASE_URL}/${locale}/cars/${id}`;

  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/cars/${id}` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/cars/${id}`;
  }

  return {
    title: `${title} — CarsAuto`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      url: canonical,
      siteName: "CarsAuto",
      images: cover
        ? [{ url: cover, width: 1200, height: 630, alt: title }]
        : [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: "CarsAuto" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@CarsAuto",
      title,
      description: desc,
      images: cover ? [cover] : [`${BASE_URL}/og-default.jpg`],
    },
    alternates: { canonical, languages },
  };
}

function buildListingJsonLd(listing: any, locale: string) {
  const title = listing.titleEn ?? "Car Listing";
  const spec  = listing.vehicleSpec ?? {};
  const url   = `${BASE_URL}/${locale}/cars/${listing.id}`;

  const vehicleJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: title,
    description: listing.descriptionEn ?? title,
    url,
    image: listing.images?.map((i: any) => i.url) ?? [],
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: listing.currency ?? "USD",
      availability: "https://schema.org/InStock",
      url,
      ...(listing.dealer ? {
        seller: {
          "@type": "AutoDealer",
          name: listing.dealer.nameEn ?? listing.dealer.name,
          url: `${BASE_URL}/${locale}/dealers/${listing.dealer.slug ?? listing.dealer.id}`,
        },
      } : {}),
    },
  };

  if (spec.year)         vehicleJsonLd.vehicleModelDate     = String(spec.year);
  if (spec.mileage)      vehicleJsonLd.mileageFromOdometer  = { "@type": "QuantitativeValue", value: spec.mileage, unitCode: "KMT" };
  if (spec.brand)        vehicleJsonLd.brand                = { "@type": "Brand", name: spec.brand };
  if (spec.model)        vehicleJsonLd.model                = spec.model;
  if (spec.fuelType)     vehicleJsonLd.fuelType             = spec.fuelType;
  if (spec.color)        vehicleJsonLd.color                = spec.color;
  if (spec.bodyType)     vehicleJsonLd.bodyType             = spec.bodyType;
  if (spec.transmission) vehicleJsonLd.vehicleTransmission  = spec.transmission;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: "Cars", item: `${BASE_URL}/${locale}/cars` },
      { "@type": "ListItem", position: 3, name: title,  item: url },
    ],
  };

  return { vehicleJsonLd, breadcrumbJsonLd };
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
   const { id, locale } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();
  const { vehicleJsonLd, breadcrumbJsonLd } = buildListingJsonLd(listing, locale);
  const similarCarsPromise = getSimilarCars(listing);

  return (
    <>
      <Script
        id="jsonld-vehicle"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleJsonLd) }}
      />
      <Script
        id="jsonld-breadcrumb"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={null}>
        <CarDetailWithSimilar
          listing={listing}
          similarCarsPromise={similarCarsPromise}
          locale={locale}
        />
      </Suspense>
    </>
  );
}

async function CarDetailWithSimilar({
  listing,
  similarCarsPromise,
  locale,
}: {
  listing: any;
  similarCarsPromise: Promise<any[]>;
  locale: string;
}) {
  const similarCars = await similarCarsPromise;
  return <CarDetailClient listing={listing} similarCars={similarCars} locale={locale} />;
}
