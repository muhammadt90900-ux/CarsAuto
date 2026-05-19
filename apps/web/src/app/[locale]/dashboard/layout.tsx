// apps/web/src/app/[locale]/dashboard/layout.tsx
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
