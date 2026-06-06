'use client';
// BottomNav — UX-Improved: active indicator bar, sell FAB with label, haptic feedback hint

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Home, Car, Package, Store, User, Plus } from 'lucide-react';

interface BottomNavProps { locale?: string; }

export function BottomNav({ locale: localeProp }: BottomNavProps) {
  const pathname = usePathname();
  const params   = useParams();
  const locale   = localeProp ?? (Array.isArray(params.locale) ? params.locale[0] : (params.locale as string)) ?? 'en';

  const NAV_ITEMS = [
    { href: `/${locale}`,             icon: Home,    label: 'Home'    },
    { href: `/${locale}/cars`,        icon: Car,     label: 'Cars'    },
    { href: `/${locale}/spare-parts`, icon: Package, label: 'Parts'   },
    { href: `/${locale}/dealers`,     icon: Store,   label: 'Dealers' },
    { href: `/${locale}/dashboard`,   icon: User,    label: 'Account' },
  ];

  const isActive = (href: string) =>
    href === `/${locale}` ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* FAB — Post listing */}
      <Link
        href={`/${locale}/dashboard/listings/new`}
        className="fixed z-40 flex items-center gap-1.5 rounded-full shadow-[0_8px_32px_rgba(201,168,76,0.50)]
                   md:hidden px-4 h-12 text-sm font-bold text-[#050b14]"
        style={{
          background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          right: '1rem',
        }}
        aria-label="Post new listing"
      >
        <Plus className="w-5 h-5 flex-shrink-0" />
        <span className="text-[13px]">Sell</span>
      </Link>

      <nav
        aria-label="Bottom navigation"
        className="fixed bottom-0 inset-x-0 z-50 md:hidden"
        style={{
          background:           'rgba(5,11,20,0.97)',
          backdropFilter:       'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop:            '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          className="flex items-stretch justify-around px-1"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
        >
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1
                            min-w-[52px] flex-1 transition-all duration-200 select-none
                            ${active ? 'text-[#c9a84c]' : 'text-white/30 hover:text-white/55'}`}
              >
                {/* Active bar */}
                {active && (
                  <span aria-hidden="true" className="absolute top-0 inset-x-3 h-[2px] rounded-full
                                   bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a]" />
                )}

                <div className={`p-1.5 rounded-xl transition-all duration-200
                                 ${active ? 'bg-[rgba(201,168,76,0.15)] scale-110' : ''}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className={`text-[9px] font-bold tracking-wide leading-none
                                  ${active ? 'text-[#c9a84c]' : 'text-white/25'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
