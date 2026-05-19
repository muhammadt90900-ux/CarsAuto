// apps/web/src/components/admin/Sidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@auto-bazaar-pro/utils';
import { BarChart3, Users, ListFilter, Tags, MapPin, Car, Wrench, Flag, DollarSign, Megaphone, Bell, Languages, Settings } from 'lucide-react';

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/listings', label: 'Listings', icon: ListFilter },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/locations', label: 'Locations', icon: MapPin },
  { href: '/admin/car-makes', label: 'Car Makes', icon: Car },
  { href: '/admin/car-models', label: 'Models', icon: Car },
  { href: '/admin/spare-parts', label: 'Parts Catalog', icon: Wrench },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/payments', label: 'Payments', icon: DollarSign },
  { href: '/admin/ads', label: 'Advertisements', icon: Megaphone },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/translations', label: 'Translations', icon: Languages },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <aside className={cn('bg-white dark:bg-[#1a1a2e] p-4', className)}>
      <nav className="space-y-1">
        {adminNav.map(({ href, label, icon: Icon }) => (
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
