'use client';
// components/mobile/BottomNav.tsx — Enterprise mobile bottom nav
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, Package, Store, User, Plus } from 'lucide-react';

interface BottomNavProps { locale: string; }

export function BottomNav({ locale }: BottomNavProps) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { href: `/${locale}`,            icon: Home,    label: 'Home'   },
    { href: `/${locale}/cars`,       icon: Car,     label: 'Cars'   },
    { href: `/${locale}/spare-parts`,icon: Package, label: 'Parts'  },
    { href: `/${locale}/dealers`,    icon: Store,   label: 'Dealers'},
    { href: `/${locale}/dashboard`,  icon: User,    label: 'Account'},
  ];

  const isActive = (href: string) =>
    href === `/${locale}` ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* FAB — Post listing */}
      <Link href={`/${locale}/dashboard/listings/new`}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full shadow-[var(--shadow-gold-xl)] flex items-center justify-center md:hidden"
        style={{ background:'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
        aria-label="Post listing">
        <Plus className="w-5 h-5 text-[var(--ink-900)]"/>
      </Link>

      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden"
           style={{ background:'rgba(5,11,20,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={`mobile-nav-item flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200
                  ${active ? 'text-[var(--gold)]' : 'text-white/35 hover:text-white/60'}`}>
                <div className={`relative p-1.5 rounded-xl transition-all duration-200
                  ${active ? 'bg-[rgba(201,168,76,0.15)]' : ''}`}>
                  <Icon className="w-5 h-5"/>
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--gold)]"/>
                  )}
                </div>
                <span className={`text-[9px] font-bold ${active ? 'text-[var(--gold)]' : 'text-white/25'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
