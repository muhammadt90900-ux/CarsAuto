'use client';
import React from 'react';
import { Navbar } from '@/components/shared/Navbar';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f1a]">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}