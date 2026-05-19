// apps/web/src/components/dashboard/Sidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@auto-bazaar-pro/utils';
import { LayoutDashboard, ListChecks, MessageSquare, Heart, Bell, User, Star, CreditCard } from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/listings', label: 'My Listings', icon: ListChecks },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/favorites', label: 'Favorites', icon: Heart },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <aside className={cn('bg-white dark:bg-[#1a1a2e] p-4', className)}>
      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-[#e94560]/10 text-[#e94560] font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
