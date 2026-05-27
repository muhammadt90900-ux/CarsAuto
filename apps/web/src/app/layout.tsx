// app/layout.tsx — Minimal root layout; locale layout handles html/body
// This file only loads fonts for the entire app. The locale layout
// sets lang, dir, and wraps children in NextIntlClientProvider.
import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: {
    template: '%s | AutoBazaar Pro',
    default: 'AutoBazaar Pro — Premium Automotive Marketplace',
  },
  description:
    "The Middle East's most trusted premium auto marketplace — Iraq, Kurdistan, Dubai.",
  themeColor: '#050b14',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autobazaarpro.com',
  ),
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
