// apps/web/src/app/[locale]/(public)/dealers/page.tsx

import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { DealersMarketplaceClient } from '@/components/features/dealers/DealersMarketplaceClient';

type Props = { params: { locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'Verified Dealers | Auto Bazaar Pro',
    description: 'Browse verified car dealers and showrooms across Iraq and the region.',
  };
}

// Fetch from API (server component)
async function getDealers(searchParams: Record<string, string>) {
  const qs = new URLSearchParams(searchParams).toString();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dealers?${qs}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  } catch {
    return { dealers: [], total: 0, page: 1, limit: 20, pages: 0 };
  }
}

export default async function DealersPage({
  params,
  searchParams,
}: Props & { searchParams: Record<string, string> }) {
  const data = await getDealers(searchParams);

  return <DealersMarketplaceClient initial={data} locale={params.locale} />;
}
