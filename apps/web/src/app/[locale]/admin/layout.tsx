// apps/web/src/app/[locale]/admin/layout.tsx
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { requireAdmin } from '@/lib/auth';

export default async function Layout({ children }: { children: React.ReactNode }) {
  // await requireAdmin();
  return <AdminLayout>{children}</AdminLayout>;
}
