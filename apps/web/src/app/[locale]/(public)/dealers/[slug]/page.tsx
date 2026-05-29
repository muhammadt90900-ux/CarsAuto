// apps/web/src/app/[locale]/(public)/dealers/[slug]/page.tsx
import type { Metadata } from 'next';
import { DealerShowroomClient } from '@/components/features/dealers/DealerShowroomClient';

type Props = { params: { locale: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `${params.slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} | AutoBazaarPro`,
    description: 'View dealer listings, reviews and contact info.',
  };
}

export default function DealerShowroomPage({ params }: Props) {
  return <DealerShowroomClient slug={params.slug} locale={params.locale} />;
}
