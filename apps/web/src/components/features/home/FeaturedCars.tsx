'use client';
import { useEffect, useState } from 'react';
import { Card, Skeleton } from '@auto-bazaar-pro/ui/components';
import { api } from '@/lib/api';
import Link from 'next/link';

export function FeaturedCars() {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listings.getAll({ type: 'car', limit: '4' })
      .then(res => setCars(res.data || res || []))
      .catch(() => setCars([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
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

  if (cars.length === 0) return (
    <p className="text-center text-gray-400 py-12">هیچ ئەوتۆمبێلێک نەدۆزرایەوە</p>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cars.map((car: any) => (
        <Link href={`/cars/${car.id}`} key={car.id}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <img src={car.images?.[0] || '/placeholder.jpg'} className="h-40 w-full object-cover rounded-xl mb-4" />
            <h3 className="font-bold text-sm">{car.title}</h3>
            <p className="text-[#e94560] font-semibold">${car.price?.toLocaleString()}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
