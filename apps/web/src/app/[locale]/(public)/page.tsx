import { getTranslations } from 'next-intl/server';
import { HeroSearch } from '@/components/features/home/HeroSearch';
import { FeaturedCars } from '@/components/features/home/FeaturedCars';
import { RecentParts } from '@/components/features/home/RecentParts';

type Props = { params: { locale: string } };

export default async function HomePage({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: 'home' });
  return (
    <>
      <HeroSearch />
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">{t('featuredCars')}</h2>
        <FeaturedCars />
      </section>
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">{t('recentParts')}</h2>
        <RecentParts />
      </section>
    </>
  );
}