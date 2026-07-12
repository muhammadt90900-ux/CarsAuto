// apps/web/src/app/[locale]/(public)/dealers/page.tsx
import type { Metadata } from 'next';
import { DealersMarketplaceClient } from '@/components/features/dealers/DealersMarketplaceClient';
import { serverFetch } from '@/lib/server-api';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ku: 'دیلەرەکان | CarsAuto',
    ar: 'الوكلاء | CarsAuto',
    en: 'Car Dealers | CarsAuto',
    zh: '汽车经销商 | CarsAuto',
  };
  return {
    title: titles[locale] ?? titles.en,
    description: 'Browse verified car dealers in Iraq, Kurdistan & UAE.',
  };
}

export default async function DealersPage({ params }: Props) {
  const { locale } = await params;

  // F-PERF fix: matches DealersMarketplaceClient's own first-mount query
  // exactly — no filters (query/city/tier all start empty there).
  const initialData = await serverFetch<{ data: any[]; total: number }>('/dealers', {
    revalidate: 60,
    tags: ['dealers-list'],
  });

  return <DealersMarketplaceClient locale={locale} initialData={initialData ?? undefined} />;
}
