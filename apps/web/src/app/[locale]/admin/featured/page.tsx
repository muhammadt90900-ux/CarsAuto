'use client';
// apps/web/src/app/[locale]/admin/featured/page.tsx
// Admin: control what gets premium visibility on the marketplace —
// featured car listings (Listing.featured) and homepage/banner ads (Ad
// model). Backed by real /admin/featured, /admin/listings/:id/featured,
// and /admin/ads endpoints.

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Star, Megaphone, Plus, Trash2, Loader2, AlertTriangle, ImageOff,
  Power, ExternalLink, X, Calendar,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

interface FeaturedListing {
  id: string;
  titleEn?: string;
  titleKu?: string;
  price: string | number;
  currency: string;
  featuredUntil?: string | null;
  user?: { id: string; name: string; email: string };
  images?: { url?: string }[];
}

interface Ad {
  id: string;
  title: string;
  imageUrl?: string;
  linkUrl?: string;
  placement: string;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

const PLACEMENTS = ['home', 'search', 'listing_detail', 'sidebar'];

type Tab = 'listings' | 'ads';

export default function AdminFeaturedPage() {
  const [tab, setTab] = useState<Tab>('listings');

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display font-black text-white text-2xl tracking-tight">Featured &amp; Ads</h1>
        <p className="text-white/40 text-sm mt-0.5">Manage what gets premium placement on the marketplace</p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07] w-fit">
        {([
          ['listings', 'Featured Listings', Star],
          ['ads',      'Banner Ads',        Megaphone],
        ] as [Tab, string, any][]).map(([val, label, Icon]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === val
                ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e]'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'listings' ? <FeaturedListingsPanel /> : <AdsPanel />}
    </div>
  );
}

// ── Featured Listings panel ────────────────────────────────────────────────

function FeaturedListingsPanel() {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [items, setItems]       = useState<FeaturedListing[]>([]);
  const [acting, setActing]     = useState<string | null>(null);

  const fetchFeatured = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/admin/featured')
      .then(r => setItems(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(err => setError(err?.response?.data?.message ?? 'Failed to load featured listings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchFeatured(); }, [fetchFeatured]);

  const unfeature = async (id: string) => {
    setActing(id);
    try {
      await api.patch(`/admin/listings/${id}/featured`, { featured: false });
      setItems(prev => prev.filter(i => i.id !== id));
    } finally {
      setActing(null);
    }
  };

  const fmtPrice = (p: string | number, currency: string) =>
    `${currency ?? 'USD'} ${new Intl.NumberFormat('en-US').format(Number(p))}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-white/40 text-sm">{error}</p>
        <button onClick={fetchFeatured} className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all">
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Star className="w-10 h-10 text-white/15" />
        <p className="text-white/30 text-sm">No listings are currently featured</p>
        <p className="text-white/20 text-xs">Mark listings as featured from the Listings page</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(listing => {
        const cover = listing.images?.[0]?.url;
        const isActing = acting === listing.id;
        const expired = listing.featuredUntil && new Date(listing.featuredUntil) < new Date();

        return (
          <div key={listing.id} className="card-premium p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/[0.05] border border-white/[0.07] overflow-hidden flex-shrink-0 flex items-center justify-center">
                {cover ? (
                  <Image src={cover} alt="" width={48} height={48} className="object-cover w-full h-full" />
                ) : (
                  <ImageOff className="w-4 h-4 text-white/15" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{listing.titleEn || listing.titleKu || 'Untitled'}</p>
                <p className="text-xs text-[var(--gold)] font-bold">{fmtPrice(listing.price, listing.currency)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-white/30">
              <span>{listing.user?.name ?? listing.user?.email ?? '—'}</span>
              {listing.featuredUntil && (
                <span className={cn('flex items-center gap-1', expired && 'text-red-400')}>
                  <Calendar className="w-3 h-3" />
                  {new Date(listing.featuredUntil).toLocaleDateString()}
                </span>
              )}
            </div>
            <button
              onClick={() => unfeature(listing.id)}
              disabled={isActing}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/50 text-xs font-semibold hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-40"
            >
              {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
              Remove from featured
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Banner Ads panel ───────────────────────────────────────────────────────

function AdsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [ads, setAds]         = useState<Ad[]>([]);
  const [acting, setActing]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchAds = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/admin/ads')
      .then(r => setAds(r.data?.data ?? []))
      .catch(err => setError(err?.response?.data?.message ?? 'Failed to load ads'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const toggleActive = async (ad: Ad) => {
    setActing(ad.id);
    try {
      await api.patch(`/admin/ads/${ad.id}`, { active: !ad.isActive });
      setAds(prev => prev.map(a => a.id === ad.id ? { ...a, isActive: !a.isActive } : a));
    } finally {
      setActing(null);
    }
  };

  const deleteAd = async (id: string) => {
    setActing(id);
    try {
      await api.delete(`/admin/ads/${id}`);
      setAds(prev => prev.filter(a => a.id !== id));
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e] text-sm font-bold hover:shadow-lg hover:shadow-[rgba(201,168,76,0.2)] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Ad
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-white/40 text-sm">{error}</p>
          <button onClick={fetchAds} className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all">
            Retry
          </button>
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Megaphone className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No ads created yet</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Ad', 'Placement', 'Schedule', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ads.map((ad, i) => {
                const isActing = acting === ad.id;
                return (
                  <tr key={ad.id} className={cn('border-b border-white/[0.05] last:border-0', i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.07] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {ad.imageUrl ? (
                            <Image src={ad.imageUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <ImageOff className="w-4 h-4 text-white/15" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate max-w-[180px]">{ad.title}</p>
                          {ad.linkUrl && (
                            <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer"
                               className="text-[0.68rem] text-white/30 hover:text-[var(--gold)] flex items-center gap-1 truncate max-w-[180px]">
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                              {ad.linkUrl}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[0.68rem] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/[0.06] text-white/50">
                        {ad.placement}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                      {ad.startsAt || ad.endsAt
                        ? `${ad.startsAt ? new Date(ad.startsAt).toLocaleDateString() : '—'} → ${ad.endsAt ? new Date(ad.endsAt).toLocaleDateString() : '—'}`
                        : 'No expiry'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(ad)}
                        disabled={isActing}
                        className={cn(
                          'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all disabled:opacity-40',
                          ad.isActive ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/[0.05] text-white/30',
                        )}
                      >
                        <Power className="w-3 h-3" />
                        {ad.isActive ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteAd(ad.id)}
                        disabled={isActing}
                        className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/40 hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-40"
                        title="Delete ad"
                      >
                        {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CreateAdModal
          onClose={() => setShowForm(false)}
          onCreated={(ad) => { setAds(prev => [ad, ...prev]); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function CreateAdModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ad: Ad) => void }) {
  const [title, setTitle]       = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl]   = useState('');
  const [placement, setPlacement] = useState(PLACEMENTS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!title.trim() || !imageUrl.trim() || !linkUrl.trim()) {
      setError('Title, image URL, and link URL are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/admin/ads', { title, imageUrl, linkUrl, placement });
      onCreated(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create ad');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] border border-white/[0.12] p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">New Banner Ad</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summer sale promo"
                   className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Image URL (https)</label>
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://res.cloudinary.com/…"
                   className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Link URL</label>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…"
                   className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Placement</label>
            <select value={placement} onChange={e => setPlacement(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-white text-sm focus:outline-none focus:border-[rgba(201,168,76,0.4)]">
              {PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e] text-sm font-bold hover:shadow-lg hover:shadow-[rgba(201,168,76,0.2)] transition-all disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Ad
        </button>
      </div>
    </div>
  );
}
