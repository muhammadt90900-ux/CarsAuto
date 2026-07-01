// apps/web/src/app/[locale]/(public)/dealers/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { DealerShowroomClient } from "@/components/features/dealers/DealerShowroomClient";
import { locales, hreflangMap, type Locale } from "@/i18n/config";
import { serverFetch } from "@/lib/server-api";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

type Props = { params: Promise<{ locale: string; slug: string }> };

// F-PERF fix: was a raw `fetch` hard-coded to NEXT_PUBLIC_API_URL — now
// routes through serverFetch (prefers INTERNAL_API_URL for server-to-server
// calls). Same revalidate window, same null-on-failure contract.
async function getDealer(slug: string) {
  return serverFetch<any>(`/dealers/${slug}`, { revalidate: 30 });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeStr, slug } = await params;
  const dealer = await getDealer(slug);
  if (!dealer) return { title: "Dealer Not Found" };

  const locale = localeStr as Locale;
  const name   = locale === "ku" ? dealer.nameKu : dealer.nameEn;
  const desc   = dealer.taglineEn ?? `View ${dealer.nameEn}\'s showroom — ${dealer.activeListings} active listings.`;
  const canonical = `${BASE_URL}/${locale}/dealers/${slug}`;
  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/dealers/${slug}` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/dealers/${slug}`;
  }

  return {
    title: `${name} | CarsAuto`,
    description: desc,
    openGraph: {
      title: name,
      description: desc,
      type: "website",
      siteName: "CarsAuto",
      url: canonical,
      images: dealer.coverUrl
        ? [{ url: dealer.coverUrl, width: 1200, height: 630, alt: name }]
        : [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@CarsAuto",
      title: name,
      description: desc,
      images: dealer.coverUrl ? [dealer.coverUrl] : [`${BASE_URL}/og-default.jpg`],
    },
    alternates: { canonical, languages },
  };
}

function buildDealerJsonLd(dealer: any, locale: string, slug: string) {
  const name = locale === "ku" ? dealer.nameKu : dealer.nameEn;
  const url  = `${BASE_URL}/${locale}/dealers/${slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name,
    url,
    description: dealer.taglineEn ?? "",
    image: dealer.coverUrl ?? "",
    address: {
      "@type": "PostalAddress",
      addressLocality: dealer.city ?? "",
      addressCountry: dealer.country ?? "IQ",
    },
    ...(dealer.phone ? { telephone: dealer.phone } : {}),
    ...(dealer.rating ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: dealer.rating,
        reviewCount: dealer.reviewCount ?? 0,
        bestRating: 5,
      },
    } : {}),
    numberOfEmployees: { "@type": "QuantitativeValue", value: dealer.activeListings ?? 0 },
  };
}

export default async function DealerShowroomPage({ params }: Props) {
  const { locale, slug } = await params;
  const dealer = await getDealer(slug);
  if (!dealer) notFound();

  const dealerJsonLd = buildDealerJsonLd(dealer, locale, slug);

  return (
    <>
      <Script
        id="jsonld-dealer"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dealerJsonLd) }}
      />
      <DealerShowroomClient dealer={dealer} locale={locale} />
    </>
  );
}
