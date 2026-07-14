import React from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { BottomNav } from '@/components/mobile/BottomNav';

export function PublicLayout({ children, locale }: { 
  children: React.ReactNode;
  locale: string;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[var(--ink-900)] dark:[background-image:radial-gradient(ellipse_80%_50%_at_50%_-5%,rgba(201,168,76,0.05)_0%,transparent_60%)] flex flex-col">
      <div aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 hidden dark:block overflow-hidden">
        <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, var(--gold), transparent 65%)', filter: 'blur(60px)' }} />
      </div>
      <Navbar locale={locale} />
      <main id="main-content" className="pt-[68px] relative z-10 flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer locale={locale} />
      {/* Previously: BottomNav only existed in the dashboard layout — a
          mobile visitor browsing the public marketplace (homepage, /cars,
          /dealers, etc. — not logged in yet, or just browsing) had no
          bottom nav at all. Component itself is `md:hidden`, so this is a
          no-op on desktop. The h-20 spacer keeps the fixed bar from
          covering the tail end of the footer on mobile. */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      <BottomNav locale={locale} />
    </div>
  );
}
