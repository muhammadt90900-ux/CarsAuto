'use client';
// components/layouts/MobilePublicLayout.tsx

import { useParams } from 'next/navigation';
import React from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { BottomNav } from '@/components/mobile/BottomNav';
import { PageTransition } from '@/components/mobile/Loading';

export function MobilePublicLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  return (
    <div className="min-h-screen bg-[var(--ink-900)] flex flex-col">
      <Navbar locale={locale} />
      <main
        className="flex-1 pt-[66px]"
        style={{ paddingBottom: 'max(80px, calc(env(safe-area-inset-bottom, 0px) + 64px))' }}
        id="main-content"
        tabIndex={-1}
      >
        <PageTransition>{children}</PageTransition>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}
