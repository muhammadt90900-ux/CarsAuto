// components/layouts/PublicLayout.tsx (Accessibility-enhanced)
// Not a Client Component — Navbar is already 'use client' and handles interactivity.

import React from 'react';
import { Navbar } from '@/components/shared/Navbar';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050b14]">
      <Navbar />
      {/* id="main-content" is the skip-link target */}
      <main id="main-content" className="pt-[68px]" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
