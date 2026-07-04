// app/[locale]/(public)/motorcycles/[id]/page.tsx
// Mirrors apps/web/src/app/[locale]/(public)/cars/[id]/page.tsx structure
// (ISR 60s, generateStaticParams for top featured listings, Suspense
// streaming for the "similar" section, full JSON-LD) with a
// schema.org "Motorcycle" type instead of "Car" and MotorcycleDetailClient
// instead of CarDetailClient — see MotorcycleDetailClient.tsx header for
// why this is a dedicated component rather than a `type` prop on
// CarDetailClient.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { MotorcycleDetailClient } from "@/components/features/motorcycles/MotorcycleDetailClient";
import { locales, hreflangMap, type Locale } from "@/i18n/config";
import { serverFetch } from "@/lib/server-api";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

async function getListing(id: string) {
  return serverFetch<any>(`/listings/${id}`, { revalidate: 60, tags: [`listing-${id}`] });
}

async function getSimilarMotorcycles(listing: any): Promise<any[]> {
  const brandId = listing?.vehicleSpec?.brandId;
  const data = await serverFetch<any>("/listings", {
    revalidate: 120,
    tags: ["listings-list"],
    searchParams: { type: "MOTORCYCLE", limit: 6, ...(brandId ? { brandId } : {}) },
  });
  if (!data) return [];
  return (data.data ?? data ?? []).filter((m: any) => m.id !== listing.id).slice(0, 6);
}

export async function generateStaticParams() {
  const data = await serverFetch<any>("/listings", {
    revalidate: 3600,
    searchParams: { type: "MOTORCYCLE", featured: true, limit: 50, status: "ACTIVE" },
  });
  if (!data) return [];
  return (data.data ?? []).flatMap((l: any) => locales.map((locale) => ({ locale, id: l.id })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Listing Not Found" };

  const titleKey = ("title" + locale.charAt(0).toUpperCase() + locale.slice(1)) as keyof typeof listing;
  const title = (listing[titleKey] ?? listing.titleEn ?? "Motorcycle Listing") as string;
  const cover = listing.images?.find((i: any) => i.isCover)?.url ?? listing.images?.[0]?.url;
  const desc = (listing.descriptionEn?.slice(0, 155) ?? `${title} for sale on CarsAuto`) as string;
  const canonical = `${BASE_URL}/${locale}/motorcycles/${id}`;

  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/motorcycles/${id}` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/motorcycles/${id}`;
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
  const title = listing.titleEn ?? "Motorcycle Listing";
  const spec = listing.vehicleSpec ?? {};
  const url = `${BASE_URL}/${locale}/motorcycles/${listing.id}`;

  // schema.org/Motorcycle is a subtype of Vehicle (like schema.org/Car),
  // so the same Offer/vehicle property fields apply.
  const vehicleJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Motorcycle",
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

  if (spec.year) vehicleJsonLd.vehicleModelDate = String(spec.year);
  if (spec.mileageKm) vehicleJsonLd.mileageFromOdometer = { "@type": "QuantitativeValue", value: spec.mileageKm, unitCode: "KMT" };
  if (spec.brand?.nameEn) vehicleJsonLd.brand = { "@type": "Brand", name: spec.brand.nameEn };
  if (spec.model?.nameEn) vehicleJsonLd.model = spec.model.nameEn;
  if (spec.color) vehicleJsonLd.color = spec.color;
  if (spec.engineCC) vehicleJsonLd.vehicleEngine = { "@type": "EngineSpecification", engineDisplacement: { "@type": "QuantitativeValue", value: spec.engineCC, unitCode: "CMQ" } };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: "Motorcycles", item: `${BASE_URL}/${locale}/motorcycles` },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  return { vehicleJsonLd, breadcrumbJsonLd };
}

export default async function MotorcycleDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();
  const { vehicleJsonLd, breadcrumbJsonLd } = buildListingJsonLd(listing, locale);
  const similarMotorcyclesPromise = getSimilarMotorcycles(listing);

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
        <MotorcycleDetailWithSimilar
          listing={listing}
          similarMotorcyclesPromise={similarMotorcyclesPromise}
          locale={locale}
        />
      </Suspense>
    </>
  );
}

async function MotorcycleDetailWithSimilar({
  listing,
  similarMotorcyclesPromise,
  locale,
}: {
  listing: any;
  similarMotorcyclesPromise: Promise<any[]>;
  locale: string;
}) {
  const similarMotorcycles = await similarMotorcyclesPromise;
  return <MotorcycleDetailClient listing={listing} similarMotorcycles={similarMotorcycles} locale={locale} />;
}
