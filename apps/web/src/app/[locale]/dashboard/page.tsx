'use client';
// app/[locale]/dashboard/page.tsx
// Role-aware dashboard home:
//   USER   (buyer)  → <BuyerDashboardHome>
//   DEALER / ADMIN  → original seller dashboard

import { useAuthStore } from '@/store/auth.store';
import BuyerDashboardHome from './buyer-home';
import SellerDashboardHome from './seller-home';

export default function DashboardPage() {
  const user       = useAuthStore(s => s.user);
  const isHydrated = useAuthStore(s => s.isHydrated);

  // While hydrating — show nothing (layout handles loading state)
  if (!isHydrated) {
    return (
      <div className="p-5 lg:p-7 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  // Buyer (USER role) gets a completely different experience
  if (user?.role === 'USER') {
    return <BuyerDashboardHome />;
  }

  // Seller / Admin
  return <SellerDashboardHome />;
}
