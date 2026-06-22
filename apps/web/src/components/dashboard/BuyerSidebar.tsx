'use client';
// components/dashboard/BuyerSidebar.tsx
// Buyer-specific sidebar — intentionally different from Seller Sidebar.
// Shown to users with role === 'USER' (buyer accounts).

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@auto-bazaar-pro/utils';
import {
  LayoutDashboard, Heart, MessageSquare, Bell,
  User, ChevronRight, Search, History,
  LogOut, ArrowUpRight, Car, Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface NavItemProps {
  href:    string;
  label:   string;
  icon:    React.ElementType;
  badge?:  string | null;
  active:  boolean;
  accent?: boolean;
}

function NavItem({ href, label, icon: Icon, badge, active, accent }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl',
        'text-sm font-medium transition-all duration-150',
        active
          ? 'bg-[#c9a84c]/[0.12] text-[#c9a84c] dark:text-[#d4b45a] shadow-sm'
          : accent
            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
            : 'text-slate-600 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white',
      )}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <Icon
          className={cn(
            'w-4 h-4 flex-shrink-0 transition-colors',
            active
              ? 'text-[#c9a84c] dark:text-[#d4b45a]'
              : accent
                ? 'text-amber-500'
                : 'text-slate-400 dark:text-white/30 group-hover:text-slate-600 dark:group-hover:text-white/60',
          )}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-center gap-1.5 flex-shrink-0">
        {badge && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1
                           text-[10px] font-bold rounded-full bg-[#e94560] text-white">
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
}

// Monthly quota pill shown in the sidebar under "My Listings"
function QuotaPill({ used, limit }: { used: number; limit: number }) {
  const pct      = Math.min((used / limit) * 100, 100);
  const isFull   = used >= limit;
  const barColor = isFull ? 'bg-red-500' : used >= limit - 1 ? 'bg-amber-500' : 'bg-[#c9a84c]';

  return (
    <div className="mx-3 mb-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide">
          This month
        </span>
        <span className={cn(
          'text-[10px] font-bold',
          isFull ? 'text-red-500' : 'text-slate-600 dark:text-white/60'
        )}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isFull && (
        <p className="mt-1.5 text-[10px] text-red-500 font-medium">
          Monthly limit reached
        </p>
      )}
    </div>
  );
}

export function BuyerSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const t        = useTranslations('dashboard');
  const params   = useParams();
  const { user, logout } = useAuthStore();
  const locale = Array.isArray(params.locale)
    ? params.locale[0]
    : (params.locale ?? 'ku');

  // Fetch buyer's monthly listing count for the quota pill
  const { data: myListings } = useQuery({
    queryKey: ['listings', 'my'],
    queryFn:  () => api.get('/listings/my').then(r => r.data),
    staleTime: 60_000,
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthlyUsed = myListings
    ? (myListings as any[]).filter(
        (l: any) => new Date(l.createdAt) >= startOfMonth && !l.deletedAt
      ).length
    : 0;

  const isActive = (href: string) =>
    pathname === href || (href !== `/${locale}/dashboard` && pathname.startsWith(href));

  const browseItems = [
    { href: `/${locale}/dashboard`,          label: t('overview'),       icon: LayoutDashboard, badge: null },
    { href: `/${locale}/dashboard/favorites`,label: t('savedListings'),  icon: Heart,           badge: null },
    { href: `/${locale}/browse-history`,     label: t('browsingHistory'),icon: History,         badge: null },
    { href: `/${locale}/cars`,               label: 'Browse Cars',       icon: Search,          badge: null },
  ];

  const myItems = [
    { href: `/${locale}/dashboard/listings`, label: t('myListings'),     icon: Car,             badge: null },
    { href: `/${locale}/dashboard/messages`, label: t('messages'),       icon: MessageSquare,   badge: '3'  },
    { href: `/${locale}/dashboard/notifications`, label: t('notifications'), icon: Bell,        badge: '5'  },
  ];

  const accountItems = [
    { href: `/${locale}/dashboard/profile`,      label: t('profile'),     icon: User,           badge: null },
    { href: `/${locale}/dashboard/subscription`, label: t('subscription'),icon: ShoppingBag,    badge: null },
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
      {/* Gold buyer accent top line (matches brand) */}
      <div className="absolute inset-x-0 top-0 h-[2px]"
           style={{ background: 'linear-gradient(90deg,#c9a84c,#d4b45a,#c9a84c)' }} />

      {/* Logo + "Buyer Dashboard" label */}
      <div className="px-3 pt-6 pb-4">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 group">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0
                       shadow-[0_0_14px_rgba(201,168,76,0.30)]
                       transition-shadow duration-300 group-hover:shadow-[0_0_22px_rgba(201,168,76,0.50)]"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
          >
            <ShoppingBag className="w-4.5 h-4.5 text-white" aria-hidden />
          </div>
          <div>
            <p className="text-[.82rem] font-display font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              AutoBazaar<span className="text-[#c9a84c]">Pro</span>
            </p>
            <p className="text-[10px] text-[#c9a84c]/80 dark:text-[#d4b45a]/70 font-semibold">Buyer Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Search shortcut CTA */}
      <div className="px-1 mb-3">
        <Link
          href={`/${locale}/cars`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold
                     bg-[#c9a84c]/10 text-[#9e6e1e] dark:text-[#d4b45a] hover:bg-[#c9a84c]/20
                     border border-[#c9a84c]/30 dark:border-[#c9a84c]/20
                     transition-all duration-200"
        >
          <Search className="w-3.5 h-3.5" />
          Browse Cars
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain" aria-label="Buyer dashboard navigation">

        {/* Discover */}
        <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/20">
          Discover
        </p>
        {browseItems.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {/* My Listings section with quota */}
        <p className="px-3 mt-4 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/20">
          My Activity
        </p>
        {myItems.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {/* Quota pill — lives right below "My Listings" */}
        <QuotaPill used={monthlyUsed} limit={2} />

        {/* Account */}
        <p className="px-3 mt-4 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/20">
          Account
        </p>
        {accountItems.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {/* Upgrade to Dealer upsell */}
        <div className="mx-1 mt-4 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20
                        bg-gradient-to-br from-amber-50 to-amber-100/50
                        dark:from-amber-500/10 dark:to-amber-400/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden />
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Become a Seller</p>
          </div>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/70 leading-snug mb-2.5">
            Upgrade to a dealer account for unlimited listings & pro tools.
          </p>
          <Link
            href={`/${locale}/dashboard/subscription`}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg
                       bg-amber-500 text-white text-[11px] font-bold
                       hover:bg-amber-600 transition-colors duration-200"
          >
            Upgrade <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

      </nav>

      {/* User card */}
      {user && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                          bg-slate-50 dark:bg-white/[0.04]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e]
                            flex items-center justify-center text-xs font-black text-white flex-shrink-0">
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[.78rem] font-semibold text-slate-800 dark:text-white truncate">{user.name}</p>
              <p className="text-[10px] text-[#c9a84c] dark:text-[#d4b45a]/70 truncate font-medium">Buyer Account</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                         text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
                         transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
