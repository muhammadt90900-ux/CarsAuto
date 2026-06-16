'use client';
// components/features/dealers/DealerShowroomClient.tsx — Enterprise dealer showroom
// FEATURE 9: Follow/Unfollow button + animated follower count added
import { useState } from 'react';
import Link from 'next/link';
import { Star, Shield, MapPin, Phone, MessageCircle, Globe, Clock, ChevronRight, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDealerFollow } from '@/hooks/useDealerFollow';

const MOCK_CARS = Array.from({ length: 6 }, (_, i) => ({
  id: `car-${i + 1}`,
  title: ['Toyota Land Cruiser 2023','BMW X5 2022','Lexus LX570 2021','KIA Sportage 2023','Mercedes GLE 2022','Toyota Camry 2023'][i],
  price: [85000, 55000, 92000, 22000, 78000, 28000][i],
  year: [2023, 2022, 2021, 2023, 2022, 2023][i],
  mileage: [12000, 28000, 35000, 5000, 22000, 8000][i],
}));

const REVIEWS = [
  { id: 1, name: 'Ahmad K.', rating: 5, text: 'Excellent service. Bought my Land Cruiser here, smooth process and honest pricing.', date: '2 weeks ago' },
  { id: 2, name: 'Sara M.',  rating: 5, text: 'Highly professional team. The car was exactly as described. Will definitely return.', date: '1 month ago' },
  { id: 3, name: 'Hassan R.',rating: 4, text: 'Good selection and fair prices. Minor paperwork delay but overall great experience.', date: '2 months ago' },
];

