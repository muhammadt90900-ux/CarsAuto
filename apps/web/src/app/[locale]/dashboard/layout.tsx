'use client';
// app/[locale]/dashboard/layout.tsx
// Role-aware dashboard layout:
//   USER   (buyer)  → BuyerSidebar  + buyer mobile drawer
//   DEALER / ADMIN  → Sidebar       + seller mobile drawer
// If the user is a buyer and tries to access /dashboard/dealers/*, they are
// redirected to /dashboard (handled below in RoleGuard).

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { Sidebar }      from '@/components/dashboard/Sidebar';
import { BuyerSidebar } from '@/components/dashboard/BuyerSidebar';
import { BottomNav }    from '@/components/mobile/BottomNav';
import { PageTransition } from '@/components/mobile/Loading';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/auth.store';
import { getAccessToken } from '@/lib/api';
import { cn } from '@cars-auto/utils';
import {
  LayoutDashboard, ListChecks, MessageSquare, Heart,
  Bell, User, Star, CreditCard, X, ChevronRight,
  Search, History, ShoppingBag, Sparkles,
} from 'lucide-react';
import Link from 'next/link';

// Real-time bell dropdown — only needed after hydration/auth, browser-only
// (socket.io), so it's split out of the dashboard-layout bundle.
const NotificationsPanel = dynamic(
  () => import('@/components/chat/NotificationsPanel'),
  {
    ssr: false,
    loading: () => <Skeleton width="2.25rem" height="2.25rem" rounded="rounded-xl" />,
  }
);

// ── Route guard: redirect buyers away from dealer-only routes ──────────────
function RoleGuard({ children }: { children: React.ReactNode }) {
  const user      = useAuthStore(s => s.user);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const pathname  = usePathname();
  const router    = useRouter();
  const params    = useParams();
  const locale    = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');

  // Dealer-only paths that buyers must not access
  const DEALER_ONLY = [`/${locale}/dashboard/dealers`];

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) return; // AuthGuard (in providers) handles unauthenticated redirect

    const isBuyer    = user.role === 'USER';
    const onDealerRoute = DEALER_ONLY.some(p => pathname.startsWith(p));

    if (isBuyer && onDealerRoute) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [isHydrated, user, pathname, locale, router]);

  return <>{children}</>;
}

// ── Mobile drawer — Buyer version ─────────────────────────────────────────
function BuyerMobileDrawer({ open, onClose, locale }: {
  open: boolean; onClose: () => void; locale: string;
}) {
  const pathname = usePathname();
  const items = [
    { href: `/${locale}/dashboard`,               label: 'Overview',       icon: LayoutDashboard, badge: null },
    { href: `/${locale}/dashboard/listings`,       label: 'My Listings',    icon: ListChecks,      badge: null },
    { href: `/${locale}/dashboard/favorites`,      label: 'Saved Cars',     icon: Heart,           badge: null },
    { href: `/${locale}/browse-history`,           label: 'Browse History', icon: History,         badge: null },
    { href: `/${locale}/dashboard/messages`,       label: 'Messages',       icon: MessageSquare,   badge: '3' },
    { href: `/${locale}/dashboard/notifications`,  label: 'Notifications',  icon: Bell,            badge: '5' },
    { href: `/${locale}/dashboard/profile`,        label: 'Profile',        icon: User,            badge: null },
    { href: `/${locale}/dashboard/subscription`,   label: 'Subscription',   icon: ShoppingBag,     badge: null },
  ];

  const startX  = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX; setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return; setDragX(Math.max(0, e.clientX - startX.current));
  };
  const onPointerUp = () => {
    setDragging(false); if (dragX > 80) onClose(); setDragX(0);
  };

  return (
    <>
      <div aria-hidden onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} />

      <div
        className={cn('fixed top-0 left-0 bottom-0 z-50 w-[280px]',
          'bg-[#06111f] border-r border-[#c9a84c]/15',
          'shadow-[8px_0_48px_rgba(0,0,0,0.70)]',
          'flex flex-col md:hidden will-change-transform',
          !dragging && 'transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]')}
        style={{ transform: open ? `translateX(${dragX}px)` : `translateX(calc(-100% + ${dragX}px))` }}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
      >
        {/* Sky blue accent line */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b
                         from-transparent via-[#c9a84c]/20 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-14 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)',
                          boxShadow: '0 0 14px rgba(201,168,76,0.35)' }}>
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <p className="text-[.85rem] font-display font-bold text-white">
              CarsAuto<span className="text-[#c9a84c]">Pro</span>
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center
                       text-white/40 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto overscroll-contain">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== `/${locale}/dashboard` && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={onClose}
                className={cn('flex items-center justify-between gap-2.5 px-3 py-3 rounded-xl',
                  'text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                  active ? 'bg-[#c9a84c]/[0.12] text-[#c9a84c]' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                )}>
                <span className="flex items-center gap-2.5">
                  <Icon className={cn('w-4 h-4 flex-shrink-0',
                    active ? 'text-[#c9a84c]' : 'text-white/30')} aria-hidden />
                  {label}
                </span>
                <span className="flex items-center gap-1.5">
                  {badge && (
                    <span className="inline-flex items-center justify-center w-5 h-5
                                     text-[10px] font-bold rounded-full bg-[#e94560] text-white">
                      {badge}
                    </span>
                  )}
                  <ChevronRight className={cn('w-3 h-3',
                    active ? 'text-[#c9a84c] opacity-100' : 'text-white/20 opacity-0')} />
                </span>
              </Link>
            );
          })}

          {/* Become a Dealer banner */}
          <div className="mx-1 mt-3 p-3 rounded-xl border border-amber-500/20
                          bg-amber-500/10">
            <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Become a Dealer
            </p>
            <p className="text-[10px] text-amber-400/70 leading-snug">
              Upgrade for unlimited listings & pro tools.
            </p>
          </div>
        </nav>

        <div className="px-5 py-4 border-t border-white/[0.05]">
          <p className="text-[10px] text-white/20 text-center">Swipe right to close</p>
        </div>
      </div>
    </>
  );
}

