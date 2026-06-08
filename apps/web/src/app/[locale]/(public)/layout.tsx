// apps/web/src/app/[locale]/(public)/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { PublicLayout } from '@/components/layouts/PublicLayout';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // ← Next.js 15: params is a Promise
}) {
  const { locale } = await params; // ← await داواکراوە
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PublicLayout locale={locale}>{children}</PublicLayout>
    </NextIntlClientProvider>
  );
}