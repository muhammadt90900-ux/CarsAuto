// apps/web/src/app/[locale]/(public)/dealers/[slug]/page.tsx

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DealerShowroomClient } from '@/components/features/dealers/DealerShowroomClient';

type Props = { params: { locale: string; slug: string } };

async function getDealer(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dealers/${slug}`, {
      next: { revalidate: 30 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed');
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dealer = await getDealer(params.slug);
  if (!dealer) return { title: 'Dealer Not Found' };

  const name = params.locale === 'ku' ? dealer.nameKu : dealer.nameEn;
  return {
    title: `${name} | Auto Bazaar Pro`,
    description: dealer.taglineEn ?? `View ${dealer.nameEn}'s showroom — ${dealer.activeListings} active listings.`,
    openGraph: {
      title: name,
      description: dealer.taglineEn ?? '',
      images: dealer.coverUrl ? [dealer.coverUrl] : [],
    },
  };
}

export default async function DealerShowroomPage({ params }: Props) {
  const dealer = await getDealer(params.slug);
  if (!dealer) notFound();

  return <DealerShowroomClient dealer={dealer} locale={params.locale} />;
}
