'use client';
// app/[locale]/dashboard/layout.tsx (MOBILE-NATIVE VERSION)
// Swipeable sidebar → bottom nav on mobile, gesture-driven drawer, native transitions

import { useState, useRef, useCallback } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { BottomNav } from '@/components/mobile/BottomNav';
import { PageTransition } from '@/components/mobile/Loading';
import { cn } from '@auto-bazaar-pro/utils';
import {
  LayoutDashboard, ListChecks, MessageSquare, Heart,
  Bell, User, Star, CreditCard, X, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

/* ── Swipeable mobile sidebar drawer ─────────────────────────── */
function MobileSidebarDrawer({ open, onClose, locale }: {
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

  /* Swipe-to-close */
  const startX = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragX(Math.max(0, e.clientX - startX.current));
  };
  const onPointerUp = () => {
    setDragging(false);
    if (dragX > 80) onClose();
    setDragX(0);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-[280px]',
          'bg-[#080f1c] border-r border-[#c9a84c]/10',
          'shadow-[8px_0_48px_rgba(0,0,0,0.70)]',
          'flex flex-col md:hidden will-change-transform',
          !dragging && 'transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]'
        )}
        style={{
          transform: open
            ? `translateX(${dragX}px)`
            : `translateX(calc(-100% + ${dragX}px))`
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Gold accent */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b
                         from-transparent via-[#c9a84c]/20 to-transparent" />

        {/* Header */}
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
              AutoBazaar<span className="text-[#c9a84c]">Pro</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center
                       text-white/40 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto overscroll-contain">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== `/${locale}/dashboard` && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center justify-between gap-2.5 px-3 py-3 rounded-xl',
                  'text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                  active
                    ? 'bg-[#c9a84c]/[0.12] text-[#c9a84c]'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                )}
              >
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

        {/* Swipe hint */}
        <div className="px-5 py-4 border-t border-white/[0.05]">
          <p className="text-[10px] text-white/20 text-center">Swipe right to close</p>
        </div>
      </div>
    </>
  );
}

/* ── Dashboard mobile header ──────────────────────────────────── */
function DashboardMobileHeader({ onMenuOpen, title }: {
  onMenuOpen: () => void; title: string;
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-[60px]
                     bg-[#070d18]/95 backdrop-blur-xl
                     border-b border-white/[0.06] md:hidden">
      <button
        onClick={onMenuOpen}
        className="flex flex-col justify-center gap-[4px] w-9 h-9 rounded-xl
                   hover:bg-white/[0.08] transition-colors"
        aria-label="Open menu"
      >
        <span className="block w-[18px] h-[1.5px] bg-white/70 rounded-full" />
        <span className="block w-[13px] h-[1.5px] bg-white/50 rounded-full" />
      </button>
      <h1 className="flex-1 text-[0.95rem] font-display font-bold text-white truncate">{title}</h1>
      <button className="w-9 h-9 rounded-xl flex items-center justify-center
                          hover:bg-white/[0.08] transition-colors" aria-label="Notifications">
        <Bell className="w-4 h-4 text-white/50" />
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#e94560]
                          ring-2 ring-[#070d18]" />
      </button>
    </div>
  );
}

/* ── Main layout ──────────────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const PAGE_TITLES: Record<string, string> = {
    dashboard:    'Dashboard',
    listings:     'My Listings',
    messages:     'Messages',
    favorites:    'Favorites',
    notifications:'Notifications',
    profile:      'Profile',
    reviews:      'Reviews',
    subscription: 'Subscription',
    leads:        'Leads',
    settings:     'Settings',
  };
  const pageSlug = pathname.split('/').pop() ?? 'dashboard';
  const title = PAGE_TITLES[pageSlug] ?? pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1);

  return (
    <div className="min-h-screen bg-[#050b14]">
      {/* Desktop sidebar (unchanged) */}
      <div className="hidden md:flex h-screen">
        <div className="w-64 flex-shrink-0">
          <Sidebar className="h-full" />
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
        />
        <MobileSidebarDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          locale={locale}
        />
        <main className="flex-1 overflow-hidden">
          <PageTransition>{children}</PageTransition>
        </main>
        {/* Bottom nav spacing */}
        <div className="h-20" />
      </div>

      {/* Global bottom nav */}
      <BottomNav />
    </div>
  );
}
