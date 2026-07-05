'use client';
// components/shared/MobileNav.tsx — Locale-aware mobile navigation
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '@cars-auto/utils';

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations('common');
  const params = useParams();
  const locale = Array.isArray(params.locale)
    ? params.locale[0]
    : (params.locale ?? 'ku');

  const tabs = [
    { label: t('home'),       icon: Home,          href: `/${locale}` },
    { label: t('search'),     icon: Search,         href: `/${locale}/cars` },
    { label: t('sell'),       icon: PlusCircle,     href: `/${locale}/dashboard/listings` },
    { label: t('messages'),   icon: MessageCircle,  href: `/${locale}/dashboard/messages` },
    { label: t('profile'),    icon: User,            href: `/${locale}/dashboard/profile` },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-50
                 bg-white/90 dark:bg-[rgba(5,11,20,0.95)]
                 backdrop-blur-xl
                 border-t border-gray-200 dark:border-white/[0.08]
                 safe-area-inset-bottom"
    >
      <div className="flex justify-around items-center h-16 px-1">
        {tabs.map(({ icon: Icon, href, label }) => {
          const active =
            href === `/${locale}` ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 gap-0.5',
                'transition-colors duration-200',
                active
                  ? 'text-[var(--gold)]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              )}
            >
              <Icon className="w-5 h-5" aria-hidden />
              <span className="text-[10px] font-medium leading-tight truncate max-w-[48px] text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
