// apps/web/src/app/[locale]/(public)/layout.tsx
import { PublicLayout } from '@/components/layouts/PublicLayout';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PublicLayout locale={locale}>{children}</PublicLayout>
  );
}