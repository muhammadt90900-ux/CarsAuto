// app/sitemap.ts — Static pages sitemap
// Covers home, cars, spare-parts, motorcycles, dealers across all locales.
// Dynamic listings have their own sitemap at /sitemap-listings.xml
import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';

// Static public routes (no auth required)
const STATIC_ROUTES = [
  '',               // home
  '/cars',
  '/spare-parts',
  '/motorcycles',
  '/accessories',
  '/services',
  '/dealers',
  '/dealers/register',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-use',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    // x-default points to Kurdish (default locale)
    const isHome = route === '';

    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: isHome ? 'daily' : 'weekly',
        priority: isHome ? 1.0 : route === '/cars' ? 0.9 : 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l === 'ku' ? 'ckb' : l,
              `${BASE_URL}/${l}${route}`,
            ]),
          ),
        },
      });
    }
  }

  return entries;
}
