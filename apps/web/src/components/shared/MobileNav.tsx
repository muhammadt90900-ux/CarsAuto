// apps/web/src/components/shared/MobileNav.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';

const tabs = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Search', icon: Search, href: '/search' },
  { label: 'Sell', icon: PlusCircle, href: '/dashboard/create-listing' },
  { label: 'Messages', icon: MessageCircle, href: '/dashboard/messages' },
  { label: 'Profile', icon: User, href: '/dashboard/profile' },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1a1a2e]/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {tabs.map(({ icon: Icon, href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 transition-colors',
                active ? 'text-[#e94560]' : 'text-gray-500 dark:text-gray-400',
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
