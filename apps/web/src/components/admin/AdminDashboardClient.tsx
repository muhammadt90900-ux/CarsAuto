'use client';
// components/admin3/AdminDashboardClient.tsx
// Full interactive admin panel: analytics, users, listings, moderation,
// reports, categories, translations, ads, featured listings, settings + dark mode

import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  LayoutDashboard, Users, Car, ShieldCheck, FileWarning,
  Tag, Languages, Megaphone, Star, Settings, Moon, Sun,
  TrendingUp, CheckCircle2, Clock, AlertTriangle, Search,
  ChevronLeft, ChevronRight, Pencil, Trash2, Ban, Check,
  X, Plus, RefreshCw, Globe, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// ── helpers ───────────────────────────────────────────────────────────────

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

function badge(label: string, variant: 'green' | 'red' | 'yellow' | 'blue' | 'gray') {
  const map = {
    green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    gray:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', map[variant])}>
      {label}
    </span>
  );
}

// ── mock data ─────────────────────────────────────────────────────────────

const CHART_DATA = [
  { label: 'Dec 24', listings: 42, users: 18 },
  { label: 'Jan 25', listings: 61, users: 24 },
  { label: 'Feb 25', listings: 78, users: 31 },
  { label: 'Mar 25', listings: 95, users: 45 },
  { label: 'Apr 25', listings: 112, users: 52 },
  { label: 'May 25', listings: 134, users: 60 },
];

const MOCK_USERS = Array.from({ length: 12 }, (_, i) => ({
  id: `u${i + 1}`,
  name: ['Ahmed Al-Rashid', 'Sara Hassan', 'Omar Khalil', 'Layla Mustafa', 'Karim Nour',
    'Fatima Abbas', 'Yusuf Ibrahim', 'Nadia Salih', 'Hassan Karimi', 'Rana Aziz',
    'Bilal Shaaban', 'Maya Younis'][i],
  email: `user${i + 1}@example.com`,
  role: i === 0 ? 'ADMIN' : 'USER',
  verified: i % 3 !== 0,
  banned: i === 4,
  createdAt: new Date(Date.now() - i * 86400000 * 5).toLocaleDateString(),
}));

const MOCK_LISTINGS = Array.from({ length: 10 }, (_, i) => ({
  id: `l${i + 1}`,
  title: ['2022 Toyota Camry', '2021 BMW 3 Series', '2020 Ford Explorer', '2019 Hyundai Elantra',
    '2023 KIA Sportage', '2018 Nissan Altima', '2022 Chevrolet Tahoe', '2021 Audi A4',
    '2020 Honda Accord', '2019 Mercedes C-Class'][i],
  user: { name: MOCK_USERS[i % MOCK_USERS.length].name },
  status: ['PENDING', 'ACTIVE', 'PENDING', 'REJECTED', 'ACTIVE', 'PENDING', 'ACTIVE', 'PENDING', 'ACTIVE', 'ACTIVE'][i],
  category: { name: 'Sedan' },
  createdAt: new Date(Date.now() - i * 86400000 * 2).toLocaleDateString(),
  featured: i % 4 === 0,
}));

const MOCK_REPORTS = Array.from({ length: 6 }, (_, i) => ({
  id: `r${i + 1}`,
  reason: ['Spam listing', 'Fraudulent content', 'Wrong category', 'Price manipulation', 'Duplicate post', 'Offensive images'][i],
  reporter: { name: MOCK_USERS[i].name },
  listing: { title: MOCK_LISTINGS[i]?.title ?? 'Unknown' },
  createdAt: new Date(Date.now() - i * 86400000).toLocaleDateString(),
}));

const MOCK_CATEGORIES = [
  { id: 'c1', name: 'Sedans', slug: 'sedans', icon: '🚗', order: 1, _count: { listings: 134 } },
  { id: 'c2', name: 'SUVs', slug: 'suvs', icon: '🚙', order: 2, _count: { listings: 98 } },
  { id: 'c3', name: 'Trucks', slug: 'trucks', icon: '🛻', order: 3, _count: { listings: 67 } },
  { id: 'c4', name: 'Vans', slug: 'vans', icon: '🚐', order: 4, _count: { listings: 41 } },
  { id: 'c5', name: 'Motorcycles', slug: 'motorcycles', icon: '🏍️', order: 5, _count: { listings: 29 } },
];

