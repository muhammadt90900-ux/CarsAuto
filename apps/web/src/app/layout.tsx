// app/layout.tsx — Root layout: fonts + global SEO defaults + error boundary
import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

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
  verification: {},
  category: 'automotive',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AutoBazaar',
  },
  formatDetection: {
    telephone: false,
  },
} as const;

/* ── Viewport ────────────────────────────────────────────────── */
export const viewport: Viewport = {
  themeColor: '#050b14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
} as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return children as React.ReactElement;
}
