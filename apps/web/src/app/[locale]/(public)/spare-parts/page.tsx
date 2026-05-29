// apps/web/src/app/[locale]/(public)/spare-parts/page.tsx
// Enterprise Spare Parts Marketplace
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SparePartsClient } from '@/components/features/spare-parts/SparePartsClient';

type Props = { params: { locale: string }; searchParams?: Record<string, string> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'پارچە یەدەکەکان | Spare Parts | AutoBazaarPro',
    description: 'Find genuine and aftermarket auto parts for all makes and models.',
  };
}

export default async function SparePartsPage({ params, searchParams }: Props) {
  return <SparePartsClient locale={params.locale} initialSearch={searchParams ?? {}} />;
}
