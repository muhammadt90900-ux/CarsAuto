// apps/web/src/app/[locale]/(public)/page.tsx
import { getTranslations } from 'next-intl/server';
import { HeroSearch } from '@/components/features/home/HeroSearch';
import { FeaturedCars } from '@/components/features/home/FeaturedCars';
import { RecentParts } from '@/components/features/home/RecentParts';

export default async function HomePage() {
  const t = await getTranslations('home');
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
