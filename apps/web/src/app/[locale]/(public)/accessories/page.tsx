// apps/web/src/app/[locale]/(public)/accessories/page.tsx
import type { Metadata } from "next";
import { ListingTypeClient } from "@/components/features/marketplace/ListingTypeClient";
import { accessoryConfig } from "@/components/features/marketplace/accessoryFilters";
import { locales, hreflangMap, type Locale } from "@/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params; const locale = _loc as Locale;
  const titles: Record<Locale, string> = {
    ku: "ئاکسسواری ئۆتۆمبێل | CarsAuto",
    ar: "إكسسوارات السيارات | CarsAuto",
    en: "Car Accessories for Sale | CarsAuto",
    zh: "汽车配件 | CarsAuto",
  };
  const descs: Record<Locale, string> = {
    ku: "بەرزترین جۆرەکانی ئاکسسواری ئۆتۆمبێل بدۆزەرەوە بۆ هەموو جۆر ئۆتۆمبێلێک لە عێراق و کوردستان و ئیمارات.",
    ar: "اعثر على أفضل إكسسوارات السيارات لجميع الموديلات في العراق وكردستان والإمارات.",
    en: "Browse verified car accessories — audio, interior, exterior, and more — across Iraq, Kurdistan, and the UAE.",
    zh: "在伊拉克、库尔德斯坦和阿联酋查找经过验证的汽车配件。",
  };

  const title = titles[locale] ?? titles.en;
  const desc  = descs[locale]  ?? descs.en;
  const canonical = `${BASE_URL}/${locale}/accessories`;
  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/accessories` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/accessories`;
  }

  return {
    title,
    description: desc,
    openGraph: { type: "website", siteName: "CarsAuto", title, description: desc, url: canonical },
    twitter: { card: "summary", site: "@CarsAuto", title, description: desc },
    alternates: { canonical, languages },
  };
}

export default async function AccessoriesPage({ params, searchParams }: Props) {
  const { locale: _loc } = await params; const locale = _loc as Locale;
  const search = searchParams ? await searchParams : {};
  return <ListingTypeClient locale={locale} initialSearch={search} config={accessoryConfig} />;
}
