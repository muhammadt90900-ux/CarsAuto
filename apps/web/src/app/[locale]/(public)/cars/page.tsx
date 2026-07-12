// apps/web/src/app/[locale]/(public)/cars/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CarsMarketplaceClient } from "@/components/features/cars/CarsMarketplaceClient";
import { locales, hreflangMap, type Locale } from "@/i18n/config";
import { serverFetch } from "@/lib/server-api";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeStr } = await params;
  const locale = localeStr as Locale;
  const t = await getTranslations({ locale, namespace: "meta" });

  const canonical = `${BASE_URL}/${locale}/cars`;
  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/cars` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/cars`;
  }

  const title = `${t("carsTitle") || "Cars for Sale"} | CarsAuto`;
  const desc  = t("carsDesc") || "Browse thousands of verified new and used car listings in Iraq, Kurdistan & UAE.";

  return {
    title,
    description: desc,
    openGraph: {
      type: "website",
      siteName: "CarsAuto",
      title,
      description: desc,
      url: canonical,
      images: [{ url: `${BASE_URL}/og-cars.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@CarsAuto",
      title,
      description: desc,
      images: [`${BASE_URL}/og-cars.jpg`],
    },
    alternates: { canonical, languages },
  };
}

export default async function CarsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = searchParams ? await searchParams : {};

  // F-PERF fix: fetches exactly what CarsMarketplaceClient's own useQuery
  // would fetch on first mount (same filter params, page 1) — so React
  // Query's `initialData` lines up with the query it actually runs, and
  // the browser never re-fetches what the server already rendered.
  const initialData = await serverFetch<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>("/listings", {
    revalidate: 30,
    tags: ["listings-list"],
    searchParams: { type: "CAR", make: search.make, city: search.city, q: search.q, limit: 24, page: 1 },
  });

  return <CarsMarketplaceClient locale={locale} initialSearch={search} initialData={initialData ?? undefined} />;
}
