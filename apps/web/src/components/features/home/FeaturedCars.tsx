// apps/web/src/components/features/home/FeaturedCars.tsx
import { Card, Skeleton } from '@auto-bazaar-pro/ui/components';

export function FeaturedCars() {
  // In production, fetch from API
  const cars = []; // placeholder
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <Skeleton className="h-40 w-full rounded-xl mb-4" />
          <Skeleton variant="text" className="w-3/4 mb-2" />
          <Skeleton variant="text" className="w-1/2" />
        </Card>
      ))}
    </div>
  );
}
