// apps/web/src/components/layouts/PublicLayout.tsx
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { MobileNav } from '@/components/shared/MobileNav';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 pb-20 md:pb-0">{children}</main>
      <Footer className="hidden md:block" />
      <MobileNav />
    </div>
  );
}
