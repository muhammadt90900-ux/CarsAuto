'use client';
// app/[locale]/dashboard/reviews/page.tsx — Fully localized

import { useTranslations } from 'next-intl';
import { Star, ThumbsUp } from 'lucide-react';

const reviews = [
  { id: '1', author: 'Ahmed H.',  avatar: 'AH', rating: 5, date: 'May 18, 2026', comment: 'Excellent seller! The car was exactly as described. Very honest and professional.', listing: 'Toyota Camry 2022',  helpful: 4 },
  { id: '2', author: 'Sara A.',   avatar: 'SA', rating: 5, date: 'May 10, 2026', comment: 'Great experience! Quick response and very helpful. Highly recommend this seller.',  listing: 'BMW 3 Series 2021',  helpful: 7 },
  { id: '3', author: 'Omar K.',   avatar: 'OK', rating: 4, date: 'Apr 28, 2026', comment: 'Good seller, the car needed some cleaning but overall happy with the purchase.',      listing: 'Honda CR-V 2023',     helpful: 2 },
  { id: '4', author: 'Lana M.',   avatar: 'LM', rating: 5, date: 'Apr 12, 2026', comment: 'Perfect condition car. The seller was very transparent about everything.',           listing: 'Mercedes C200 2020', helpful: 9 },
];

const ratingDist = [
  { stars: 5, count: 38, pct: 79 },
  { stars: 4, count: 7,  pct: 15 },
  { stars: 3, count: 2,  pct: 4  },
  { stars: 2, count: 1,  pct: 2  },
  { stars: 1, count: 0,  pct: 0  },
];

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${value} stars`}>
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`${size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} aria-hidden />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const t = useTranslations('dashboard');
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="p-5 lg:p-7 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('reviews')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('whatBuyersSay')}</p>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f1a]/80 p-5">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="text-center sm:border-e sm:border-gray-100 sm:dark:border-white/5 sm:pe-6">
            <p className="text-5xl font-bold text-gray-900 dark:text-white">{avg}</p>
            <Stars value={Math.round(Number(avg))} size="lg" />
            <p className="text-xs text-gray-400 mt-1">{t('totalReviews')}: {reviews.length}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {ratingDist.map(({ stars, count, pct }) => (
              <div key={stars} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-3 text-end">{stars}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" aria-hidden />
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-gray-400 w-5">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f1a]/80 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gold)] to-[#9e6e1e] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {review.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{review.author}</p>
                  <p className="text-xs text-gray-400">{review.listing}</p>
                </div>
              </div>
              <div className="text-end">
                <Stars value={review.rating} />
                <p className="text-xs text-gray-400 mt-1">{review.date}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{review.comment}</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <button className="inline-flex items-center gap-1 hover:text-[var(--gold)] transition-colors">
                <ThumbsUp className="w-3.5 h-3.5" aria-hidden />
                {t('helpful')} ({review.helpful})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
