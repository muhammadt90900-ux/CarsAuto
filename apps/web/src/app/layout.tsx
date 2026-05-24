// app/layout.tsx — Updated for new Syne + DM Sans premium design system
import type { Metadata } from 'next';
import { Syne, DM_Sans, Noto_Sans_Arabic, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';

/* ── Fonts ── */
const syne = Syne({
  subsets: ['latin'],
  weight: ['400','500','600','700','800'],
  variable: '--font-syne',
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300','400','500','600','700'],
  variable: '--font-dm-sans',
  display: 'swap',
});
const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300','400','500','600','700','800'],
  variable: '--font-noto-arabic',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AutoBazaar Pro — Premium Automotive Marketplace',
  description: "The Middle East's most trusted premium auto marketplace — Iraq, Kurdistan, Dubai.",
  themeColor: '#050b14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body
        className={[
          syne.variable,
          dmSans.variable,
          notoArabic.variable,
          jetbrainsMono.variable,
          'font-sans antialiased',
        ].join(' ')}
      >
        {children}
      </body>
    </html>
  );
}