const MOCK_TRANSLATIONS = [
  { id: 't1', locale: 'ku', key: 'nav.home', value: 'سەرەتا' },
  { id: 't2', locale: 'ku', key: 'nav.listings', value: 'ئۆتۆمبێلەکان' },
  { id: 't3', locale: 'ar', key: 'nav.home', value: 'الرئيسية' },
  { id: 't4', locale: 'ar', key: 'nav.listings', value: 'الإعلانات' },
  { id: 't5', locale: 'en', key: 'nav.home', value: 'Home' },
  { id: 't6', locale: 'en', key: 'nav.listings', value: 'Listings' },
];

const MOCK_ADS = [
  { id: 'a1', title: 'Summer Sale Banner', placement: 'HOMEPAGE_HERO', active: true, startsAt: '2025-06-01', endsAt: '2025-06-30' },
  { id: 'a2', title: 'Sidebar Insurance Ad', placement: 'SIDEBAR', active: true, startsAt: '2025-05-01', endsAt: '2025-07-01' },
  { id: 'a3', title: 'Footer Promo', placement: 'FOOTER', active: false, startsAt: '2025-04-01', endsAt: '2025-05-01' },
];

const MOCK_SETTINGS = [
  { key: 'site_name', value: 'AutoBazaarPro' },
  { key: 'contact_email', value: 'admin@autobazaar.pro' },
  { key: 'listings_per_page', value: '20' },
  { key: 'require_approval', value: 'true' },
  { key: 'max_images_per_listing', value: '12' },
  { key: 'featured_price_usd', value: '9.99' },
];

// ── tiny components ───────────────────────────────────────────────────────

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-white dark:bg-[#0e1726] border border-slate-200 dark:border-white/[0.06] p-5 shadow-sm', className)}>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <Card className="flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-white/30 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', size = 'md', className }: {
  children: ReactNode; onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
}) {
  const v = {
    primary: 'bg-[#c9a84c] hover:bg-[#b8932e] text-white',
    secondary: 'bg-slate-100 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-700 dark:text-white/70',
    danger: 'bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400',
    ghost: 'hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-600 dark:text-white/50',
  };
  const s = { sm: 'px-3 py-1.5 text-xs rounded-lg', md: 'px-4 py-2 text-sm rounded-xl' };
  return (
    <button onClick={onClick} className={cn('inline-flex items-center gap-1.5 font-medium transition-all', v[variant], s[size], className)}>
      {children}
    </button>
  );
}

function Input({ placeholder, value, onChange, className }: { placeholder?: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0e1726] px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#c9a84c]/40 w-full',
        className,
      )}
    />
  );
}

// ── sections ──────────────────────────────────────────────────────────────

