'use client';
// components/mobile/BottomNav.tsx
// Native-feel bottom navigation — spring physics, haptic feedback, gesture-aware

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, Car, MessageSquare, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@auto-bazaar-pro/utils';

/* ── Haptic feedback shim ──────────────────────────────────────── */
const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = { light: [10], medium: [20], heavy: [30] };
    navigator.vibrate(patterns[style]);
  }
};

/* ── Ink ripple ────────────────────────────────────────────────── */
function RippleIcon({ active, icon: Icon, label, badge }: {
  active: boolean; icon: React.ElementType; label: string; badge?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState(false);

  const triggerRipple = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 400);
  };

  return (
    <div
      ref={ref}
      onPointerDown={triggerRipple}
      className="relative flex flex-col items-center justify-center gap-[3px] w-full py-2 select-none"
      aria-label={label}
    >
      {/* Pill indicator */}
      <span
        className={cn(
          'absolute top-1 inset-x-3 h-[3px] rounded-full transition-all duration-300 ease-out',
          active ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] opacity-100' : 'opacity-0'
        )}
      />

      {/* Icon container with spring scale */}
      <div className={cn(
        'relative flex items-center justify-center w-10 h-8 rounded-2xl transition-all duration-200',
        active
          ? 'bg-[#c9a84c]/15 scale-110'
          : 'bg-transparent scale-100 hover:bg-white/5',
        ripple && 'scale-95'
      )}>
        <Icon
          className={cn(
            'w-5 h-5 transition-all duration-200',
            active ? 'text-[#c9a84c]' : 'text-white/40'
          )}
          strokeWidth={active ? 2.5 : 1.8}
          aria-hidden
        />
        {/* Badge */}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center
                           w-4 h-4 text-[9px] font-bold rounded-full bg-[#e94560] text-white
                           ring-2 ring-[#070d18]">
            {badge}
          </span>
        )}
      </div>

      {/* Label */}
      <span className={cn(
        'text-[9px] font-semibold tracking-wide uppercase transition-all duration-200',
        active ? 'text-[#c9a84c]' : 'text-white/30'
      )}>
        {label}
      </span>
    </div>
  );
}

/* ── FAB for post listing ─────────────────────────────────────── */
export function PostListingFAB({ locale }: { locale: string }) {
  const [pressed, setPressed] = useState(false);

  return (
    <Link
      href={`/${locale}/dashboard/listings/new`}
      onPointerDown={() => { setPressed(true); haptic('medium'); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={cn(
        'flex items-center justify-center',
        'w-14 h-14 rounded-[18px]',
        'bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e]',
        'shadow-[0_8px_24px_rgba(201,168,76,0.50)]',
        'ring-4 ring-[#070d18]',
        'transition-all duration-150',
        pressed ? 'scale-95 shadow-[0_4px_12px_rgba(201,168,76,0.35)]' : 'scale-100'
      )}
      aria-label="Post new listing"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

/* ── Main BottomNav ────────────────────────────────────────────── */
export function BottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');
  const [prevPath, setPrevPath] = useState(pathname);
  const [show, setShow] = useState(true);
  const lastScrollY = useRef(0);

  /* Hide on scroll down, reveal on scroll up */
  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setShow(current < lastScrollY.current || current < 60);
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Haptic on route change */
  useEffect(() => {
    if (pathname !== prevPath) {
      haptic('light');
      setPrevPath(pathname);
    }
  }, [pathname, prevPath]);

  const isActive = (path: string) =>
    path === `/${locale}` ? pathname === path : pathname.startsWith(path);

  const tabs = [
    { href: `/${locale}`,                  icon: Home,          label: 'Home' },
    { href: `/${locale}/cars`,             icon: Search,        label: 'Search' },
    { href: `/${locale}/cars`,             icon: Car,           label: 'Cars',   isFAB: true },
    { href: `/${locale}/dashboard/messages`, icon: MessageSquare, label: 'Chats', badge: '3' },
    { href: `/${locale}/dashboard`,        icon: User,          label: 'Me' },
  ];

  return (
    <div
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 inset-x-0 z-50 md:hidden',
        'transition-transform duration-300 ease-in-out',
        show ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      {/* Frosted glass bar */}
      <div className="relative bg-[#070d18]/95 backdrop-blur-2xl
                       border-t border-[#c9a84c]/10
                       shadow-[0_-8px_40px_rgba(0,0,0,0.60)]
                       pb-safe-bottom">
        {/* Subtle top shimmer */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r
                         from-transparent via-[#c9a84c]/20 to-transparent" />

        <div className="flex items-end justify-around px-1 pt-1 pb-2">
          {tabs.map((tab, i) => (
            tab.isFAB ? (
              <div key="fab" className="flex flex-col items-center -mt-6">
                <PostListingFAB locale={locale} />
                <span className="text-[9px] font-semibold tracking-wide uppercase text-[#c9a84c]/60 mt-1">
                  Post
                </span>
              </div>
            ) : (
              <Link
                key={tab.href + i}
                href={tab.href}
                onClick={() => haptic('light')}
                className="flex-1 min-w-0"
              >
                <RippleIcon
                  active={isActive(tab.href)}
                  icon={tab.icon}
                  label={tab.label}
                  badge={tab.badge}
                />
              </Link>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
