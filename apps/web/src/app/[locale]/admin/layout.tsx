// apps/web/src/app/[locale]/admin/layout.tsx
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { requireAdmin } from '@/lib/auth';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function Layout({ children, params }: Props) {
  const { locale } = await params;
  // await requireAdmin();
  return <AdminLayout locale={locale}>{children}</AdminLayout>;
}
