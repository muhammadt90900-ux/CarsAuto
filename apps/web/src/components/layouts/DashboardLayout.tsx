'use client';
// components/layouts/DashboardLayout.tsx — Mobile-optimised with slide-out drawer
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on navigation
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen pt-[68px]">
      {/* Desktop sidebar */}
      <Sidebar className="hidden lg:flex flex-col w-64 border-r sticky top-[68px] h-[calc(100vh-68px)] overflow-y-auto" />

      {/* Mobile sidebar drawer */}
      {drawerOpen && (
        <div
          className="drawer-backdrop lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={`sidebar-mobile-drawer lg:hidden bg-white dark:bg-[#080f1c] border-e border-slate-100 dark:border-white/[0.07] pt-[68px] ${drawerOpen ? 'open' : ''}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.07]">
          <span className="text-sm font-bold text-[var(--text-primary)]">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="touch-target text-[var(--text-muted)] hover:text-[var(--gold)]"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar className="flex-1" />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto page-content">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3
                        bg-white/95 dark:bg-[#080f1c]/95 backdrop-blur-md
                        border-b border-slate-100 dark:border-white/[0.07]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="touch-target text-[var(--text-muted)] hover:text-[var(--gold)] -ml-1"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Dashboard</span>
        </div>

        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
