// components/admin/Sidebar.tsx — Redesigned: Unified Gold/Midnight design system
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@auto-bazaar-pro/utils';
import {
  BarChart3, Users, ListFilter, Tags, MapPin, Car,
  Wrench, Flag, DollarSign, Megaphone, Bell,
  Languages, Settings,
} from 'lucide-react';

const adminNav = [
  { href: '/admin',               label: 'Dashboard',     icon: BarChart3  },
  { href: '/admin/users',         label: 'Users',         icon: Users      },
  { href: '/admin/listings',      label: 'Listings',      icon: ListFilter },
  { href: '/admin/categories',    label: 'Categories',    icon: Tags       },
  { href: '/admin/locations',     label: 'Locations',     icon: MapPin     },
  { href: '/admin/car-makes',     label: 'Car Makes',     icon: Car        },
  { href: '/admin/car-models',    label: 'Models',        icon: Car        },
  { href: '/admin/spare-parts',   label: 'Parts Catalog', icon: Wrench     },
  { href: '/admin/reports',       label: 'Reports',       icon: Flag       },
  { href: '/admin/payments',      label: 'Payments',      icon: DollarSign },
  { href: '/admin/ads',           label: 'Advertisements',icon: Megaphone  },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell       },
  { href: '/admin/translations',  label: 'Translations',  icon: Languages  },
  { href: '/admin/settings',      label: 'Settings',      icon: Settings   },
];

/* Group definitions for visual separation */
const GROUPS = [
  { label: 'Overview',    hrefs: ['/admin'] },
  { label: 'Management',  hrefs: ['/admin/users', '/admin/listings', '/admin/reports'] },
  { label: 'Catalogue',   hrefs: ['/admin/categories', '/admin/locations', '/admin/car-makes', '/admin/car-models', '/admin/spare-parts'] },
  { label: 'Revenue',     hrefs: ['/admin/payments', '/admin/ads'] },
  { label: 'System',      hrefs: ['/admin/notifications', '/admin/translations', '/admin/settings'] },
];

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex flex-col min-h-full relative',
        'bg-white dark:bg-[#080f1c]',
        'border-r border-slate-100 dark:border-white/[0.07]',
        'p-3 w-56',
        className,
      )}
    >
      {/* Gold top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] gold-line" />

      {/* Admin badge */}
      <div className="px-3 pt-6 pb-5 mb-1 flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0
                     shadow-[0_0_14px_rgba(201,168,76,0.35)]"
          style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92"/>
            <circle cx="6.5" cy="15" r="2" fill="white"/>
            <circle cx="13.5" cy="15" r="2" fill="white"/>
          </svg>
        </div>
        <div>
          <p className="text-[.82rem] font-display font-bold text-slate-900 dark:text-white leading-tight">
            AutoBazaar<span className="text-[#c9a84c]">Pro</span>
          </p>
          <p className="text-[10px] text-slate-400 dark:text-white/30">Admin Panel</p>
        </div>
      </div>

      {/* Grouped navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
        {GROUPS.map(group => {
          const groupItems = adminNav.filter(n => group.hrefs.includes(n.href));
          return (
            <div key={group.label}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/25 px-3 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {groupItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href as any}
                      className={cn(
                        'relative flex items-center gap-3 px-3 py-2 rounded-xl text-[.8rem] transition-all duration-200',
                        active
                          ? 'bg-[#c9a84c]/[0.10] text-[#c9a84c] font-semibold'
                          : 'text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-slate-800 dark:hover:text-white',
                      )}
                    >
                      {active && (
                        <span className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#c9a84c] rounded-full" />
                      )}
                      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-[#c9a84c]' : '')} />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
