'use client';
// BottomNav — UX-Improved: active indicator bar, sell FAB with label, haptic feedback hint

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Home, Car, Package, Store, User, Plus } from 'lucide-react';

interface BottomNavProps { locale?: string; }

export function BottomNav({ locale: localeProp }: BottomNavProps) {
  const pathname = usePathname();
  const params   = useParams();
  const locale   = localeProp ?? (Array.isArray(params.locale) ? params.locale[0] : (params.locale as string)) ?? 'en';
  const router   = useRouter();
  const user        = useAuthStore((s) => s.user);
  const isHydrated  = useAuthStore((s) => s.isHydrated);

  const handleSell = (e: React.MouseEvent) => {
    if (!isHydrated || !user) {
      e.preventDefault();
      router.push("/login?returnTo=/dashboard/listings/new");
    }
  };

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
        href="/dashboard/listings/new"
        className="fixed z-40 flex items-center gap-1.5 rounded-full shadow-[0_8px_32px_rgba(201,168,76,0.50)]
                   md:hidden px-4 h-12 text-sm font-bold text-[var(--ink-900)]"
        style={{
          background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)',
          boxShadow: '0 8px 32px rgba(201,168,76,0.55), 0 2px 8px rgba(201,168,76,0.30)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          right: '1rem',
        }}
        onClick={handleSell}
        aria-label="Post new listing"
      >
        <Plus className="w-5 h-5 flex-shrink-0" />
        <span className="text-[13px]">Sell</span>
      </Link>

      <nav
        aria-label="Bottom navigation"
        className="fixed bottom-0 inset-x-0 z-50 md:hidden"
        style={{
          background:           'rgba(4,9,18,0.98)',
          backdropFilter:       'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderTop:            '1px solid rgba(201,168,76,0.10)',
          boxShadow:            '0 -4px 24px rgba(0,0,0,0.35)',
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
                            ${active ? 'text-[var(--gold)]' : 'text-white/30 hover:text-white/55'}`}
              >
                {/* Active bar */}
                {active && (
                  <span aria-hidden="true" className="absolute top-0 inset-x-2 h-[2px] rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--gold), var(--gold-bright), var(--gold), transparent)' }} />
                )}

                <div className={`p-1.5 rounded-xl transition-all duration-200
                                 ${active ? 'bg-gradient-to-b from-[rgba(201,168,76,0.18)] to-[rgba(201,168,76,0.08)] scale-110 shadow-[0_2px_8px_rgba(201,168,76,0.12)]' : 'hover:bg-white/[0.04]'}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className={`text-[9px] font-bold tracking-wide leading-none
                                  ${active ? 'text-[var(--gold)] font-black' : 'text-white/25'}`}>
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
