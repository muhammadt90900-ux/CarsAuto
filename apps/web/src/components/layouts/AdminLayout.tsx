'use client';
// components/layouts/AdminLayout.tsx — Mobile-optimised with slide-out drawer
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/Sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  locale?: string;
}

export function AdminLayout({ children, locale }: AdminLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen pt-[68px]">
      {/* Desktop sidebar */}
      <AdminSidebar className="hidden lg:flex flex-col w-64 border-r sticky top-[68px] h-[calc(100vh-68px)] overflow-y-auto" />

      {/* Mobile sidebar drawer */}
      {drawerOpen && (
        <div
          className="drawer-backdrop lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <div id="admin-sidebar" className={`sidebar-mobile-drawer lg:hidden bg-white dark:bg-[var(--ink-800)] border-e border-slate-100 dark:border-white/[0.07] pt-[68px] ${drawerOpen ? 'open' : ''}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.07]">
          <span className="text-sm font-bold text-[var(--text-primary)]">Admin Panel</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="touch-target text-[var(--text-muted)] hover:text-[var(--gold)]"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <AdminSidebar className="flex-1" />
      </div>

      {/* Main content */}
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0d0d1a] page-content">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3
                        bg-gray-50/95 dark:bg-[#0d0d1a]/95 backdrop-blur-md
                        border-b border-slate-100 dark:border-white/[0.07]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="touch-target text-[var(--text-muted)] hover:text-[var(--gold)] -ms-1"
            aria-label="Open admin sidebar menu"
            aria-expanded={drawerOpen}
            aria-controls="admin-sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Admin</span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
