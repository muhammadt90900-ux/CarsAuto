'use client';
// app/[locale]/dashboard/reviews/page.tsx
//
// Trust & Safety Prompt 7 frontend wiring. Was 100% hardcoded mock data —
// `const reviews = [...]` with four fake entries, confirmed by reading the
// file before touching it; there was no API call here at all. Now wired to
// GET /users/:userId/reviews (ReviewsService.findByReviewee(), built in
// Prompt 7's backend half — that endpoint didn't exist before this either).
// Adds the "Verified Interaction" label the prompt asked for: a review's
// `chatId !== null` means the reviewer and this seller had a real chat
// before the review was left (see ReviewsService.create()'s comment).

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Star, Loader2, ShieldCheck, MessageSquareOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import type { Review } from '@cars-auto/types';

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
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.get(`/users/${user.id}/reviews?limit=50`)
      .then(r => setReviews(r.data.data ?? []))
      .catch(() => setError('Failed to load reviews'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  const ratingDist = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => r.rating === stars).length;
    return { stars, count, pct: reviews.length ? Math.round((count / reviews.length) * 100) : 0 };
  });

  return (
    <div className="p-5 lg:p-7 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('reviews')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('whatBuyersSay')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 text-center py-16">{error}</p>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Star className="w-10 h-10 text-gray-200 dark:text-white/10" />
          <p className="text-sm text-gray-400">No reviews yet</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f1a]/80 p-5">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="text-center sm:border-e sm:border-gray-100 sm:dark:border-white/5 sm:pe-6">
                <p className="text-5xl font-bold text-gray-900 dark:text-white">{avg.toFixed(1)}</p>
                <Stars value={Math.round(avg)} size="lg" />
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
                    <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gold)] to-[#9e6e1e] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                      {review.reviewer?.avatar ? (
                        <Image src={review.reviewer.avatar} alt={review.reviewer?.name ? `${review.reviewer.name}'s avatar` : 'Reviewer avatar'} fill sizes="36px" className="object-cover" />
                      ) : (
                        review.reviewer?.name?.slice(0, 2).toUpperCase() ?? '??'
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{review.reviewer?.name ?? 'Anonymous'}</p>
                      {/* ADDED (Trust & Safety Prompt 7): Verified Interaction label */}
                      {review.chatId ? (
                        <p className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3" /> Verified Interaction
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300 dark:text-white/20 flex items-center gap-1 mt-0.5">
                          <MessageSquareOff className="w-3 h-3" /> No prior chat on record
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-end">
                    <Stars value={review.rating} />
                    <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
