'use client';
// components/layouts/MobilePublicLayout.tsx
// Drop-in replacement for PublicLayout — adds BottomNav + mobile-native page transitions

import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { BottomNav } from '@/components/mobile/BottomNav';
import { PageTransition } from '@/components/mobile/Loading';

export function MobilePublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050b14] flex flex-col">
      <Navbar />

      {/* Content with bottom nav spacing on mobile */}
      <main className="flex-1 pt-[66px]"
            style={{ paddingBottom: 'max(80px, calc(env(safe-area-inset-bottom, 0px) + 64px))' }}
            id="main-content"
            tabIndex={-1}>
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {/* Footer — hidden on mobile (replaced by bottom nav) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Bottom nav (mobile only) */}
      <BottomNav />
    </div>
  );
}
