// apps/web/src/app/[locale]/dashboard/reviews/page.tsx
'use client';

import { Star, TrendingUp, MessageSquare, ThumbsUp } from 'lucide-react';

const reviews = [
  { id: '1', author: 'Ahmed H.', avatar: 'AH', rating: 5, date: 'May 18, 2026', comment: 'Excellent seller! The car was exactly as described. Very honest and professional.', listing: 'Toyota Camry 2022', helpful: 4 },
  { id: '2', author: 'Sara A.', avatar: 'SA', rating: 5, date: 'May 10, 2026', comment: 'Great experience! Quick response and very helpful. Highly recommend this seller.', listing: 'BMW 3 Series 2021', helpful: 7 },
  { id: '3', author: 'Omar K.', avatar: 'OK', rating: 4, date: 'Apr 28, 2026', comment: 'Good seller, the car needed some cleaning but overall happy with the purchase.', listing: 'Honda CR-V 2023', helpful: 2 },
  { id: '4', author: 'Lana M.', avatar: 'LM', rating: 5, date: 'Apr 12, 2026', comment: 'Perfect condition car. The seller was very transparent about everything.', listing: 'Mercedes C200 2020', helpful: 9 },
];

const ratingDist = [
  { stars: 5, count: 38, pct: 79 },
  { stars: 4, count: 7, pct: 15 },
  { stars: 3, count: 2, pct: 4 },
  { stars: 2, count: 1, pct: 2 },
  { stars: 1, count: 0, pct: 0 },
];

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${
            s <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="p-5 lg:p-7 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Reviews</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">What buyers say about you</p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f1a]/80 p-5">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Big rating */}
          <div className="flex flex-col items-center justify-center sm:border-r border-gray-100 dark:border-white/5 sm:pr-6 pb-4 sm:pb-0">
            <p className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{avg}</p>
            <Stars value={Math.round(Number(avg))} size="lg" />
            <p className="text-xs text-gray-400 mt-1.5">{reviews.length} reviews</p>
          </div>

          {/* Distribution */}
          <div className="flex-1 space-y-2">
            {ratingDist.map(({ stars, count, pct }) => (
              <div key={stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-8 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{stars}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-gray-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-50 dark:border-white/5">
          {[
            { label: 'Avg Rating', value: avg, Icon: Star, color: 'text-amber-500' },
            { label: 'Response Rate', value: '98%', Icon: TrendingUp, color: 'text-emerald-500' },
            { label: 'Total Reviews', value: '48', Icon: MessageSquare, color: 'text-blue-500' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="text-center">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
              <p className="text-base font-black text-gray-900 dark:text-white">{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f1a]/80 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e94560] to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {r.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.author}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Stars value={r.rating} />
                      <span className="text-[10px] text-gray-400">{r.date}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#e94560]/8 text-[#e94560] px-2 py-0.5 rounded-lg font-medium whitespace-nowrap flex-shrink-0">
                    {r.listing}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{r.comment}</p>
                <button className="flex items-center gap-1.5 mt-2.5 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Helpful ({r.helpful})
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
