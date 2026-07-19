'use client';
// components/features/home/Testimonials.tsx
//
// Previously this section showed three fabricated named customers
// ("Ahmad Al-Rashidi", "Sara Karim", "Mohammed Hassan") with invented 5★
// quotes — no real data behind any of it. Now backed by GET /reviews/featured
// (real Review rows, rating >= 4, substantial comment, "Verified Interaction"
// when tied to an actual prior chat). If there aren't enough qualifying real
// reviews yet, this section simply doesn't render — an honest gap beats a
// fabricated one.

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { reviewsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

function initials(name: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function Testimonials() {
  const t = useTranslations('home');
  const { data: reviews, isLoading } = useQuery({
    queryKey: queryKeys.reviews.featured(6),
    queryFn: () => reviewsApi.getFeatured(6),
    staleTime: 5 * 60_000,
  });

  // Honest empty state: no fake reviews to pad this out with.
  if (!isLoading && (!reviews || reviews.length === 0)) return null;
  if (isLoading) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.14em] uppercase bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)] mb-5">
          ● {t('testimonialsEyebrow')}
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
          {t('testimonialsTitle')}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews!.map((review) => (
          <div key={review.id}
               className="group relative rounded-2xl p-6 overflow-hidden border border-white/[0.07] hover:border-[rgba(201,168,76,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.45),0_0_0_1px_rgba(201,168,76,0.06)]"
               style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.85), rgba(8,15,28,0.9))' }}>
            <div className="absolute top-4 end-4 text-5xl text-[var(--gold-subtle)] font-serif leading-none select-none">"</div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-0.5">
                {Array.from({ length: review.rating }).map((_, si) => (
                  <span key={si} className="text-[var(--gold)] text-sm">★</span>
                ))}
              </div>
              {review.verified && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
                  ✓ {t('verifiedInteraction')}
                </span>
              )}
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-4">{review.comment}</p>
            <div className="h-px bg-white/[0.06] mb-4" />
            <div className="flex items-center gap-3">
              {review.reviewer.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={review.reviewer.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-[rgba(201,168,76,0.2)]" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(201,168,76,0.2)] to-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.2)] flex items-center justify-center text-xs font-bold text-[var(--gold)]">
                  {initials(review.reviewer.name)}
                </div>
              )}
              <div className="font-semibold text-white text-sm">{review.reviewer.name ?? '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
