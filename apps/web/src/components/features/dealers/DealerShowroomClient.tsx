'use client';
// components/features/dealers/DealerShowroomClient.tsx

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star, MapPin, Phone, MessageCircle, Globe, Instagram,
  CheckCircle2, Shield, Zap, Award, Clock, ChevronDown,
  ChevronUp, ExternalLink, Share2, Copy, Flag,
  TrendingUp, BarChart2, Send, Facebook,
} from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  ratingService?: number | null;
  ratingPrice?: number | null;
  ratingQuality?: number | null;
  helpful: number;
  verified: boolean;
  createdAt: string;
  reviewer: { id: string; name: string; avatar?: string | null };
}

interface Dealer {
  id: string;
  slug: string;
  nameEn: string; nameAr: string; nameKu: string;
  taglineEn?: string | null; taglineAr?: string | null; taglineKu?: string | null;
  descriptionEn?: string | null; descriptionAr?: string | null; descriptionKu?: string | null;
  logoUrl?: string | null; coverUrl?: string | null;
  tier: 'BASIC' | 'STANDARD' | 'GOLD' | 'PLATINUM';
  status: string;
  averageRating: number; totalReviews: number; totalListings: number;
  activeListings: number; totalViews: number;
  responseRate: number; responseTimeMin?: number | null;
  phone?: string | null; whatsapp?: string | null; email?: string | null;
  website?: string | null; instagram?: string | null; facebook?: string | null; telegram?: string | null;
  address?: string | null; lat?: number | null; lng?: number | null;
  openingHours?: Record<string, string> | null;
  specialties: string[];
  location?: { city: string; governorate?: string | null; country: string } | null;
  badges?: Array<{ code: string; label: string; icon?: string | null }>;
  showroomImages?: Array<{ id: string; url: string; caption?: string | null }>;
  reviews?: Review[];
  _count?: { reviews: number; contactRequests: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TIER_STYLES = {
  PLATINUM: { bg: 'bg-gradient-to-r from-[#e8e0c8] to-[#c9a84c]', text: 'text-[#7a5c1e]', icon: '💎', border: 'border-[#c9a84c]/50' },
  GOLD:     { bg: 'bg-gradient-to-r from-[#fde68a] to-[#f59e0b]', text: 'text-[#78350f]', icon: '⭐', border: 'border-[#f59e0b]/50' },
  STANDARD: { bg: 'bg-gradient-to-r from-[#bfdbfe] to-[#3b82f6]', text: 'text-[#1e40af]', icon: '✓',  border: 'border-[#3b82f6]/40' },
  BASIC:    { bg: 'bg-white/10',                                   text: 'text-white/50',  icon: '',   border: 'border-white/10'     },
};

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABELS: Record<string,string> = { mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday' };

function StarRow({ value, label }: { value?: number | null; label: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.7rem] text-white/40 w-14">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={cn('w-2.5 h-2.5', i < value ? 'text-[#c9a84c] fill-[#c9a84c]' : 'text-white/15')} />
        ))}
      </div>
      <span className="text-[0.7rem] font-bold text-[#e8cc7a]">{value}.0</span>
    </div>
  );
}

const RatingBar = memo(function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.7rem] text-white/40 w-4 text-right">{stars}</span>
      <Star className="w-2.5 h-2.5 text-[#c9a84c] fill-[#c9a84c]" />
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[0.7rem] text-white/30 w-8">{pct}%</span>
    </div>
  );
});

// ── Contact Form ───────────────────────────────────────────────────────────

