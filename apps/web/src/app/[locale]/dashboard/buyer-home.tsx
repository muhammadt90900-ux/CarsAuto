'use client';
// app/[locale]/dashboard/buyer-home.tsx
// Buyer dashboard home — completely separate from seller/dealer dashboard.
// Shown to users with role === 'USER'.
//
// Sections:
//   1. Welcome header + "Buyer Account" badge
//   2. 3-chip stat strip  (saved cars · messages · this month quota)
//   3. Upgrade plan CTA card  ($2.99/month → 2 posts/month)
//   4. My Listed Cars  (compact grid, capped at 2)
//   5. Saved / favorited cars
//   6. Browsing history  (localStorage-tracked)
//   7. Upsell footer — "become a professional seller"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery }  from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { listingsApi, api } from '@/lib/api';
import {
  Heart, MessageSquare, Car, Search,
  Plus, ChevronRight, Eye, Clock,
  ShoppingBag, Sparkles, ArrowUpRight,
  History, CheckCircle2, AlertCircle,
  CreditCard, TrendingUp,
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function startOfCurrentMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthName() {
  return new Date().toLocaleString('default', { month: 'long' });
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatChip({
  icon: Icon, label, value, color, href, locale,
}: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; href: string; locale: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-1.5 px-5 py-4 rounded-2xl',
        'border transition-all duration-200 hover:scale-[1.02]',
        'bg-white dark:bg-[var(--ink-750)]',
        'border-gray-100 dark:border-white/[0.07]',
        'hover:border-[rgba(201,168,76,0.3)] dark:hover:border-[rgba(201,168,76,0.2)]',
      )}
    >
      <Icon className={cn('w-5 h-5', color)} aria-hidden />
      <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">{value}</span>
      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium text-center">{label}</span>
    </Link>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// Monthly listing quota widget
function QuotaCard({
  used, limit, locale, subscribed,
}: {
  used: number; limit: number; locale: string; subscribed: boolean;
}) {
  const pct    = Math.min((used / limit) * 100, 100);
  const isFull = used >= limit;
  const remaining = Math.max(limit - used, 0);

  if (!subscribed) {
    return (
      <div className="rounded-2xl border border-[rgba(201,168,76,0.3)] dark:border-[rgba(201,168,76,0.2)]
                      bg-gradient-to-br from-[var(--gold-subtle)] to-[#9e6e1e]/5
                      dark:from-[var(--gold-subtle)] dark:to-[#9e6e1e]/10 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(201,168,76,0.15)] flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-[var(--gold)]" aria-hidden />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white">Activate Buyer Plan</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Subscribe at <span className="font-bold text-[#9e6e1e] dark:text-[#d4b45a]">$2.99/month</span> to post up to 2 cars per month.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Post up to 2 cars/month', 'Direct seller messages', 'Featured placement'].map(f => (
                <span key={f} className="inline-flex items-center gap-1 text-[11px] font-medium
                                         text-[#9e6e1e] dark:text-[#d4b45a] bg-[rgba(201,168,76,0.15)] dark:bg-[rgba(201,168,76,0.15)]
                                         px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> {f}
                </span>
              ))}
            </div>
          </div>
          <Link
            href={`/${locale}/dashboard/subscription`}
            className="flex-shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-xl
                       text-sm font-bold bg-[var(--gold)] text-white
                       hover:bg-[#b8943c] transition-colors shadow-[0_4px_14px_rgba(201,168,76,0.35)]"
          >
            Activate <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-2xl border p-5',
      isFull
        ? 'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5'
        : 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5',
    )}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">
            {getMonthName()} Listing Quota
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isFull
              ? 'You\'ve used all your posts for this month'
              : `${remaining} post${remaining !== 1 ? 's' : ''} remaining this month`}
          </p>
        </div>
        <div className={cn(
          'text-3xl font-black leading-none',
          isFull ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
        )}>
          {used}<span className="text-lg text-gray-400 dark:text-white/30">/{limit}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            isFull ? 'bg-red-500' : used >= limit - 1 ? 'bg-amber-500' : 'bg-emerald-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {isFull ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Resets on the 1st of next month
          </p>
          <Link
            href={`/${locale}/dashboard/subscription`}
            className="text-xs font-bold text-amber-600 dark:text-amber-400
                       hover:text-amber-700 transition-colors flex items-center gap-1"
          >
            Upgrade for more <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Buyer Plan — $2.99/month
          </p>
          <Link
            href={`/${locale}/dashboard/listings/new`}
            className="text-xs font-bold text-[#9e6e1e] dark:text-[#d4b45a]
                       hover:text-[#9e6e1e] transition-colors flex items-center gap-1"
          >
            Post a car <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// Compact listing card (buyer's posted cars)
function ListingCard({ listing, locale }: { listing: any; locale: string }) {
  const statusCls: Record<string, string> = {
    ACTIVE:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    SOLD:    'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    EXPIRED: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl
                    bg-slate-50 dark:bg-white/[0.03]
                    border border-slate-100 dark:border-white/[0.05]
                    hover:border-[rgba(201,168,76,0.3)] dark:hover:border-[rgba(201,168,76,0.2)]
                    transition-all duration-200">
      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10 flex-shrink-0
                      flex items-center justify-center">
        {listing.coverImage
          ? <img src={listing.coverImage} alt="" className="w-full h-full object-cover rounded-xl" />
          : <Car className="w-5 h-5 text-gray-400" aria-hidden />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {listing.titleKu ?? listing.titleEn ?? 'Listing'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-bold text-[#9e6e1e] dark:text-[#d4b45a]">
            {listing.price ? `$${Number(listing.price).toLocaleString()}` : 'Contact'}
          </span>
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <Eye className="w-3 h-3" /> {listing.views ?? 0}
          </span>
        </div>
      </div>
      <span className={cn(
        'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
        statusCls[listing.status] ?? statusCls.ACTIVE,
      )}>
        {listing.status}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuyerDashboardHome() {
  const params   = useParams();
  const locale   = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');
  const user     = useAuthStore(s => s.user);
  const dir      = (locale === 'ku' || locale === 'ar') ? 'rtl' : 'ltr';

  // Browsing history from localStorage
  const [browsingHistory, setBrowsingHistory] = useState<any[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('carsauto_viewed');
      if (raw) setBrowsingHistory(JSON.parse(raw).slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  // Fetch user's listings
  const { data: myListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'my'],
    queryFn:  () => listingsApi.myListings(),
    staleTime: 60_000,
  });

  // Fetch favorites
  const { data: favorites = [], isLoading: favsLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn:  () => api.get('/favorites').then(r => r.data),
    staleTime: 60_000,
  });

  // Monthly used count (client-side calculation from listings)
  const monthStart = startOfCurrentMonth();
  const monthlyListings = (myListings as any[]).filter(
    l => new Date(l.createdAt) >= monthStart && !l.deletedAt
  );
  const monthlyUsed = monthlyListings.length;

  // Dummy subscription check — will be real once payments are wired
  // In production: fetch /auth/permission-status and check reason
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    api.get('/listings/permission-status')
      .then(r => {
        const reason = r.data?.reason;
        setSubscribed(reason === 'BUYER_SUBSCRIBED' || reason === 'BUYER_MONTHLY_LIMIT_REACHED');
      })
      .catch(() => setSubscribed(false));
  }, []);

  const savedCount    = (favorites as any[]).length;
  const listingsCount = monthlyUsed;

  return (
    <div className="p-5 lg:p-7 space-y-6" dir={dir}>

      {/* ── Welcome header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {user?.name ? `سڵاو، ${user.name}` : 'Welcome back'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                             text-[11px] font-bold
                             bg-[rgba(201,168,76,0.15)] text-[#9e6e1e] dark:bg-[rgba(201,168,76,0.15)] dark:text-[#d4b45a]">
              <ShoppingBag className="w-3 h-3" /> Buyer
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {locale === 'ku' ? 'ئۆتۆمبێلی دڵخوازت بدۆزەرەوە' : 'Find your perfect car today'}
          </p>
        </div>

        <Link
          href={`/${locale}/cars`}
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl
                     text-sm font-bold bg-[var(--gold)] text-white
                     hover:bg-[#b8943c] transition-all duration-200
                     shadow-[0_4px_16px_rgba(201,168,76,0.35)]"
        >
          <Search className="w-3.5 h-3.5" /> Browse Cars
        </Link>
      </div>

      {/* ── Quick stat chips ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatChip
          icon={Heart}
          label="Saved Cars"
          value={favsLoading ? '—' : savedCount}
          color="text-rose-500"
          href={`/${locale}/dashboard/favorites`}
          locale={locale}
        />
        <StatChip
          icon={MessageSquare}
          label="Messages"
          value="—"
          color="text-violet-500"
          href={`/${locale}/dashboard/messages`}
          locale={locale}
        />
        <StatChip
          icon={Car}
          label="Listed this month"
          value={listingsLoading ? '—' : `${listingsCount}/2`}
          color="text-[var(--gold)]"
          href={`/${locale}/dashboard/listings`}
          locale={locale}
        />
      </div>

      {/* ── Monthly quota card ──────────────────────────────────── */}
      <QuotaCard
        used={monthlyUsed}
        limit={2}
        locale={locale}
        subscribed={subscribed}
      />

      {/* ── Main 2-col grid ─────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* My Listed Cars — 2/3 width */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-white/[0.07]
                        bg-white dark:bg-[var(--ink-750)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b
                          border-gray-100 dark:border-white/[0.07]">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">My Listed Cars</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {monthlyUsed} of 2 used · resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
              </p>
            </div>
            <Link
              href={`/${locale}/dashboard/listings`}
              className="text-xs text-[var(--gold)] font-semibold hover:text-[#9e6e1e] transition-colors
                         flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 space-y-2">
            {listingsLoading ? (
              [1, 2].map(i => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))
            ) : monthlyListings.length > 0 ? (
              monthlyListings.slice(0, 2).map((l: any) => (
                <ListingCard key={l.id} listing={l} locale={locale} />
              ))
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--gold-subtle)] dark:bg-[var(--gold-subtle)]
                                flex items-center justify-center mb-3">
                  <Car className="w-7 h-7 text-[#d4b45a]" aria-hidden />
                </div>
                <p className="font-semibold text-gray-700 dark:text-white/70">No cars listed this month</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  {subscribed
                    ? 'You can post up to 2 cars this month'
                    : 'Subscribe to the Buyer Plan to list your car'}
                </p>
                {subscribed ? (
                  <Link
                    href={`/${locale}/dashboard/listings/new`}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg
                               text-xs font-bold bg-[var(--gold)] text-white hover:bg-[#b8943c] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Your Car
                  </Link>
                ) : (
                  <Link
                    href={`/${locale}/dashboard/subscription`}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg
                               text-xs font-bold bg-[var(--gold)] text-white hover:bg-[#b8943c] transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Activate Buyer Plan
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Add listing prompt */}
          {monthlyUsed < 2 && subscribed && monthlyListings.length > 0 && (
            <div className="px-4 pb-4">
              <Link
                href={`/${locale}/dashboard/listings/new`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                           text-sm font-semibold border border-dashed
                           border-gray-200 dark:border-white/[0.10]
                           text-gray-400 dark:text-white/30
                           hover:border-[rgba(201,168,76,0.5)] hover:text-[var(--gold)]
                           transition-all duration-200"
              >
                <Plus className="w-4 h-4" /> Add another listing ({2 - monthlyUsed} remaining)
              </Link>
            </div>
          )}
        </div>

        {/* Right column: Saved + History — 1/3 */}
        <div className="space-y-4">

          {/* Saved Cars */}
          <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                          bg-white dark:bg-[var(--ink-750)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b
                            border-gray-100 dark:border-white/[0.07]">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Saved Cars</h2>
              <Link href={`/${locale}/dashboard/favorites`}
                    className="text-xs text-[var(--gold)] hover:text-[#9e6e1e] font-semibold
                               transition-colors flex items-center gap-0.5">
                All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {favsLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 bg-slate-100 dark:bg-white/5 animate-pulse rounded" />
                      <div className="h-2.5 w-1/2 bg-slate-100 dark:bg-white/5 animate-pulse rounded" />
                    </div>
                  </div>
                ))
              ) : (favorites as any[]).length > 0 ? (
                (favorites as any[]).slice(0, 4).map((fav: any) => (
                  <Link
                    key={fav.id}
                    href={`/${locale}/cars/${fav.listing?.id ?? fav.id}`}
                    className="flex items-center gap-3 px-4 py-3
                               hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex-shrink-0
                                    overflow-hidden">
                      {fav.listing?.coverImage
                        ? <img src={fav.listing.coverImage} alt="" className="w-full h-full object-cover" />
                        : <Car className="w-4 h-4 text-gray-400 m-auto mt-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {fav.listing?.titleKu ?? fav.listing?.titleEn ?? 'Car'}
                      </p>
                      <p className="text-[10px] text-[#9e6e1e] dark:text-[#d4b45a] font-bold mt-0.5">
                        {fav.listing?.price ? `$${Number(fav.listing.price).toLocaleString()}` : 'Ask'}
                      </p>
                    </div>
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-current flex-shrink-0" aria-hidden />
                  </Link>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <Heart className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No saved cars yet</p>
                  <Link href={`/${locale}/cars`}
                        className="text-[11px] text-[var(--gold)] font-semibold mt-1 inline-block">
                    Browse listings →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Browsing History */}
          <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                          bg-white dark:bg-[var(--ink-750)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b
                            border-gray-100 dark:border-white/[0.07]">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Recently Viewed</h2>
              <Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden />
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {browsingHistory.length > 0 ? (
                browsingHistory.map((item: any, i) => (
                  <Link
                    key={i}
                    href={`/${locale}/cars/${item.id}`}
                    className="flex items-center gap-3 px-4 py-3
                               hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5
                                    flex items-center justify-center flex-shrink-0">
                      <Car className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-white/80 truncate">
                        {item.title ?? 'Unknown Car'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.time ?? 'Recently'}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <History className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No recent browsing</p>
                  <Link href={`/${locale}/cars`}
                        className="text-[11px] text-[var(--gold)] font-semibold mt-1 inline-block">
                    Start browsing →
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Seller upgrade banner ────────────────────────────────── */}
      <div className="rounded-2xl p-5 flex items-center justify-between gap-4
                      bg-gradient-to-r from-amber-500/10 to-amber-400/5
                      border border-amber-200 dark:border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-500" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              Want to sell professionally?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Upgrade to a Dealer account — unlimited listings, advanced analytics, and more.
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/dashboard/subscription`}
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl
                     text-xs font-bold bg-amber-500 text-white
                     hover:bg-amber-600 transition-all duration-200
                     shadow-[0_4px_16px_rgba(245,158,11,0.35)]"
        >
          <Sparkles className="w-3.5 h-3.5" /> Become a Dealer
        </Link>
      </div>

    </div>
  );
}
