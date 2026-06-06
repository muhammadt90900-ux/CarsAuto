// apps/web/src/app/[locale]/(public)/motorcycles/page.tsx
import type { Metadata } from "next";
import { locales, hreflangMap, type Locale } from "@/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autobazaarpro.com";

type Props = { params: { locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale as Locale;
  const titles: Record<Locale, string> = {
    ku: "مۆتۆسیکلەت | AutoBazaar Pro",
    ar: "الدراجات النارية | AutoBazaar Pro",
    en: "Motorcycles for Sale | AutoBazaar Pro",
    zh: "摩托车 | AutoBazaar Pro",
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
    openGraph: { type: "website", siteName: "AutoBazaar Pro", title, description: desc, url: canonical },
    twitter: { card: "summary", site: "@AutoBazaarPro", title, description: desc },
    alternates: { canonical, languages },
  };
}

export default function MotorcyclesPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold">Motorcycles</h1>
    </div>
  );
}
