import React from 'react';
import { Navbar } from '@/components/shared/Navbar';

export function PublicLayout({ children, locale }: { 
  children: React.ReactNode;
  locale: string;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050b14] dark:[background-image:radial-gradient(ellipse_80%_50%_at_50%_-5%,rgba(201,168,76,0.05)_0%,transparent_60%)]">
      <div aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 hidden dark:block overflow-hidden">
        <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #c9a84c, transparent 65%)', filter: 'blur(60px)' }} />
      </div>
      <Navbar locale={locale} />
      <main id="main-content" className="pt-[68px] relative z-10" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
