// apps/web/src/app/[locale]/(public)/about/page.tsx
// New page — previously linked from the footer but did not exist (audit item 1.2).
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, hreflangMap, isRTL, type Locale } from "@/i18n/config";
import { Shield, Globe2, Sparkles, Users } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

type Props = {
  params: Promise<{ locale: string }>;
};

const TITLES: Record<Locale, string> = {
  ku: "دەربارەی CarsAuto | CarsAuto",
  ar: "عن CarsAuto | CarsAuto",
  en: "About CarsAuto | CarsAuto",
  zh: "关于 CarsAuto | CarsAuto",
};

const DESCS: Record<Locale, string> = {
  ku: "CarsAuto بازاڕی ئۆتۆمبێلە لە عێراق، کوردستان و ئیمارات. دەربارەی ئامانج و خزمەتگوزارییەکانمان زیاتر بزانە.",
  ar: "CarsAuto سوق السيارات في العراق وكردستان والإمارات. تعرف أكثر على مهمتنا وخدماتنا.",
  en: "CarsAuto is the vehicle marketplace for Iraq, Kurdistan & the UAE. Learn about our mission and what we offer.",
  zh: "CarsAuto 是伊拉克、库尔德斯坦和阿联酋的汽车交易平台。了解我们的使命与服务。",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const title = TITLES[locale] ?? TITLES.en;
  const desc = DESCS[locale] ?? DESCS.en;
  const canonical = `${BASE_URL}/${locale}/about`;
  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/about` };
  for (const loc of locales) languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/about`;

  return {
    title,
    description: desc,
    openGraph: { type: "website", siteName: "CarsAuto", title, description: desc, url: canonical },
    twitter: { card: "summary", site: "@CarsAuto", title, description: desc },
    alternates: { canonical, languages },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const t = await getTranslations({ locale, namespace: "legal.about" });
  const rtl = isRTL(locale);
  const offerItems = t.raw("offerItems") as string[];
  const icons = [Shield, Users, Sparkles, Globe2];

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-display font-black text-gray-900 dark:text-white mb-6">
        {t("title")}
      </h1>
      <p className="text-lg text-gray-600 dark:text-white/60 leading-relaxed mb-10">
        {t("intro")}
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t("missionTitle")}</h2>
        <p className="text-gray-600 dark:text-white/50 leading-relaxed">{t("missionBody")}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("offerTitle")}</h2>
        <ul className="space-y-3">
          {offerItems.map((item, i) => {
            const Icon = icons[i % icons.length];
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden />
                </span>
                <span className="text-gray-600 dark:text-white/50 leading-relaxed">{item}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t("marketsTitle")}</h2>
        <p className="text-gray-600 dark:text-white/50 leading-relaxed">{t("marketsBody")}</p>
      </section>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-6">
        <p className="text-gray-700 dark:text-white/60">{t("contactCta")}</p>
      </div>
    </div>
  );
}
