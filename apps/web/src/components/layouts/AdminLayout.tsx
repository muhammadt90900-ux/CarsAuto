// apps/web/src/components/layouts/AdminLayout.tsx
import { AdminSidebar } from '@/components/admin/Sidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen pt-16">
      <AdminSidebar className="hidden lg:block w-64 border-r" />
      <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-[#0d0d1a]">{children}</main>
    </div>
  );
}
