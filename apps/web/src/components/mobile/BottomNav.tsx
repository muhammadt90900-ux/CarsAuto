'use client';
// components/mobile/BottomNav.tsx — Enterprise mobile bottom nav
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Home, Car, Package, Store, User, Plus } from 'lucide-react';

interface BottomNavProps { locale?: string; }

export function BottomNav({ locale: localeProp }: BottomNavProps) {
  const pathname = usePathname();
  const params = useParams();
  const locale = localeProp ?? (Array.isArray(params.locale) ? params.locale[0] : (params.locale as string)) ?? 'en';

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
        className="fixed z-40 w-14 h-14 rounded-full shadow-[var(--shadow-gold-xl)] flex items-center justify-center md:hidden fab-gold"
        style={{
          background:'linear-gradient(135deg,#c9a84c,#9e6e1e)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
          right: '1rem',
        }}
        aria-label="Post listing">
        <Plus className="w-6 h-6 text-[var(--ink-900)]"/>
      </Link>

      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bottom-nav-bar"
           style={{ background:'rgba(5,11,20,0.97)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-around px-1 pt-2 pb-2"
             style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={`mobile-nav-item flex flex-col items-center gap-0.5 px-2 sm:px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[52px]
                  ${active ? 'text-[var(--gold)]' : 'text-white/35 hover:text-white/60'}`}>
                <div className={`relative p-1.5 rounded-xl transition-all duration-200
                  ${active ? 'bg-[rgba(201,168,76,0.15)]' : ''}`}>
                  <Icon className="w-5 h-5"/>
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--gold)]"/>
                  )}
                </div>
                <span className={`bottom-nav-label text-[9px] font-bold ${active ? 'text-[var(--gold)]' : 'text-white/25'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