// ── Mobile drawer — Seller version (unchanged from original) ───────────────
function SellerMobileDrawer({ open, onClose, locale }: {
  open: boolean; onClose: () => void; locale: string;
}) {
  const pathname = usePathname();
  const items = [
    { href: `/${locale}/dashboard`,                  label: 'Overview',      icon: LayoutDashboard, badge: null },
    { href: `/${locale}/dashboard/listings`,          label: 'My Listings',   icon: ListChecks,      badge: null },
    { href: `/${locale}/dashboard/messages`,          label: 'Messages',      icon: MessageSquare,   badge: '3' },
    { href: `/${locale}/dashboard/favorites`,         label: 'Favorites',     icon: Heart,           badge: null },
    { href: `/${locale}/dashboard/notifications`,     label: 'Notifications', icon: Bell,            badge: '5' },
    { href: `/${locale}/dashboard/profile`,           label: 'Profile',       icon: User,            badge: null },
    { href: `/${locale}/dashboard/reviews`,           label: 'Reviews',       icon: Star,            badge: null },
    { href: `/${locale}/dashboard/subscription`,      label: 'Subscription',  icon: CreditCard,      badge: null },
  ];

  const startX  = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX; setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return; setDragX(Math.max(0, e.clientX - startX.current));
  };
  const onPointerUp = () => {
    setDragging(false); if (dragX > 80) onClose(); setDragX(0);
  };

  return (
    <>
      <div aria-hidden onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} />

      <div
        className={cn('fixed top-0 left-0 bottom-0 z-50 w-[280px]',
          'bg-[#080f1c] border-r border-[#c9a84c]/10',
          'shadow-[8px_0_48px_rgba(0,0,0,0.70)]',
          'flex flex-col md:hidden will-change-transform',
          !dragging && 'transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]')}
        style={{ transform: open ? `translateX(${dragX}px)` : `translateX(calc(-100% + ${dragX}px))` }}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
      >
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b
                         from-transparent via-[#c9a84c]/20 to-transparent" />

        <div className="flex items-center justify-between px-5 pt-14 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)',
                          boxShadow: '0 0 14px rgba(201,168,76,0.35)' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".95" />
                <circle cx="6.5" cy="15" r="2" fill="white" />
                <circle cx="13.5" cy="15" r="2" fill="white" />
              </svg>
            </div>
            <p className="text-[.85rem] font-display font-bold text-white">
              CarsAuto<span className="text-[#c9a84c]">Pro</span>
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center
                       text-white/40 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto overscroll-contain">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== `/${locale}/dashboard` && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={onClose}
                className={cn('flex items-center justify-between gap-2.5 px-3 py-3 rounded-xl',
                  'text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                  active ? 'bg-[#c9a84c]/[0.12] text-[#c9a84c]' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                )}>
                <span className="flex items-center gap-2.5">
                  <Icon className={cn('w-4 h-4 flex-shrink-0',
                    active ? 'text-[#c9a84c]' : 'text-white/30')} aria-hidden />
                  {label}
                </span>
                <span className="flex items-center gap-1.5">
                  {badge && (
                    <span className="inline-flex items-center justify-center w-5 h-5
                                     text-[10px] font-bold rounded-full bg-[#e94560] text-white">
                      {badge}
                    </span>
                  )}
                  <ChevronRight className={cn('w-3 h-3',
                    active ? 'text-[#c9a84c] opacity-100' : 'text-white/20 opacity-0')} />
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-white/[0.05]">
          <p className="text-[10px] text-white/20 text-center">Swipe right to close</p>
        </div>
      </div>
    </>
  );
}

// ── Shared mobile header ───────────────────────────────────────────────────
function DashboardMobileHeader({ onMenuOpen, title, isBuyer, locale }: {
  onMenuOpen: () => void; title: string; isBuyer: boolean; locale: string;
}) {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();

  return (
    <div className={cn(
      'sticky top-0 z-30 flex items-center gap-3 px-4 h-[60px]',
      'backdrop-blur-xl border-b md:hidden',
      isBuyer
        ? 'bg-[#06111f]/95 border-[#c9a84c]/10'
        : 'bg-[#070d18]/95 border-white/[0.06]'
    )}>
      <button onClick={onMenuOpen}
        className="flex flex-col justify-center gap-[4px] w-9 h-9 rounded-xl
                   hover:bg-white/[0.08] transition-colors"
        aria-label="Open menu">
        <span className="block w-[18px] h-[1.5px] bg-white/70 rounded-full" />
        <span className="block w-[13px] h-[1.5px] bg-white/50 rounded-full" />
      </button>
      <h1 className="flex-1 text-[0.95rem] font-display font-bold text-white truncate">{title}</h1>
      {isBuyer && (
        <span className="text-[11px] font-bold text-[#c9a84c] bg-[#c9a84c]/10
                         px-2 py-0.5 rounded-full border border-[#c9a84c]/20">
          Buyer
        </span>
      )}
      {user && (
        <NotificationsPanel
          userId={user.id}
          token={getAccessToken() ?? ''}
          apiBase={process.env.NEXT_PUBLIC_API_URL}
          onNavigate={(path) => {
            // NotificationsPanel emits generic paths — map them onto real routes.
            const chatMatch    = path.match(/^\/messages\/(.+)$/);
            const listingMatch = path.match(/^\/listings\/(.+)$/);
            if (chatMatch)    router.push(`/${locale}/dashboard/messages?chatId=${chatMatch[1]}`);
            else if (listingMatch) router.push(`/${locale}/cars/${listingMatch[1]}`);
            else router.push(`/${locale}${path}`);
          }}
        />
      )}
    </div>
  );
}

// ── Main layout ────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params     = useParams();
  const locale     = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');
  const pathname   = usePathname();
  const user       = useAuthStore(s => s.user);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Determine role — default to seller layout while hydrating
  const isBuyer = isHydrated && user?.role === 'USER';

  const PAGE_TITLES: Record<string, string> = {
    dashboard:    isBuyer ? 'My Account' : 'Dashboard',
    listings:     'My Listings',
    messages:     'Messages',
    favorites:    isBuyer ? 'Saved Cars' : 'Favorites',
    notifications:'Notifications',
    profile:      'Profile',
    reviews:      'Reviews',
    subscription: 'Subscription',
    leads:        'Leads',
    settings:     'Settings',
    dealers:      'Dealer Hub',
  };
  const pageSlug = pathname.split('/').pop() ?? 'dashboard';
  const title    = PAGE_TITLES[pageSlug] ?? pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1);

  return (
    <RoleGuard>
      <div className="min-h-screen bg-[#050b14]">

        {/* Desktop layout */}
        <div className="hidden md:flex h-screen">
          <div className="w-64 flex-shrink-0">
            {isBuyer
              ? <BuyerSidebar className="h-full" />
              : <Sidebar      className="h-full" />
            }
          </div>
          <main className="flex-1 overflow-y-auto">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden flex flex-col min-h-screen">
          <DashboardMobileHeader
            onMenuOpen={() => setDrawerOpen(true)}
            title={title}
            isBuyer={isBuyer}
            locale={locale}
          />

          {isBuyer ? (
            <BuyerMobileDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              locale={locale}
            />
          ) : (
            <SellerMobileDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              locale={locale}
            />
          )}

          <main className="flex-1 overflow-hidden">
            <PageTransition>{children}</PageTransition>
          </main>
          <div className="h-20" />
        </div>

        {/* Global bottom nav */}
        <BottomNav />
      </div>
    </RoleGuard>
  );
}
