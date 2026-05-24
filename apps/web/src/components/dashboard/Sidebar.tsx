'use client';
// components/dashboard/Sidebar.tsx — Redesigned: Unified Gold/Midnight design system
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@auto-bazaar-pro/utils';
import {
  LayoutDashboard, ListChecks, MessageSquare, Heart,
  Bell, User, Star, CreditCard, ChevronRight,
} from 'lucide-react';

const items = [
  { href: '/dashboard',              label: 'Overview',      icon: LayoutDashboard, badge: null },
  { href: '/dashboard/listings',     label: 'My Listings',   icon: ListChecks,      badge: null },
  { href: '/dashboard/messages',     label: 'Messages',      icon: MessageSquare,   badge: '3'  },
  { href: '/dashboard/favorites',    label: 'Favorites',     icon: Heart,           badge: null },
  { href: '/dashboard/notifications',label: 'Notifications', icon: Bell,            badge: '5'  },
  { href: '/dashboard/profile',      label: 'Profile',       icon: User,            badge: null },
  { href: '/dashboard/reviews',      label: 'Reviews',       icon: Star,            badge: null },
  { href: '/dashboard/subscription', label: 'Subscription',  icon: CreditCard,      badge: null },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex flex-col min-h-full',
        'bg-white dark:bg-[#080f1c]',
        'border-r border-slate-100 dark:border-white/[0.07]',
        'p-3',
        className,
      )}
    >
      {/* Gold accent top line */}
      <div className="absolute inset-x-0 top-0 h-[2px] gold-line" />

      {/* Logo */}
      <div className="px-3 pt-6 pb-4 mb-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0
                       shadow-[0_0_14px_rgba(201,168,76,0.35)]
                       transition-shadow duration-300 group-hover:shadow-[0_0_22px_rgba(201,168,76,0.55)]"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92"/>
              <circle cx="6.5" cy="15" r="2" fill="white"/>
              <circle cx="13.5" cy="15" r="2" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="text-[.82rem] font-display font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              AutoBazaar<span className="text-[#c9a84c]">Pro</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-white/30">Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Section label */}
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/25 px-3 mb-2">
        Navigation
      </p>

      {/* Nav links */}
      <nav className="space-y-0.5 flex-1">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href as any}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                active
                  ? 'bg-[#c9a84c]/[0.10] dark:bg-[#c9a84c]/[0.10] text-[#c9a84c] font-semibold'
                  : 'text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white',
              )}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#c9a84c] rounded-full" />
              )}

              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                  active ? 'text-[#c9a84c]' : 'group-hover:scale-110',
                )}
              />
              <span className="flex-1 truncate">{label}</span>

              {badge && (
                <span
                  className="text-[9px] font-black rounded-full w-[18px] h-[18px]
                             flex items-center justify-center flex-shrink-0 text-[#080f1c]"
                  style={{ background: 'linear-gradient(135deg,#c9a84c,#e8cc7a)' }}
                >
                  {badge}
                </span>
              )}
              {!badge && !active && (
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-35 transition-opacity" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center
                       text-[#080f1c] text-xs font-black flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#e8cc7a)' }}
          >
            U
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-white/85 truncate">My Account</p>
            <p className="text-[10px] text-slate-400 dark:text-white/30 truncate">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
