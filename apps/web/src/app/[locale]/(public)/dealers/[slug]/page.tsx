// apps/web/src/app/[locale]/(public)/dealers/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { DealerShowroomClient } from "@/components/features/dealers/DealerShowroomClient";
import { locales, hreflangMap, type Locale } from "@/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autobazaarpro.com";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function getDealer(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dealers/${slug}`, {
      next: { revalidate: 30 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed");
    return res.json();
  } catch {
    return null;
  }
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
    title: `${name} | AutoBazaar Pro`,
    description: desc,
    openGraph: {
      title: name,
      description: desc,
      type: "website",
      siteName: "AutoBazaar Pro",
      url: canonical,
      images: dealer.coverUrl
        ? [{ url: dealer.coverUrl, width: 1200, height: 630, alt: name }]
        : [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@AutoBazaarPro",
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
