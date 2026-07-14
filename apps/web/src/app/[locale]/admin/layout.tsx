// apps/web/src/app/[locale]/admin/layout.tsx
import type { Metadata } from 'next';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { requireAdmin } from '@/lib/auth';

// Previously no robots directive at all — admin tooling was crawlable
// with nothing telling search engines to stay out.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function Layout({ children, params }: Props) {
  const { locale } = await params;
  await requireAdmin();
  return <AdminLayout locale={locale}>{children}</AdminLayout>;
}
