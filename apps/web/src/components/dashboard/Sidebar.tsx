'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@auto-bazaar-pro/utils';
import {
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Heart,
  Bell,
  User,
  Star,
  CreditCard,
  ChevronRight,
} from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, badge: null },
  { href: '/dashboard/listings', label: 'My Listings', icon: ListChecks, badge: null },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, badge: '3' },
  { href: '/dashboard/favorites', label: 'Favorites', icon: Heart, badge: null },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: '5' },
  { href: '/dashboard/profile', label: 'Profile', icon: User, badge: null },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star, badge: null },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard, badge: null },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white dark:bg-[#0f0f1a] border-r border-gray-100 dark:border-white/5 p-3 min-h-full',
        className,
      )}
    >
      {/* Logo area */}
      <div className="px-3 py-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#e94560] to-[#c73652] flex items-center justify-center shadow-lg shadow-[#e94560]/25">
            <span className="text-white text-xs font-black">AB</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">AutoBazaar</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Pro Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-3 mb-2">
        Navigation
      </p>

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
                  ? 'bg-gradient-to-r from-[#e94560]/12 to-[#e94560]/5 text-[#e94560] font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#e94560] rounded-full" />
              )}
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                  active ? 'text-[#e94560]' : 'group-hover:scale-110',
                )}
              />
              <span className="flex-1 truncate">{label}</span>
              {badge && (
                <span className="text-[10px] font-bold bg-[#e94560] text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {badge}
                </span>
              )}
              {!badge && !active && (
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user card */}
      <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e94560] to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            U
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">My Account</p>
            <p className="text-[10px] text-gray-400 truncate">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
