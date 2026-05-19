'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function MyListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listings.myListings()
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('دڵنیایت؟')) return;
    await api.listings.delete(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
        <p className="text-lg">هیچ ئۆتۆمبێلێکت نەنووستووە</p>
        <Link
          href="dashboard/new"
          className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
        >
          زیادکردنی ئۆتۆمبێل
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ئۆتۆمبێلەکانم</h1>
        <Link
          href="dashboard/new"
          className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
        >
          + زیادکردن
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listings.map((listing) => {
          const cover = listing.images?.[0]?.url;
          return (
            <div
              key={listing.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden flex gap-4 p-4"
            >
              {cover && (
                <img src={cover} alt="" className="w-24 h-20 object-cover rounded-xl flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{listing.titleKu ?? listing.titleEn}</p>
                <p className="text-blue-600 font-bold">{listing.price.toLocaleString()} {listing.currency}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    listing.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {listing.status}
                </span>
              </div>
              <button
                onClick={() => handleDelete(listing.id)}
                className="text-red-400 hover:text-red-600 text-xs self-start"
              >
                سڕینەوە
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
