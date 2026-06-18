// apps/web/src/app/[locale]/(public)/spare-parts/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SparePartsClient } from "@/components/features/spare-parts/SparePartsClient";
import { locales, hreflangMap, type Locale } from "@/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autobazaarpro.com";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // Fallback title/desc for locales without translation yet
  const titles: Record<Locale, string> = {
    ku: "پارچە یەدەکەکان | AutoBazaar Pro",
    ar: "قطع الغيار | AutoBazaar Pro",
    en: "Spare Parts for Sale | AutoBazaar Pro",
    zh: "汽车零件 | AutoBazaar Pro",
  };
  const descs: Record<Locale, string> = {
    ku: "هەزاران پارچە یەدەکی ئورجینال و ئەلتەرناتیف بدۆزەرەوە بۆ هەموو جۆر ئۆتۆمبێلێک.",
    ar: "اعثر على قطع غيار أصلية وبديلة لجميع الموديلات في العراق والكويت والإمارات.",
    en: "Find genuine and aftermarket auto parts for all makes and models in Iraq and the UAE.",
    zh: "在伊拉克和阿联酋查找所有品牌车型的原厂和售后汽车零件。",
  };

  const title = titles[locale] ?? titles.en;
  const desc  = descs[locale]  ?? descs.en;
  const canonical = `${BASE_URL}/${locale}/spare-parts`;
  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/spare-parts` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/spare-parts`;
  }

  return {
    title,
    description: desc,
    openGraph: { type: "website", siteName: "AutoBazaar Pro", title, description: desc, url: canonical },
    twitter: { card: "summary", site: "@AutoBazaarPro", title, description: desc },
    alternates: { canonical, languages },
  };
}

export default async function SparePartsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = searchParams ? await searchParams : {};
  return <SparePartsClient locale={locale} initialSearch={search} />;
}

