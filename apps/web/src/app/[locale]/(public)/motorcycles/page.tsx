// apps/web/src/app/[locale]/(public)/motorcycles/page.tsx
import type { Metadata } from "next";
import { MotorcyclesClient } from "@/components/features/motorcycles/MotorcyclesClient";
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
  const titles: Record<Locale, string> = {
    ku: "مۆتۆسیکلەت | CarsAuto",
    ar: "الدراجات النارية | CarsAuto",
    en: "Motorcycles for Sale | CarsAuto",
    zh: "摩托车 | CarsAuto",
  };
  const descs: Record<Locale, string> = {
    ku: "کڕین و فرۆشتنی مۆتۆسیکلەت لە ئێراق و کوردستان.",
    ar: "شراء وبيع الدراجات النارية في العراق وكردستان.",
    en: "Buy and sell motorcycles in Iraq and Kurdistan.",
    zh: "在伊拉克和库尔德斯坦买卖摩托车。",
  };

  const title = titles[locale] ?? titles.en;
  const desc  = descs[locale]  ?? descs.en;
  const canonical = `${BASE_URL}/${locale}/motorcycles`;
  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/motorcycles` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/motorcycles`;
  }

  return {
    title,
    description: desc,
    openGraph: { type: "website", siteName: "CarsAuto", title, description: desc, url: canonical },
    twitter: { card: "summary", site: "@CarsAuto", title, description: desc },
    alternates: { canonical, languages },
  };
}

export default async function MotorcyclesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = searchParams ? await searchParams : {};

  // Mirrors cars/page.tsx's F-PERF pattern: fetch page-1/default-filters
  // server-side so MotorcyclesClient's own useQuery has matching
  // placeholderData and doesn't re-fetch what was already rendered.
  const initialData = await serverFetch("/listings", {
    revalidate: 30,
    tags: ["listings-list"],
    searchParams: {
      type: "MOTORCYCLE",
      brandId: search.brandId,
      search: search.search,
      limit: 24,
      page: 1,
    },
  });

  return <MotorcyclesClient locale={locale} initialSearch={search} initialData={initialData ?? undefined} />;
}
