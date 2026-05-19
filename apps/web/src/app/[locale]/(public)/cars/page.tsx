// apps/web/src/app/[locale]/(public)/cars/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function CarsPage() {
  const t = await getTranslations('common');
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Cars</h1>
      <p>Filter sidebar and listing grid will go here.</p>
    </div>
  );
}
