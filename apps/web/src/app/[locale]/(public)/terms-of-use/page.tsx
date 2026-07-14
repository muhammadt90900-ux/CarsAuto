// apps/web/src/app/[locale]/(public)/terms-of-use/page.tsx
// New page — previously linked from the footer but did not exist (audit item 1.2).
// NOTE FOR PM/LEGAL: solid starting draft (eligibility, account, listings,
// prohibited conduct, fees, buyer/seller responsibility, liability,
// termination, governing law) but has not been reviewed by counsel.
// Please have it reviewed before Beta launch.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isRTL, type Locale } from "@/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carsauto.com";

type Props = {
  params: Promise<{ locale: string }>;
};

const TITLES: Record<Locale, string> = {
  ku: "مەرجەکانی بەکارهێنان | CarsAuto",
  ar: "شروط الاستخدام | CarsAuto",
  en: "Terms of Use | CarsAuto",
  zh: "使用条款 | CarsAuto",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const title = TITLES[locale] ?? TITLES.en;
  const canonical = `${BASE_URL}/${locale}/terms-of-use`;

  return {
    title,
    robots: { index: true, follow: true },
    alternates: { canonical },
  };
}

export default async function TermsOfUsePage({ params }: Props) {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const t = await getTranslations({ locale, namespace: "legal.terms" });
  const rtl = isRTL(locale);
  const sections = t.raw("sections") as { heading: string; body: string }[];

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-display font-black text-gray-900 dark:text-white mb-2">
        {t("title")}
      </h1>
      <p className="text-sm text-gray-400 dark:text-white/30 mb-8">{t("lastUpdated")}</p>
      <p className="text-gray-600 dark:text-white/60 leading-relaxed mb-10">{t("intro")}</p>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{s.heading}</h2>
            <p className="text-gray-600 dark:text-white/50 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-10 pt-8 border-t border-gray-200 dark:border-white/10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("contactTitle")}</h2>
        <p className="text-gray-600 dark:text-white/50">
          {t("contactBody")}{" "}
          <a href="mailto:support@carsauto.com" className="text-amber-600 dark:text-amber-400 hover:underline">
            support@carsauto.com
          </a>
        </p>
      </section>
    </div>
  );
}
