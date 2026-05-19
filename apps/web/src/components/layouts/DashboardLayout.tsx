// apps/web/src/components/layouts/DashboardLayout.tsx
import { Sidebar } from '@/components/dashboard/Sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen pt-16">
      <Sidebar className="hidden lg:block w-64 border-r" />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