export function DealerShowroomClient({ dealer, locale }: { dealer: any; locale: string }) {
  const t = useTranslations('dealers');
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews' | 'about'>('listings');
  const fmtPrice = (v: number) => '$' + new Intl.NumberFormat('en-US').format(v);
  const fmtNum   = (v: number) => new Intl.NumberFormat('en-US').format(v);

  const dealerData = {
    id: dealer?.id ?? '',
    name: dealer?.nameEn ?? (dealer?.slug ?? '').replace(/-/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    nameKu: dealer?.nameKu ?? 'ئۆتۆمبێل پریمیئوم',
    city: dealer?.location?.city ?? dealer?.city ?? 'Erbil',
    country: dealer?.location?.country ?? dealer?.country ?? 'Kurdistan Region',
    tier: dealer?.tier ?? 'Platinum',
    color: '#a855f7',
    rating: dealer?.averageRating ?? dealer?.rating ?? 4.9,
    reviews: dealer?._count?.reviews ?? dealer?.totalReviews ?? dealer?.reviewCount ?? 284,
    listings: dealer?.activeListings ?? dealer?.listings ?? 142,
    specialty: dealer?.specialties?.[0] ?? dealer?.specialty ?? 'Luxury & Premium Vehicles',
    phone: dealer?.phone ?? '+964 750 123 4567',
    whatsapp: dealer?.whatsapp ?? dealer?.phone ?? '+964 750 123 4567',
    website: dealer?.website ?? null,
    hours: dealer?.businessHours ?? dealer?.hours ?? 'Sat–Thu 9:00 AM – 7:00 PM',
    established: dealer?.establishedYear ?? dealer?.established ?? 2015,
    description: dealer?.descriptionEn ?? dealer?.description ?? 'One of the leading premium automotive dealerships.',
  };

  // FEATURE 9: follow state — server provides isFollowing + _count.followers on detail fetch
  const { isFollowing, followerCount, toggle, isPending } = useDealerFollow(
    dealerData.id,
    dealer?.isFollowing ?? false,
    dealer?._count?.followers ?? 0,
  );

  const TABS = [
    { id: 'listings', label: 'Listings', count: dealerData.listings },
    { id: 'reviews',  label: 'Reviews',  count: dealerData.reviews },
    { id: 'about',    label: 'About',    count: null },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--surface-0)] dark:bg-[var(--ink-900)]">
      {/* Hero banner */}
      <div className="relative overflow-hidden h-52 sm:h-64"
           style={{ background:'linear-gradient(135deg,#050b14 0%,#0f1c2e 60%,#050b14 100%)' }}>
        <div className="absolute inset-0 opacity-[0.03] bg-dot-grid"/>
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[var(--surface-0)] dark:from-[var(--ink-900)] to-transparent"/>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6" dir={locale === 'ku' || locale === 'ar' ? 'rtl' : 'ltr'}>
          <Link href={`/${locale}`} className="hover:text-[var(--gold)]">Home</Link>
          <ChevronRight className="w-3 h-3"/>
          <Link href={`/${locale}/dealers`} className="hover:text-[var(--gold)]">Dealers</Link>
          <ChevronRight className="w-3 h-3"/>
          <span className="text-[var(--text-secondary)]">{dealerData.name}</span>
        </nav>

        {/* Dealer profile card */}
        <div className="rounded-3xl overflow-hidden mb-8"
             style={{ background:'linear-gradient(145deg,rgba(11,21,37,0.95),rgba(8,15,28,0.98))', border:`1px solid ${dealerData.color}22` }}>
          <div className="h-0.5" style={{ background:`linear-gradient(90deg,transparent,${dealerData.color},transparent)` }}/>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                   style={{ background:`${dealerData.color}12`, border:`2px solid ${dealerData.color}30` }}>🏪</div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl font-black text-white">{dealerData.name}</h1>
                  <span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1"
                        style={{ background:`${dealerData.color}15`, border:`1px solid ${dealerData.color}30`, color:dealerData.color }}>
                    💎 {dealerData.tier}
                  </span>
                  <span className="verified-badge"><Shield className="w-2.5 h-2.5"/>Verified</span>
                </div>
                <p className="text-white/45 text-sm mb-3">{dealerData.nameKu} · {dealerData.specialty}</p>
                <div className="flex flex-wrap gap-4 text-sm text-white/50">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[var(--gold)]"/>{dealerData.city}, {dealerData.country}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[var(--gold)]"/>{dealerData.hours}</span>
                  <span className="flex items-center gap-1.5">Est. {dealerData.established}</span>
                </div>
              </div>

              {/* Stats + Follow button */}
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                <div className="flex gap-4 sm:gap-6">
                  {[
                    { val: dealerData.rating + '★', lbl: 'Rating' },
                    { val: dealerData.reviews,       lbl: 'Reviews' },
                    { val: followerCount,            lbl: 'Followers' },
                  ].map(s => (
                    <div key={s.lbl} className="text-center">
                      <div
                        key={s.lbl === 'Followers' ? followerCount : undefined}
                        className="font-black text-[var(--gold)] text-2xl transition-transform"
                      >
                        {s.val}
                      </div>
                      <div className="text-white/30 text-[10px] uppercase tracking-wider">{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* FEATURE 9: Follow/Unfollow button */}
                <button
                  onClick={toggle}
                  disabled={isPending}
                  aria-pressed={isFollowing}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-60
                    ${isFollowing
                      ? 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/25'
                      : 'bg-[var(--gold)] text-[var(--ink-900)] hover:bg-[var(--gold-light)]'}`}
                >
                  <Heart className={`w-4 h-4 transition-all ${isFollowing ? 'fill-[#ef4444]' : ''}`} />
                  {isFollowing ? t('unfollow') : t('follow')}
                </button>
              </div>
            </div>

            {/* Contact buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/[0.07]">
              <a href={`tel:${dealerData.phone}`}
                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                            bg-[var(--gold)] text-[var(--ink-900)] hover:bg-[var(--gold-light)] transition-colors">
                <Phone className="w-4 h-4"/>Call Dealer
              </a>
              <a href={`https://wa.me/${dealerData.whatsapp?.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                            bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/25 hover:bg-[#22c55e]/25 transition-colors">
                <MessageCircle className="w-4 h-4"/>WhatsApp
              </a>
              {dealerData.website && (
                <a href={dealerData.website} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                              bg-white/[0.06] text-white/60 border border-white/[0.12] hover:text-white hover:bg-white/[0.10] transition-colors">
                  <Globe className="w-4 h-4"/>Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[var(--surface-100)] dark:bg-[rgba(255,255,255,0.04)] rounded-2xl p-1 w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-[#0b1525] text-[var(--gold)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {tab.label}
              {tab.count !== null && (
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold
                  ${activeTab === tab.id ? 'bg-[var(--gold-subtle)] text-[var(--gold)]' : 'bg-[var(--surface-200)] dark:bg-white/[0.08] text-[var(--text-muted)]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'listings' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MOCK_CARS.map(car => (
              <Link key={car.id} href={`/${locale}/cars/${car.id}`}
                className="card-premium overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="aspect-[16/10] bg-[var(--surface-100)] dark:bg-[#0f1c2e] flex items-center justify-center text-6xl
                                group-hover:scale-105 transition-transform duration-500 overflow-hidden">🚗</div>
                <div className="p-4">
                  <h3 className="font-bold text-[var(--text-primary)] mb-1">{car.title}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{car.year} · {fmtNum(car.mileage)} km</p>
                  <p className="price-tag text-xl mt-3">${fmtNum(car.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="card-premium p-6 flex items-center gap-8">
              <div className="text-center">
                <div className="text-5xl font-black text-[var(--gold)]">{dealerData.rating}</div>
                <div className="flex gap-0.5 justify-center my-1">
                  {Array.from({length:5}).map((_,i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(dealerData.rating) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-[var(--border-default)]'}`}/>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{dealerData.reviews} reviews</p>
              </div>
              <div className="flex-1 space-y-2">
                {[5,4,3,2,1].map(n => (
                  <div key={n} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)] w-4">{n}</span>
                    <Star className="w-3 h-3 fill-[var(--gold)] text-[var(--gold)]"/>
                    <div className="flex-1 progress-bar">
                      <div className="progress-bar-fill" style={{ width:`${n === 5 ? 72 : n === 4 ? 18 : n === 3 ? 6 : 2}%` }}/>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] w-8">{n === 5 ? '72%' : n === 4 ? '18%' : n === 3 ? '6%' : '2%'}</span>
                  </div>
                ))}
              </div>
            </div>
            {REVIEWS.map(r => (
              <div key={r.id} className="card-premium p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--gold-subtle)] border border-[var(--border-gold)] flex items-center justify-center font-bold text-[var(--gold)] text-sm">
                      {r.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)] text-sm">{r.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{r.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({length:r.rating}).map((_,i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[var(--gold)] text-[var(--gold)]"/>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="card-premium p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[var(--gold)]"/>About Us
              </h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{dealerData.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label:'Location',      value:`${dealerData.city}, ${dealerData.country}`,  icon:<MapPin className="w-4 h-4"/> },
                { label:'Phone',         value:dealerData.phone,                          icon:<Phone className="w-4 h-4"/> },
                { label:'Business Hours',value:dealerData.hours,                          icon:<Clock className="w-4 h-4"/> },
                { label:'Established',   value:String(dealerData.established),            icon:<Shield className="w-4 h-4"/> },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-50)] dark:bg-white/[0.04] border border-[var(--border-subtle)]">
                  <span className="text-[var(--gold)] mt-0.5 flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
