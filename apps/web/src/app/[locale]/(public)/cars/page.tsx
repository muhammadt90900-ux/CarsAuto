// apps/web/src/app/[locale]/(public)/cars/page.tsx
// Enterprise Cars Marketplace Page — production-ready
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CarsMarketplaceClient } from '@/components/features/cars/CarsMarketplaceClient';

type Props = { params: { locale: string }; searchParams?: Record<string, string> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta' });
  return {
    title: `${t('carsTitle') || 'Cars for Sale'} | AutoBazaarPro`,
    description: t('carsDesc') || 'Browse thousands of verified car listings in Iraq, Kurdistan & UAE.',
    openGraph: {
      type: 'website',
      siteName: 'AutoBazaarPro',
    },
  };
}

export default async function CarsPage({ params, searchParams }: Props) {
  return <CarsMarketplaceClient locale={params.locale} initialSearch={searchParams ?? {}} />;
}
