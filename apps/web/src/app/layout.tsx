// app/layout.tsx — Root layout: fonts + global SEO defaults
import type { Metadata, Viewport } from 'next';
import {
  Syne,
  DM_Sans,
  Noto_Sans_Arabic,
  Noto_Sans_SC,
  JetBrains_Mono,
} from 'next/font/google';
import '@/styles/globals.css';

/* ── Font definitions ─────────────────────────────────────────── */
const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-noto-arabic',
  display: 'swap',
});

const notoSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sc',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autobazaarpro.com';

/* ── Global Metadata ─────────────────────────────────────────── */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s | AutoBazaar Pro',
    default: 'AutoBazaar Pro — Premium Automotive Marketplace',
  },
  description:
    "The Middle East's most trusted premium auto marketplace — Iraq, Kurdistan, Dubai. Buy & sell cars, motorcycles and spare parts.",
  applicationName: 'AutoBazaar Pro',
  authors: [{ name: 'AutoBazaar Pro', url: BASE_URL }],
  generator: 'Next.js',
  keywords: [
    'cars for sale Iraq',
    'buy car Kurdistan',
    'ئۆتۆمبێل فرۆشتن',
    'used cars Erbil',
    'car dealer Sulaymaniyah',
    'auto marketplace Middle East',
    'spare parts Iraq',
    'motorcycles Kurdistan',
  ],
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'AutoBazaar Pro',
    title: 'AutoBazaar Pro — Premium Automotive Marketplace',
    description:
      "The Middle East's most trusted premium auto marketplace — Iraq, Kurdistan, Dubai.",
    url: BASE_URL,
    images: [
      {
        url: `${BASE_URL}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: 'AutoBazaar Pro — Premium Automotive Marketplace',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@AutoBazaarPro',
    creator: '@AutoBazaarPro',
    title: 'AutoBazaar Pro — Premium Automotive Marketplace',
    description:
      "The Middle East's most trusted premium auto marketplace — Iraq, Kurdistan, Dubai.",
    images: [`${BASE_URL}/og-default.jpg`],
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      ckb: `${BASE_URL}/ku`,
      ar: `${BASE_URL}/ar`,
      en: `${BASE_URL}/en`,
      zh: `${BASE_URL}/zh`,
      'x-default': `${BASE_URL}/ku`,
    },
  },
  verification: {
    // Add your Google Search Console / Bing verification tokens here
    // google: 'YOUR_GOOGLE_VERIFICATION_TOKEN',
    // other: { 'msvalidate.01': 'YOUR_BING_TOKEN' },
  },
  category: 'automotive',
};

/* ── Viewport (separate export — Next.js 14+) ────────────────── */
export const viewport: Viewport = {
  themeColor: '#050b14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/** Font variable class string — applied once on root html */
export const fontVariables = [
  syne.variable,
  dmSans.variable,
  notoArabic.variable,
  notoSC.variable,
  jetbrainsMono.variable,
].join(' ');

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: <html> and <body> are intentionally NOT rendered here.
  // The [locale]/layout.tsx renders them with the correct lang/dir attributes.
  // Next.js App Router supports this pattern — the locale layout is the
  // effective root for every localised route.
  return children as React.ReactElement;
}
