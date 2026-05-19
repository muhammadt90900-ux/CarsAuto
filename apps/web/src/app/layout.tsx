// apps/web/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Noto_Sans_Arabic, Noto_Sans_SC, JetBrains_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, useLocale } from 'next-intl';
import { dir, locales } from '@/i18n/config';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-arabic',
  display: 'swap',
});

const notoSC = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sc',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AutoBazaar Pro - Premium Auto Marketplace',
  description: 'The Middle East\'s Premium Auto Marketplace for cars, motorcycles & spare parts.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  if (!locales.includes(locale as any)) notFound();

  let messages;
  try {
    messages = (await import(`@/i18n/translations/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    <html lang={locale} dir={dir(locale as any)} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoArabic.variable} ${notoSC.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#f8f9ff] dark:bg-[#0d0d1a] text-[#1a1a2e] dark:text-[#f0f0ff]`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