function ContactForm({ dealer, locale }: { dealer: Dealer; locale: string }) {
  const [form, setForm]   = useState({ name: '', phone: '', email: '', message: '' });
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    if (!form.name || !form.message) return;
    setLoading(true);
    try {
      await fetch(`/api/dealers/${dealer.slug}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, channel: 'form' }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }, [form, dealer.slug]);

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <p className="font-display font-bold text-white text-lg">Message Sent!</p>
        <p className="text-sm text-white/50">The dealer will respond shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        value={form.name}
        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        placeholder="Your name *"
        className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/40"
      />
      <input
        value={form.phone}
        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
        placeholder="Phone number"
        className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/40"
      />
      <textarea
        value={form.message}
        onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
        placeholder="Your message *"
        rows={4}
        className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/40 resize-none"
      />
      <button
        onClick={submit}
        disabled={loading || !form.name || !form.message}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? 'Sending…' : 'Send Message'}
      </button>

      {dealer.whatsapp && (
        <a
          href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I found your dealership on Auto Bazaar Pro!')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] font-semibold text-sm hover:bg-[#25D366]/20 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Chat on WhatsApp
        </a>
      )}
    </div>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────

const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.body.length > 200;

  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a84c]/30 to-[#c9a84c]/10 flex items-center justify-center text-[#e8cc7a] font-bold text-sm">
            {review.reviewer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white">{review.reviewer.name}</span>
              {review.verified && (
                <span className="flex items-center gap-0.5 text-[0.6rem] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
            <span className="text-[0.68rem] text-white/30">
              {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn('w-3 h-3', i < review.rating ? 'text-[#c9a84c] fill-[#c9a84c]' : 'text-white/15')} />
          ))}
        </div>
      </div>

      {review.title && (
        <p className="text-sm font-semibold text-white">{review.title}</p>
      )}

      <p className={cn('text-sm text-white/60 leading-relaxed', !expanded && long && 'line-clamp-3')}>
        {review.body}
      </p>
      {long && (
        <button onClick={() => setExpanded(p => !p)} className="flex items-center gap-1 text-[0.72rem] text-[#c9a84c] hover:text-[#e8cc7a] transition-colors">
          {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Read more</>}
        </button>
      )}

      {(review.ratingService || review.ratingPrice || review.ratingQuality) && (
        <div className="pt-2 border-t border-white/[0.05] space-y-1">
          <StarRow value={review.ratingService}  label="Service" />
          <StarRow value={review.ratingPrice}    label="Price" />
          <StarRow value={review.ratingQuality}  label="Quality" />
        </div>
      )}
    </div>
  );
});

// ── Main Component ─────────────────────────────────────────────────────────

export function DealerShowroomClient({ dealer, locale = 'en' }: { dealer: Dealer; locale?: string }) {
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'contact'>('about');
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [shareOpen, setShareOpen]   = useState(false);

  const isRTL  = locale === 'ar' || locale === 'ku';
  const name   = locale === 'ku' ? dealer.nameKu : locale === 'ar' ? dealer.nameAr : dealer.nameEn;
  const tagline = locale === 'ku' ? dealer.taglineKu : locale === 'ar' ? dealer.taglineAr : dealer.taglineEn;
  const desc   = locale === 'ku' ? dealer.descriptionKu : locale === 'ar' ? dealer.descriptionAr : dealer.descriptionEn;
  const tier   = TIER_STYLES[dealer.tier];

  // Compute rating breakdown
  const reviews = dealer.reviews ?? [];
  const breakdown = [5,4,3,2,1].map(s => ({
    stars: s,
    count: reviews.filter(r => r.rating === s).length,
  }));

  const images = dealer.showroomImages ?? [];

  return (
    <div className="min-h-screen bg-[#060e1a]" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Hero Cover ── */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-[#0b1a2e] to-[#162840] overflow-hidden">
        {dealer.coverUrl ? (
          <Image src={dealer.coverUrl} alt={name} fill className="object-cover opacity-50" priority />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(201,168,76,0.06),transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(59,130,246,0.04),transparent_60%)]" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060e1a] via-transparent to-transparent" />

        {/* Tier badge */}
        {dealer.tier !== 'BASIC' && (
          <div className={cn('absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold', tier.bg, tier.text)}>
            <span>{tier.icon}</span>
            <span>{dealer.tier} DEALER</span>
          </div>
        )}

        {/* Share / actions */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={() => setShareOpen(p => !p)}
            className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Profile header ── */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-end gap-5 -mt-10 relative z-10 mb-6">
          {/* Logo */}
          <div className={cn('w-20 h-20 rounded-2xl border-4 border-[#060e1a] overflow-hidden bg-[#0d1b2e] flex items-center justify-center shadow-2xl flex-shrink-0', tier.border, 'border-2')}>
            {dealer.logoUrl ? (
              <Image src={dealer.logoUrl} alt={name} width={80} height={80} className="object-contain" />
            ) : (
              <span className="text-3xl font-black text-[#c9a84c]">{name.charAt(0)}</span>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-black text-white text-2xl md:text-3xl leading-tight">{name}</h1>
              {dealer.status === 'VERIFIED' && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[0.68rem] font-bold text-[#e8cc7a]">
                  <CheckCircle2 className="w-3 h-3" /> Verified Dealer
                </span>
              )}
            </div>
            {tagline && <p className="text-white/50 text-sm mt-0.5">{tagline}</p>}
            {dealer.location && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-white/40">
                <MapPin className="w-3.5 h-3.5 text-[#c9a84c]/60" />
                {dealer.location.city}{dealer.location.governorate ? `, ${dealer.location.governorate}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Avg. Rating',    value: dealer.averageRating.toFixed(1), suffix: '/ 5', highlight: true },
            { label: 'Reviews',        value: dealer.totalReviews.toLocaleString() },
            { label: 'Active Listings', value: dealer.activeListings.toLocaleString() },
            { label: 'Response Rate',  value: `${dealer.responseRate.toFixed(0)}%` },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl bg-[#0d1b2e] border border-white/[0.07] text-center">
              <div className={cn('text-2xl font-black', s.highlight ? 'text-[#e8cc7a]' : 'text-white')}>
                {s.value}
                {s.suffix && <span className="text-sm text-white/30 ml-1">{s.suffix}</span>}
              </div>
              <div className="text-[0.68rem] text-white/35 uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Badges ── */}
        {dealer.badges && dealer.badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {dealer.badges.map(b => (
              <span key={b.code} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-sm text-[#e8cc7a]">
                {b.icon && <span>{b.icon}</span>}
                <span className="font-semibold">{b.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16">

          {/* Left: tabs */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab bar */}
            <div className="flex border-b border-white/[0.07]">
              {(['about', 'reviews', 'contact'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-5 py-3 text-sm font-semibold capitalize transition-colors relative',
                    activeTab === tab ? 'text-[#e8cc7a]' : 'text-white/40 hover:text-white/70',
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* ── About tab ── */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                {/* Description */}
                {desc && (
                  <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
                    <h2 className="flex items-center gap-2 font-display font-bold text-white text-base mb-3">
                      <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#c9a84c] to-[#9e6e1e]" />
                      About the Dealership
                    </h2>
                    <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
                  </div>
                )}

                {/* Specialties */}
                {dealer.specialties.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
                    <h2 className="flex items-center gap-2 font-display font-bold text-white text-base mb-3">
                      <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#c9a84c] to-[#9e6e1e]" />
                      Specialties
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {dealer.specialties.map(s => (
                        <span key={s} className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.09] text-sm text-white/70">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Showroom gallery */}
                {images.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
                    <h2 className="flex items-center gap-2 font-display font-bold text-white text-base mb-3">
                      <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#c9a84c] to-[#9e6e1e]" />
                      Showroom
                    </h2>
                    <div className="space-y-2">
                      <div className="relative aspect-video rounded-xl overflow-hidden">
                        <Image src={images[galleryIdx].url} alt={images[galleryIdx].caption ?? 'Showroom'} fill className="object-cover" />
                      </div>
                      {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {images.map((img, i) => (
                            <button
                              key={img.id}
                              onClick={() => setGalleryIdx(i)}
                              className={cn('flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all', i === galleryIdx ? 'border-[#c9a84c]' : 'border-transparent')}
                            >
                              <Image src={img.url} alt="" width={64} height={48} className="object-cover w-full h-full" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Opening hours */}
                {dealer.openingHours && (
                  <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
                    <h2 className="flex items-center gap-2 font-display font-bold text-white text-base mb-3">
                      <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#c9a84c] to-[#9e6e1e]" />
                      Opening Hours
                    </h2>
                    <div className="space-y-1.5">
                      {DAYS.map(d => {
                        const hours = dealer.openingHours![d];
                        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().slice(0,3);
                        const isToday = d === today;
                        return (
                          <div key={d} className={cn('flex items-center justify-between text-sm py-1.5 px-3 rounded-lg', isToday && 'bg-[#c9a84c]/10 border border-[#c9a84c]/20')}>
                            <span className={cn('font-medium', isToday ? 'text-[#e8cc7a]' : 'text-white/50')}>{DAY_LABELS[d]}</span>
                            <span className={cn(isToday ? 'text-[#e8cc7a] font-semibold' : 'text-white/40')}>{hours ?? 'Closed'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Reviews tab ── */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {/* Aggregate */}
                <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07] flex gap-6 items-center">
                  <div className="text-center">
                    <div className="text-5xl font-black text-[#e8cc7a]">{dealer.averageRating.toFixed(1)}</div>
                    <div className="flex items-center gap-0.5 justify-center mt-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={cn('w-4 h-4', i < Math.round(dealer.averageRating) ? 'text-[#c9a84c] fill-[#c9a84c]' : 'text-white/15')} />
                      ))}
                    </div>
                    <div className="text-[0.7rem] text-white/30 mt-1">{dealer.totalReviews} reviews</div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {breakdown.map(b => (
                      <RatingBar key={b.stars} stars={b.stars} count={b.count} total={reviews.length} />
                    ))}
                  </div>
                </div>

                {/* Review list */}
                {reviews.length > 0 ? (
                  reviews.map(r => <ReviewCard key={r.id} review={r} />)
                ) : (
                  <div className="py-12 text-center text-white/30 text-sm">No reviews yet</div>
                )}
              </div>
            )}

            {/* ── Contact tab ── */}
            {activeTab === 'contact' && (
              <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
                <h2 className="flex items-center gap-2 font-display font-bold text-white text-base mb-4">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#c9a84c] to-[#9e6e1e]" />
                  Send a Message
                </h2>
                <ContactForm dealer={dealer} locale={locale} />
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">

            {/* Quick contact */}
            <div className="p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07] space-y-3">
              <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">Contact</h3>

              {dealer.phone && (
                <a href={`tel:${dealer.phone}`} className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
                    <Phone className="w-4 h-4 text-blue-400" />
                  </div>
                  {dealer.phone}
                </a>
              )}

              {dealer.whatsapp && (
                <a
                  href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 flex items-center justify-center group-hover:bg-[#25D366]/25 transition-colors">
                    <svg className="w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  WhatsApp
                </a>
              )}

              {dealer.email && (
                <a href={`mailto:${dealer.email}`} className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors">
                    <Send className="w-4 h-4 text-purple-400" />
                  </div>
                  {dealer.email}
                </a>
              )}

              {dealer.website && (
                <a href={dealer.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors">
                    <Globe className="w-4 h-4 text-white/50" />
                  </div>
                  Website
                  <ExternalLink className="w-3 h-3 text-white/20 ml-auto" />
                </a>
              )}

              <div className="flex items-center gap-2 pt-1">
                {dealer.instagram && (
                  <a href={`https://instagram.com/${dealer.instagram}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center hover:bg-pink-500/20 transition-colors">
                    <Instagram className="w-4 h-4 text-pink-400" />
                  </a>
                )}
                {dealer.facebook && (
                  <a href={`https://facebook.com/${dealer.facebook}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center hover:bg-blue-600/20 transition-colors">
                    <Facebook className="w-4 h-4 text-blue-400" />
                  </a>
                )}
                {dealer.telegram && (
                  <a href={`https://t.me/${dealer.telegram}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center hover:bg-sky-500/20 transition-colors">
                    <Send className="w-4 h-4 text-sky-400" />
                  </a>
                )}
              </div>
            </div>

            {/* Response metrics */}
            {(dealer.responseRate > 0 || dealer.responseTimeMin) && (
              <div className="p-4 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
                <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">Response</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/40">Response Rate</span>
                      <span className="text-[#e8cc7a] font-bold">{dealer.responseRate.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.07]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a]" style={{ width: `${dealer.responseRate}%` }} />
                    </div>
                  </div>
                  {dealer.responseTimeMin && (
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Clock className="w-3 h-3 text-[#c9a84c]/60" />
                      Typically responds in{' '}
                      <span className="text-white/70 font-semibold">
                        {dealer.responseTimeMin < 60 ? `${dealer.responseTimeMin}m` : `${Math.round(dealer.responseTimeMin / 60)}h`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map placeholder */}
            {dealer.address && (
              <div className="p-4 rounded-2xl bg-[#0d1b2e] border border-white/[0.07]">
                <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-2">Location</h3>
                <p className="text-sm text-white/50 mb-3">{dealer.address}</p>
                {dealer.lat && dealer.lng && (
                  <a
                    href={`https://maps.google.com/?q=${dealer.lat},${dealer.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#c9a84c] hover:text-[#e8cc7a] transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    View on Maps
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
