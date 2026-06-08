import React from 'react';
import { Navbar } from '@/components/shared/Navbar';

export function PublicLayout({ children, locale }: { 
  children: React.ReactNode;
  locale: string;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050b14]">
      <Navbar locale={locale} />
      <main id="main-content" className="pt-[68px]" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
