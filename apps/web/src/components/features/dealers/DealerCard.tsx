'use client';
// components/features/dealers/DealerCard.tsx

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, MessageCircle, CheckCircle2, Shield, Zap, Award } from 'lucide-react';
import { cn } from '@cars-auto/utils';

const TIER_CONFIG = {
  PLATINUM: { label: 'Platinum',  labelKu: 'پلاتینیۆم', color: 'from-[#e8e0c8] to-[var(--gold)]', textColor: 'text-[var(--gold-dark)]',  ring: 'ring-[rgba(201,168,76,0.4)]',  icon: '💎' },
  GOLD:     { label: 'Gold',      labelKu: 'زێڕ',        color: 'from-[#fde68a] to-[#f59e0b]', textColor: 'text-[#78350f]',  ring: 'ring-[#f59e0b]/40',  icon: '⭐' },
  STANDARD: { label: 'Standard',  labelKu: 'ستانداردی',  color: 'from-[#bfdbfe] to-[#3b82f6]', textColor: 'text-[#1e40af]',  ring: 'ring-[#3b82f6]/40',  icon: '✓'  },
  BASIC:    { label: 'Basic',     labelKu: 'بنچینەیی',   color: 'from-white/10 to-white/5',    textColor: 'text-white/40',   ring: 'ring-white/10',       icon: ''   },
} as const;

interface DealerCardProps {
  dealer: {
    id: string;
    slug: string;
    nameEn: string;
    nameKu: string;
    taglineEn?: string | null;
    logoUrl?: string | null;
    coverUrl?: string | null;
    tier: keyof typeof TIER_CONFIG;
    status: string;
    averageRating: number;
    totalReviews: number;
    activeListings: number;
    responseRate: number;
    specialties: string[];
    location?: { city: string; governorate?: string | null } | null;
    badges?: Array<{ code: string; label: string; icon?: string | null }>;
    whatsapp?: string | null;
  };
  locale?: string;
}

export function DealerCard({ dealer, locale = 'en' }: DealerCardProps) {
  const isRTL  = locale === 'ar' || locale === 'ku';
  const name   = locale === 'ku' ? dealer.nameKu : dealer.nameEn;
  const tier   = TIER_CONFIG[dealer.tier] ?? TIER_CONFIG.BASIC;

  const ratingStars = (r: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn('w-3 h-3', i < Math.floor(r) ? 'text-[var(--gold)] fill-[var(--gold)]' : 'text-white/15')}
      />
    ));

  return (
    <Link
      href="/dealers/${dealer.slug}"
      className={cn(
        'group relative flex flex-col rounded-2xl overflow-hidden',
        'bg-[#0d1b2e] border border-white/[0.07]',
        'hover:border-[rgba(201,168,76,0.3)] transition-all duration-300',
        'hover:shadow-[0_12px_40px_rgba(201,168,76,0.12)]',
        'hover:-translate-y-0.5',
        tier.ring, 'ring-1',
      )}
    >
      {/* Cover / hero strip */}
      <div className="relative h-28 bg-gradient-to-br from-[#0b1a2e] to-[#162840] overflow-hidden flex-shrink-0">
        {dealer.coverUrl ? (
          <Image src={dealer.coverUrl} alt={name} fill className="object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-500" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        )}

        {/* Tier badge */}
        {dealer.tier !== 'BASIC' && (
          <div className={cn(
            'absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full',
            'text-[0.65rem] font-bold tracking-wide',
            'bg-gradient-to-r', tier.color, tier.textColor,
          )}>
            <span>{tier.icon}</span>
            <span>{tier.label}</span>
          </div>
        )}

        {/* Logo */}
        <div className="absolute -bottom-5 left-4 w-12 h-12 rounded-xl border-2 border-[#0d1b2e] overflow-hidden bg-[#0d1b2e] flex items-center justify-center shadow-lg">
          {dealer.logoUrl ? (
            <Image src={dealer.logoUrl} alt={name} width={48} height={48} className="object-contain" />
          ) : (
            <span className="text-lg font-black text-[var(--gold)]">{name.charAt(0)}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="pt-8 px-4 pb-4 flex flex-col gap-3 flex-1">
        {/* Name + verified */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-white text-[0.95rem] leading-snug line-clamp-1 group-hover:text-[var(--gold-light)] transition-colors">
              {name}
            </h3>
            {dealer.taglineEn && (
              <p className="text-[0.7rem] text-white/40 mt-0.5 line-clamp-1">{dealer.taglineEn}</p>
            )}
          </div>
          {dealer.status === 'VERIFIED' && (
            <CheckCircle2 className="w-4 h-4 text-[var(--gold)] flex-shrink-0 mt-0.5" />
          )}
        </div>

        {/* Location */}
        {dealer.location && (
          <div className="flex items-center gap-1.5 text-[0.7rem] text-white/40">
            <MapPin className="w-3 h-3 text-[rgba(201,168,76,0.6)]" />
            <span>{dealer.location.city}{dealer.location.governorate ? `, ${dealer.location.governorate}` : ''}</span>
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">{ratingStars(dealer.averageRating)}</div>
          <span className="text-[0.75rem] font-bold text-[var(--gold-light)]">{dealer.averageRating.toFixed(1)}</span>
          <span className="text-[0.7rem] text-white/30">({dealer.totalReviews})</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-1 border-t border-white/[0.05]">
          <div className="flex-1 text-center">
            <div className="text-[0.9rem] font-black text-white">{dealer.activeListings}</div>
            <div className="text-[0.62rem] text-white/35 uppercase tracking-wide">Listings</div>
          </div>
          <div className="w-px h-7 bg-white/[0.06]" />
          <div className="flex-1 text-center">
            <div className="text-[0.9rem] font-black text-white">{dealer.responseRate.toFixed(0)}%</div>
            <div className="text-[0.62rem] text-white/35 uppercase tracking-wide">Response</div>
          </div>
          <div className="w-px h-7 bg-white/[0.06]" />
          <div className="flex-1 text-center">
            <div className="text-[0.9rem] font-black text-white">{dealer.totalReviews}</div>
            <div className="text-[0.62rem] text-white/35 uppercase tracking-wide">Reviews</div>
          </div>
        </div>

        {/* Specialties */}
        {dealer.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dealer.specialties.slice(0, 3).map(s => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-white/[0.05] text-[0.62rem] text-white/45 border border-white/[0.07]">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Badges */}
        {dealer.badges && dealer.badges.length > 0 && (
          <div className="flex items-center gap-1.5">
            {dealer.badges.slice(0, 2).map(b => (
              <span key={b.code} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.2)] text-[0.62rem] text-[var(--gold-light)]">
                {b.icon && <span>{b.icon}</span>}
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* WhatsApp CTA */}
        {dealer.whatsapp && (
          <button
            onClick={e => {
              e.preventDefault();
              window.open(`https://wa.me/${dealer.whatsapp!.replace(/\D/g, '')}`, '_blank');
            }}
            className="mt-auto flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-whatsapp/10 border border-whatsapp/20 text-whatsapp text-[0.75rem] font-semibold hover:bg-whatsapp/20 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
        )}
      </div>
    </Link>
  );
}
