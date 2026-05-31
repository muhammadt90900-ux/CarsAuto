'use client';
// components/admin/Sidebar.tsx — Full-featured admin sidebar with all 7 sections
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@auto-bazaar-pro/utils';
import {
  LayoutDashboard, Users, Car, ListChecks, Settings,
  BarChart3, ShieldCheck, ChevronRight, Tag, Languages,
  Megaphone, Star, FileWarning, Store, Bell, ClipboardList,
  Shield,
} from 'lucide-react';

// Badge counts — in production these would come from a real-time API call
const BADGE_COUNTS: Record<string, number> = {
  moderation: 14,
  reports: 23,
  notifications: 3,
};

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const params   = useParams();
  const locale   = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'ku');

  const groups = [
    {
      label: 'Overview',
      items: [
        { href: `/${locale}/admin`,               label: 'Dashboard',    icon: LayoutDashboard },
        { href: `/${locale}/admin/analytics`,     label: 'Analytics',    icon: BarChart3       },
      ],
    },
    {
      label: 'People',
      items: [
        { href: `/${locale}/admin/users`,         label: 'Users',        icon: Users           },
        { href: `/${locale}/admin/dealers`,       label: 'Dealers',      icon: Store           },
      ],
    },
    {
      label: 'Content',
      items: [
        { href: `/${locale}/admin/listings`,      label: 'Listings',     icon: Car             },
        { href: `/${locale}/admin/featured`,      label: 'Featured',     icon: Star            },
        { href: `/${locale}/admin/categories`,    label: 'Categories',   icon: Tag             },
      ],
    },
    {
      label: 'Trust & Safety',
      items: [
        { href: `/${locale}/admin/moderation`,    label: 'Moderation',   icon: ShieldCheck,    badge: BADGE_COUNTS.moderation   },
        { href: `/${locale}/admin/reports`,       label: 'Reports',      icon: FileWarning,    badge: BADGE_COUNTS.reports      },
        { href: `/${locale}/admin/audit-logs`,    label: 'Audit Logs',   icon: ClipboardList   },
      ],
    },
    {
      label: 'Engagement',
      items: [
        { href: `/${locale}/admin/notifications`, label: 'Notifications',icon: Bell,           badge: BADGE_COUNTS.notifications },
        { href: `/${locale}/admin/ads`,           label: 'Ads',          icon: Megaphone       },
      ],
    },
    {
      label: 'System',
      items: [
        { href: `/${locale}/admin/translations`,  label: 'Translations', icon: Languages       },
        { href: `/${locale}/admin/settings`,      label: 'Settings',     icon: Settings        },
      ],
    },
  ];

  return (
    <aside className={cn(
      'relative flex flex-col min-h-full bg-white dark:bg-[#080f1c] border-e border-slate-100 dark:border-white/[0.07] p-3 w-56',
      className,
    )}>
      <div className="absolute inset-x-0 top-0 h-[2px] gold-line" />

      {/* Logo */}
      <div className="px-3 pt-6 pb-4 mb-2">
        <Link href={`/${locale}/admin`} className="flex items-center gap-2.5 group">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            <Shield className="w-4 h-4 text-white" aria-hidden />
          </div>
          <div>
            <p className="text-[.82rem] font-bold text-slate-900 dark:text-white tracking-tight">
              AutoBazaar<span className="text-[#c9a84c]">Pro</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-white/30">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-white/25">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }: any) => {
                const active =
                  pathname === href ||
                  (href !== `/${locale}/admin` && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-[#c9a84c]/[0.12] text-[#c9a84c]'
                        : 'text-slate-600 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={cn('w-4 h-4', active ? 'text-[#c9a84c]' : 'text-slate-400 dark:text-white/30')}
                        aria-hidden
                      />
                      {label}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {badge ? (
                        <span className={cn(
                          'min-w-[18px] h-[18px] px-1 rounded-full text-[0.6rem] font-black flex items-center justify-center',
                          active
                            ? 'bg-[#c9a84c] text-[#0d1b2e]'
                            : 'bg-red-500 text-white',
                        )}>
                          {badge > 99 ? '99+' : badge}
                        </span>
                      ) : (
                        <ChevronRight
                          className={cn(
                            'w-3 h-3 transition-all',
                            active ? 'text-[#c9a84c] opacity-100' : 'opacity-0 group-hover:opacity-60',
                          )}
                          aria-hidden
                        />
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
