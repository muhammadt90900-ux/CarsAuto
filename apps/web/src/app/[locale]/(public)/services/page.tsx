// apps/web/src/app/[locale]/(public)/services/page.tsx
import type { Metadata } from "next";
import { ListingTypeClient } from "@/components/features/marketplace/ListingTypeClient";
import { serviceConfig } from "@/components/features/marketplace/serviceFilters";
import { locales, hreflangMap, type Locale } from "@/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params; const locale = _loc as Locale;
  const titles: Record<Locale, string> = {
    ku: "خزمەتگوزاری ئۆتۆمبێل | CarsAuto",
    ar: "خدمات السيارات | CarsAuto",
    en: "Car Services | CarsAuto",
    zh: "汽车服务 | CarsAuto",
  };
  const descs: Record<Locale, string> = {
    ku: "دۆزینەوەی باشترین خزمەتگوزاری چاککردنەوە و پاڵاوانی ئۆتۆمبێل لە عێراق و کوردستان و ئیمارات.",
    ar: "اعثر على أفضل خدمات إصلاح وصيانة السيارات في العراق وكردستان والإمارات.",
    en: "Find trusted repair, maintenance, and mobile car services across Iraq, Kurdistan, and the UAE.",
    zh: "在伊拉克、库尔德斯坦和阿联酋查找可信赖的汽车维修与保养服务。",
  };

  const title = titles[locale] ?? titles.en;
  const desc  = descs[locale]  ?? descs.en;
  const canonical = `${BASE_URL}/${locale}/services`;
  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/services` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/services`;
  }

  return {
    title,
    description: desc,
    openGraph: { type: "website", siteName: "CarsAuto", title, description: desc, url: canonical },
    twitter: { card: "summary", site: "@CarsAuto", title, description: desc },
    alternates: { canonical, languages },
  };
}

export default async function ServicesPage({ params, searchParams }: Props) {
  const { locale: _loc } = await params; const locale = _loc as Locale;
  const search = searchParams ? await searchParams : {};
  return <ListingTypeClient locale={locale} initialSearch={search} config={serviceConfig} />;
}