function AnalyticsSection() {
  return (
    <div>
      <SectionHeader title="Analytics" subtitle="Platform performance over the last 6 months" />
      <div className="grid grid-cols-2 gap-5 mb-6">
        <Card>
          <p className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-4">Listings Over Time</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#0e1726', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
              <Bar dataKey="listings" fill="#c9a84c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-4">User Registrations</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#0e1726', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
              <Line type="monotone" dataKey="users" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function UsersSection() {
  const [search, setSearch] = useState('');
  const filtered = MOCK_USERS.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search),
  );
  return (
    <div>
      <SectionHeader title="Users Management" subtitle={`${MOCK_USERS.length} registered users`} />
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0e1726] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#c9a84c]/40"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                {['Name', 'Email', 'Role', 'Verified', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-50 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{u.name}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-white/40">{u.email}</td>
                  <td className="py-2.5 px-3">{badge(u.role, u.role === 'ADMIN' ? 'blue' : 'gray')}</td>
                  <td className="py-2.5 px-3">{u.verified ? badge('Verified', 'green') : badge('Unverified', 'yellow')}</td>
                  <td className="py-2.5 px-3">{u.banned ? badge('Banned', 'red') : badge('Active', 'green')}</td>
                  <td className="py-2.5 px-3 text-slate-400 dark:text-white/30 text-xs">{u.createdAt}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <Btn size="sm" variant={u.banned ? 'secondary' : 'danger'}>
                        <Ban className="w-3 h-3" />{u.banned ? 'Unban' : 'Ban'}
                      </Btn>
                      <Btn size="sm" variant="ghost"><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ListingsSection() {
  const [tab, setTab] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'REJECTED'>('ALL');
  const filtered = tab === 'ALL' ? MOCK_LISTINGS : MOCK_LISTINGS.filter(l => l.status === tab);
  const statusColor: Record<string, 'green' | 'yellow' | 'red'> = { ACTIVE: 'green', PENDING: 'yellow', REJECTED: 'red' };
  return (
    <div>
      <SectionHeader title="Listings Management" subtitle="Manage all vehicle listings" />
      <div className="flex gap-2 mb-4">
        {(['ALL', 'PENDING', 'ACTIVE', 'REJECTED'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              tab === t ? 'bg-[#c9a84c] text-white' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/[0.1]')}>
            {t}
          </button>
        ))}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                {['Title', 'Seller', 'Category', 'Status', 'Featured', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-b border-slate-50 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{l.title}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-white/40">{l.user.name}</td>
                  <td className="py-2.5 px-3 text-slate-400 dark:text-white/30 text-xs">{l.category.name}</td>
                  <td className="py-2.5 px-3">{badge(l.status, statusColor[l.status] ?? 'gray')}</td>
                  <td className="py-2.5 px-3">{l.featured ? badge('⭐ Featured', 'yellow') : <span className="text-slate-300 dark:text-white/20 text-xs">—</span>}</td>
                  <td className="py-2.5 px-3 text-slate-400 dark:text-white/30 text-xs">{l.createdAt}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      {l.status === 'PENDING' && (
                        <>
                          <Btn size="sm" variant="primary"><Check className="w-3 h-3" />Approve</Btn>
                          <Btn size="sm" variant="danger"><X className="w-3 h-3" />Reject</Btn>
                        </>
                      )}
                      <Btn size="sm" variant="ghost"><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FeaturedSection() {
  const featured = MOCK_LISTINGS.filter(l => l.featured);
  return (
    <div>
      <SectionHeader title="Featured Listings" subtitle="Manage promoted listings" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {featured.map(l => (
          <Card key={l.id} className="flex flex-col gap-3">
            <div className="h-28 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/10 flex items-center justify-center">
              <Car className="w-10 h-10 text-amber-400" />
            </div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{l.title}</p>
            <p className="text-xs text-slate-400 dark:text-white/30">{l.user.name}</p>
            <div className="flex gap-2 mt-auto">
              <Btn size="sm" variant="danger" className="flex-1"><X className="w-3 h-3" />Remove</Btn>
            </div>
          </Card>
        ))}
        <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-slate-300 dark:border-white/[0.1] cursor-pointer hover:border-[#c9a84c] transition-colors min-h-[160px]">
          <Plus className="w-6 h-6 text-slate-400 dark:text-white/30" />
          <span className="text-sm text-slate-400 dark:text-white/30">Add Featured</span>
        </Card>
      </div>
    </div>
  );
}

function ModerationSection() {
  return (
    <div>
      <SectionHeader title="Content Moderation" subtitle="Review and moderate platform content" />
      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          { label: 'Pending Review', value: 8, color: 'bg-amber-500', icon: Clock },
          { label: 'Approved Today', value: 24, color: 'bg-emerald-500', icon: CheckCircle2 },
          { label: 'Rejected Today', value: 3, color: 'bg-red-500', icon: X },
        ].map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />
        ))}
      </div>
      <Card>
        <p className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-4">Pending Listings</p>
        <div className="space-y-3">
          {MOCK_LISTINGS.filter(l => l.status === 'PENDING').map(l => (
            <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">{l.title}</p>
                <p className="text-xs text-slate-400 dark:text-white/30">by {l.user.name} · {l.createdAt}</p>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="primary"><Check className="w-3 h-3" />Approve</Btn>
                <Btn size="sm" variant="danger"><X className="w-3 h-3" />Reject</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ReportsSection() {
  return (
    <div>
      <SectionHeader title="Reports Management" subtitle={`${MOCK_REPORTS.length} pending reports`} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                {['Reason', 'Reported By', 'Listing', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_REPORTS.map(r => (
                <tr key={r.id} className="border-b border-slate-50 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.reason}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-white/40">{r.reporter.name}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-white/40">{r.listing.title}</td>
                  <td className="py-2.5 px-3 text-slate-400 dark:text-white/30 text-xs">{r.createdAt}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <Btn size="sm" variant="primary"><Check className="w-3 h-3" />Resolve</Btn>
                      <Btn size="sm" variant="secondary"><X className="w-3 h-3" />Dismiss</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CategoriesSection() {
  const [cats, setCats] = useState(MOCK_CATEGORIES);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  return (
    <div>
      <SectionHeader title="Categories Management" subtitle="Organize listing categories" />
      <Card>
        <div className="flex justify-end mb-4">
          <Btn onClick={() => setAdding(a => !a)}><Plus className="w-4 h-4" />Add Category</Btn>
        </div>
        {adding && (
          <div className="flex gap-2 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
            <Input placeholder="Category name" value={newName} onChange={setNewName} className="flex-1" />
            <Input placeholder="slug" value={newSlug} onChange={setNewSlug} className="w-40" />
            <Btn onClick={() => { setCats(c => [...c, { id: `c${Date.now()}`, name: newName, slug: newSlug, icon: '📦', order: c.length + 1, _count: { listings: 0 } }]); setAdding(false); setNewName(''); setNewSlug(''); }}>
              <Check className="w-4 h-4" />Save
            </Btn>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                {['Icon', 'Name', 'Slug', 'Order', 'Listings', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cats.map(cat => (
                <tr key={cat.id} className="border-b border-slate-50 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 text-xl">{cat.icon}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{cat.name}</td>
                  <td className="py-2.5 px-3 text-slate-400 dark:text-white/30 font-mono text-xs">{cat.slug}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-white/40">{cat.order}</td>
                  <td className="py-2.5 px-3">{badge(String(cat._count.listings), 'blue')}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <Btn size="sm" variant="ghost"><Pencil className="w-3 h-3" /></Btn>
                      <Btn size="sm" variant="danger" onClick={() => setCats(c => c.filter(x => x.id !== cat.id))}>
                        <Trash2 className="w-3 h-3" />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TranslationsSection() {
  const [locale, setLocale] = useState<'ku' | 'ar' | 'en'>('ku');
  const filtered = MOCK_TRANSLATIONS.filter(t => t.locale === locale);
  return (
    <div>
      <SectionHeader title="Translations" subtitle="Manage multilingual content" />
      <div className="flex gap-2 mb-4">
        {(['ku', 'ar', 'en'] as const).map(l => (
          <button key={l} onClick={() => setLocale(l)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
              locale === l ? 'bg-[#c9a84c] text-white' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/50')}>
            {l === 'ku' ? '🇮🇶 Kurdish' : l === 'ar' ? '🇸🇦 Arabic' : '🇬🇧 English'}
          </button>
        ))}
      </div>
      <Card>
        <div className="flex justify-end mb-3">
          <Btn size="sm"><Plus className="w-3 h-3" />Add Key</Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                {['Key', 'Translation', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/30 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-slate-50 dark:border-white/[0.03]">
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-500 dark:text-white/40">{t.key}</td>
                  <td className="py-2.5 px-3 text-slate-900 dark:text-white" dir={locale === 'en' ? 'ltr' : 'rtl'}>{t.value}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <Btn size="sm" variant="ghost"><Pencil className="w-3 h-3" /></Btn>
                      <Btn size="sm" variant="danger"><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AdsSection() {
  const placementColor: Record<string, 'blue' | 'green' | 'yellow'> = {
    HOMEPAGE_HERO: 'blue', SIDEBAR: 'green', FOOTER: 'yellow',
  };
  return (
    <div>
      <SectionHeader title="Ads Management" subtitle="Control advertising placements" />
      <div className="flex justify-end mb-4">
        <Btn><Plus className="w-4 h-4" />New Ad</Btn>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {MOCK_ADS.map(ad => (
          <Card key={ad.id} className="flex flex-col gap-3">
            <div className="h-20 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-800/10 flex items-center justify-center">
              <Megaphone className="w-8 h-8 text-blue-400" />
            </div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{ad.title}</p>
            <div className="flex items-center gap-2">
              {badge(ad.placement, placementColor[ad.placement] ?? 'gray')}
              {badge(ad.active ? 'Active' : 'Inactive', ad.active ? 'green' : 'gray')}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-white/30">{ad.startsAt} → {ad.endsAt}</p>
            <div className="flex gap-2 mt-auto">
              <Btn size="sm" variant="secondary" className="flex-1"><Pencil className="w-3 h-3" />Edit</Btn>
              <Btn size="sm" variant="danger"><Trash2 className="w-3 h-3" /></Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsSection({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const [settings, setSettings] = useState(MOCK_SETTINGS);

  const update = (key: string, value: string) =>
    setSettings(s => s.map(x => x.key === key ? { ...x, value } : x));

  return (
    <div>
      <SectionHeader title="System Settings" subtitle="Configure global platform settings" />
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <p className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-4">General</p>
          <div className="space-y-3">
            {settings.map(s => (
              <div key={s.key} className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 dark:text-white/40 font-medium">{s.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
                <Input value={s.value} onChange={v => update(s.key, v)} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Btn><Check className="w-4 h-4" />Save Settings</Btn>
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-4">Appearance</p>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              {dark ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-slate-400 dark:text-white/30">Switch between light and dark</p>
              </div>
            </div>
            <button onClick={() => setDark(!dark)} className="focus:outline-none">
              {dark
                ? <ToggleRight className="w-8 h-8 text-[#c9a84c]" />
                : <ToggleLeft className="w-8 h-8 text-slate-400" />
              }
            </button>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
            <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide mb-3">Accent Color</p>
            <div className="flex gap-2">
              {['#c9a84c', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'].map(c => (
                <button key={c} style={{ background: c }}
                  className="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-transparent hover:ring-current transition-all"
                />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────

type Section = 'dashboard' | 'analytics' | 'users' | 'listings' | 'featured' | 'moderation' | 'reports' | 'categories' | 'translations' | 'ads' | 'settings';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'analytics',   label: 'Analytics',    icon: TrendingUp      },
  { id: 'users',       label: 'Users',        icon: Users           },
  { id: 'listings',    label: 'Listings',     icon: Car             },
  { id: 'featured',    label: 'Featured',     icon: Star            },
  { id: 'moderation',  label: 'Moderation',   icon: ShieldCheck     },
  { id: 'reports',     label: 'Reports',      icon: FileWarning     },
  { id: 'categories',  label: 'Categories',   icon: Tag             },
  { id: 'translations',label: 'Translations', icon: Languages       },
  { id: 'ads',         label: 'Ads',          icon: Megaphone       },
  { id: 'settings',    label: 'Settings',     icon: Settings        },
] as const;

export function AdminDashboardClient() {
  const [dark, setDark] = useState(true);
  const [section, setSection] = useState<Section>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className={cn(dark ? 'dark' : '', 'min-h-screen bg-slate-50 dark:bg-[#060d19] font-sans antialiased flex transition-colors duration-300')}>
      {/* Sidebar */}
      <aside className={cn(
        'flex-shrink-0 flex flex-col transition-all duration-300 bg-white dark:bg-[#080f1c] border-r border-slate-200 dark:border-white/[0.06]',
        collapsed ? 'w-16' : 'w-60',
      )}>
        {/* Logo */}
        <div className={cn('flex items-center gap-3 p-4 border-b border-slate-100 dark:border-white/[0.06]', collapsed && 'justify-center')}>
          <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}>
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                AutoBazaar<span className="text-[#c9a84c]">Pro</span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-white/30">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button key={id} onClick={() => setSection(id as Section)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  collapsed ? 'justify-center' : '',
                  active
                    ? 'bg-[#c9a84c]/[0.12] text-[#c9a84c]'
                    : 'text-slate-600 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white',
                )}>
                <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-[#c9a84c]' : 'text-slate-400 dark:text-white/30')} />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center p-3 m-2 rounded-xl text-slate-400 dark:text-white/30 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#080f1c]">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 dark:text-white/30">Admin</span>
            <span className="text-slate-300 dark:text-white/20">/</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{section}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDark(d => !d)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e] flex items-center justify-center text-white text-xs font-bold">A</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {section === 'dashboard' && (
            <div>
              <SectionHeader title="Dashboard" subtitle="Welcome back — here's what's happening" />
              <div className="grid grid-cols-4 gap-5 mb-6">
                <StatCard label="Total Users" value="1,284" icon={Users} color="bg-blue-500" sub="+12 this week" />
                <StatCard label="Active Listings" value="3,671" icon={Car} color="bg-emerald-500" sub="89% approval rate" />
                <StatCard label="Pending Review" value="42" icon={Clock} color="bg-amber-500" sub="Needs attention" />
                <StatCard label="Open Reports" value="18" icon={AlertTriangle} color="bg-red-500" sub="3 critical" />
              </div>
              <AnalyticsSection />
            </div>
          )}
          {section === 'analytics'    && <AnalyticsSection />}
          {section === 'users'        && <UsersSection />}
          {section === 'listings'     && <ListingsSection />}
          {section === 'featured'     && <FeaturedSection />}
          {section === 'moderation'   && <ModerationSection />}
          {section === 'reports'      && <ReportsSection />}
          {section === 'categories'   && <CategoriesSection />}
          {section === 'translations' && <TranslationsSection />}
          {section === 'ads'          && <AdsSection />}
          {section === 'settings'     && <SettingsSection dark={dark} setDark={setDark} />}
        </main>
      </div>
    </div>
  );
}
