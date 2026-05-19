import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { locales, dir } from '@/i18n/config';

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export default async function LocaleLayout({ children, params }: Props) {
  const locale = params.locale;
  if (!locales.includes(locale as any)) notFound();

  let messages;
  try {
    messages = (await import(`../../i18n/translations/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    <html lang={locale} dir={dir(locale as any)} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
