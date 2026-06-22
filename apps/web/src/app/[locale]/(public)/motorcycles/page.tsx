// apps/web/src/app/[locale]/(public)/motorcycles/page.tsx
import type { Metadata } from "next";
import { locales, hreflangMap, type Locale } from "@/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

type Props = { params: Promise<{ locale: string }> };

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

export default async function MotorcyclesPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center" data-locale={locale}>
      <p className="text-white/50">Motorcycles marketplace — coming soon</p>
    </div>
  );
}
