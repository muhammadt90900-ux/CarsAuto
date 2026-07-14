// apps/web/src/app/[locale]/(public)/contact/page.tsx
// New page — previously linked from the footer but did not exist (audit item 1.2).
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { locales, hreflangMap, isRTL, type Locale } from "@/i18n/config";
import { Mail, ShieldAlert, Store, Clock } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

type Props = {
  params: Promise<{ locale: string }>;
};

const TITLES: Record<Locale, string> = {
  ku: "پەیوەندیمان پێوە بکە | CarsAuto",
  ar: "تواصل معنا | CarsAuto",
  en: "Contact Us | CarsAuto",
  zh: "联系我们 | CarsAuto",
};

const DESCS: Record<Locale, string> = {
  ku: "پەیوەندیمان پێوە بکە بۆ پشتگیری، پرسیاری فرۆشیار، یان ڕاپۆرتکردنی کێشە.",
  ar: "تواصل معنا للدعم أو استفسارات المعارض أو الإبلاغ عن مشكلة.",
  en: "Get in touch with CarsAuto for support, dealer inquiries, or to report an issue.",
  zh: "联系 CarsAuto 获取支持、经销商咨询或举报问题。",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const title = TITLES[locale] ?? TITLES.en;
  const desc = DESCS[locale] ?? DESCS.en;
  const canonical = `${BASE_URL}/${locale}/contact`;
  const languages: Record<string, string> = { "x-default": `${BASE_URL}/ku/contact` };
  for (const loc of locales) languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/contact`;

  return {
    title,
    description: desc,
    openGraph: { type: "website", siteName: "CarsAuto", title, description: desc, url: canonical },
    twitter: { card: "summary", site: "@CarsAuto", title, description: desc },
    alternates: { canonical, languages },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const t = await getTranslations({ locale, namespace: "legal.contact" });
  const rtl = isRTL(locale);

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-display font-black text-gray-900 dark:text-white mb-3">
        {t("title")}
      </h1>
      <p className="text-lg text-gray-600 dark:text-white/60 leading-relaxed mb-10">
        {t("intro")}
      </p>

      <div className="space-y-4">
        <div className="flex items-start gap-4 rounded-2xl border border-gray-200 dark:border-white/10 p-5">
          <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">{t("generalTitle")}</h2>
            <a href={`mailto:${t("generalEmail")}`} className="text-amber-600 dark:text-amber-400 text-sm hover:underline">
              {t("generalEmail")}
            </a>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-gray-200 dark:border-white/10 p-5">
          <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">{t("dealersTitle")}</h2>
            <p className="text-gray-600 dark:text-white/50 text-sm mb-2">{t("dealersBody")}</p>
            <Link href="/dealers/register" className="text-amber-600 dark:text-amber-400 text-sm font-semibold hover:underline">
              {t("dealersLinkLabel")} →
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-gray-200 dark:border-white/10 p-5">
          <span className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">{t("trustTitle")}</h2>
            <p className="text-gray-600 dark:text-white/50 text-sm mb-2">{t("trustBody")}</p>
            <a href={`mailto:${t("trustEmail")}`} className="text-amber-600 dark:text-amber-400 text-sm hover:underline">
              {t("trustEmail")}
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-white/30 mt-8">
        <Clock className="w-4 h-4" aria-hidden />
        {t("responseNote")}
      </div>
    </div>
  );
}
