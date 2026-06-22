// app/sitemap-listings/route.ts — Dynamic listings sitemap
// Fetches active listings from the API and generates an XML sitemap.
// Linked from robots.txt as /sitemap-listings.xml
// Next.js serves /sitemap-listings as /sitemap-listings.xml via the route handler.
import { locales } from '@/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';
const API_URL  = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Listing {
  id: string;
  updatedAt?: string;
  createdAt?: string;
  images?: { url: string; isCover?: boolean }[];
  titleEn?: string;
}

async function fetchListings(): Promise<Listing[]> {
  try {
    const res = await fetch(
      `${API_URL}/listings?status=ACTIVE&limit=5000&fields=id,updatedAt,createdAt,images,titleEn`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? data ?? [];
  } catch {
    return [];
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const listings = await fetchListings();

  const urlEntries = listings.map((listing) => {
    const lastmod = listing.updatedAt ?? listing.createdAt ?? new Date().toISOString();
    const cover   = listing.images?.find((i) => i.isCover)?.url ?? listing.images?.[0]?.url;

    // Build hreflang alternates
    const alternates = locales
      .map((l) => {
        const hreflang = l === 'ku' ? 'ckb' : l;
        return `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${BASE_URL}/${l}/cars/${listing.id}"/>`;
      })
      .join('\n      ');

    // Optional image block
    const imageTag = cover
      ? `
      <image:image>
        <image:loc>${escapeXml(cover)}</image:loc>
        ${listing.titleEn ? `<image:title>${escapeXml(listing.titleEn)}</image:title>` : ''}
      </image:image>`
      : '';

    return `
  <url>
    <loc>${BASE_URL}/ku/cars/${listing.id}</loc>
    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    ${alternates}${imageTag}
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries.join('')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
