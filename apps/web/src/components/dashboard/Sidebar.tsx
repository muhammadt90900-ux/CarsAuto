'use client';
// components/dashboard/Sidebar.tsx — Locale-aware dashboard sidebar
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@auto-bazaar-pro/utils';
import {
  LayoutDashboard, ListChecks, MessageSquare, Heart,
  Bell, User, Star, CreditCard, ChevronRight,
} from 'lucide-react';

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useTranslations('dashboard');
  const params = useParams();
  const locale = Array.isArray(params.locale)
    ? params.locale[0]
    : (params.locale ?? 'ku');

  const items = [
    { href: `/${locale}/dashboard`,                label: t('overview'),       icon: LayoutDashboard, badge: null },
    { href: `/${locale}/dashboard/listings`,        label: t('myListings'),     icon: ListChecks,      badge: null },
    { href: `/${locale}/dashboard/messages`,        label: t('messages'),       icon: MessageSquare,   badge: '3'  },
    { href: `/${locale}/dashboard/favorites`,       label: t('favorites'),      icon: Heart,           badge: null },
    { href: `/${locale}/dashboard/notifications`,   label: t('notifications'),  icon: Bell,            badge: '5'  },
    { href: `/${locale}/dashboard/profile`,         label: t('profile'),        icon: User,            badge: null },
    { href: `/${locale}/dashboard/reviews`,         label: t('reviews'),        icon: Star,            badge: null },
    { href: `/${locale}/dashboard/subscription`,    label: t('subscription'),   icon: CreditCard,      badge: null },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col min-h-full',
        'bg-white dark:bg-[#080f1c]',
        'border-e border-slate-100 dark:border-white/[0.07]',
        'p-3',
        className,
      )}
    >
      {/* Gold accent top line */}
      <div className="absolute inset-x-0 top-0 h-[2px] gold-line" />

      {/* Logo */}
      <div className="px-3 pt-6 pb-4 mb-2">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 group">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0
                       shadow-[0_0_14px_rgba(201,168,76,0.35)]
                       transition-shadow duration-300 group-hover:shadow-[0_0_22px_rgba(201,168,76,0.55)]"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92"/>
              <circle cx="6.5" cy="15" r="2" fill="white"/>
              <circle cx="13.5" cy="15" r="2" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="text-[.82rem] font-display font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              AutoBazaar<span className="text-[#c9a84c]">Pro</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-white/30">
              {t('overview')}
            </p>
          </div>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5" aria-label="Dashboard navigation">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== `/${locale}/dashboard` && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl',
                'text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-[#c9a84c]/[0.12] text-[#c9a84c] dark:text-[#e8cc7a]'
                  : 'text-slate-600 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-colors',
                    active
                      ? 'text-[#c9a84c]'
                      : 'text-slate-400 dark:text-white/30 group-hover:text-slate-600 dark:group-hover:text-white/60',
                  )}
                  aria-hidden
                />
                {label}
              </span>
              <span className="flex items-center gap-1.5">
                {badge && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-[#e94560] text-white">
                    {badge}
                  </span>
                )}
                <ChevronRight
                  className={cn(
                    'w-3 h-3 transition-all duration-200',
                    active
                      ? 'text-[#c9a84c] opacity-100'
                      : 'text-slate-300 dark:text-white/20 opacity-0 group-hover:opacity-100',
                  )}
                  aria-hidden
                />
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
