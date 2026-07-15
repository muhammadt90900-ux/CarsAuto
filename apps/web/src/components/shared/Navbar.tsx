'use client';
// components/shared/Navbar.tsx

import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '@/store/auth.store';
import { Link, usePathname } from '@/i18n/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, ChevronDown, Globe } from 'lucide-react';

/* ── Logo SVG ────────────────────────────────────────────────── */
const CarLogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92" />
    <circle cx="6.5" cy="15" r="2" fill="white" />
    <circle cx="13.5" cy="15" r="2" fill="white" />
    <path d="M6 6.5L7.5 3H12.5L14 6.5" stroke="white" strokeWidth="1" opacity=".5" />
  </svg>
);

/* ── NavLink ─────────────────────────────────────────────────── */
function NavLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative px-3 py-2 text-[0.78rem] font-semibold tracking-[0.08em] uppercase
                 transition-colors duration-200 group
                 ${active ? 'text-gold' : 'text-white/65 hover:text-white'}`}
    >
      {label}
      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full
                       bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)]
                       transition-all duration-300
                       ${active ? 'w-4/5' : 'w-0 group-hover:w-4/5'}`} />
    </Link>
  );
}

/* ── Auth Section (isolated to prevent hydration mismatch) ───── */
// Renders placeholder on server + first client render, then swaps to real auth UI.
function AuthSection() {
  const t = useTranslations('common');
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Before mount: always render guest buttons — matches server output exactly
  if (!mounted || !user) {
    return (
      <div className="hidden md:flex items-center gap-2">
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-8 px-4
                     text-xs font-semibold rounded-lg
                     border border-white/[0.15] text-white/70
                     hover:border-gold/50 hover:text-gold
                     hover:bg-gold/[0.08] transition-all duration-200"
        >
          {t('login')}
        </Link>
        <Link
          href="/register"
          className="btn-gold inline-flex h-8 px-4 text-xs rounded-lg"
        >
          {t('register')}
        </Link>
      </div>
    );
  }

  // After mount with user: render user menu
  return (
    <div ref={userMenuRef} className="relative hidden md:block">
      <button
        onClick={() => setUserMenuOpen(v => !v)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg
                   text-xs font-semibold text-white/70 hover:text-white
                   hover:bg-white/[0.08] transition-all duration-200"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--gold)] to-[#9e6e1e]
                        flex items-center justify-center text-[10px] font-black text-[#030710]">
          {user.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {userMenuOpen && (
        <div className="absolute top-full end-0 mt-2 w-52 rounded-2xl
                        bg-[var(--ink-750)] border border-white/[0.08]
                        shadow-[0_16px_48px_rgba(0,0,0,0.7)]
                        overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-white/35 truncate">{user.email}</p>
          </div>
          <div className="p-2 space-y-0.5">
            <Link
              href="/dashboard"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/65
                         hover:bg-white/[0.07] hover:text-white transition-all"
            >
              {t('dashboard')}
            </Link>
            <Link
              href="/dashboard/listings"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/65
                         hover:bg-white/[0.07] hover:text-white transition-all"
            >
              {t('myListings')}
            </Link>
            <Link
              href="/dashboard/notifications"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/65
                         hover:bg-white/[0.07] hover:text-white transition-all"
            >
              {t('notifications')}
            </Link>
          </div>
          <div className="p-2 border-t border-white/[0.06]">
            <button
              onClick={() => { logout(); setUserMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                         text-red-400 hover:bg-red-500/10 transition-all text-start"
            >
              {t('signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mobile Auth Section ─────────────────────────────────────── */
function MobileAuthSection({ onClose }: { onClose: () => void }) {
  const t = useTranslations('common');
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) {
    return (
      <>
        <Link
          href="/login"
          onClick={onClose}
          className="inline-flex items-center justify-center w-full h-11
                     text-sm font-semibold rounded-xl
                     border border-white/[0.12] text-white/70
                     hover:border-gold/40 hover:text-gold
                     transition-all duration-200"
        >
          {t('login')}
        </Link>
        <Link
          href="/register"
          onClick={onClose}
          className="btn-gold inline-flex items-center justify-center w-full h-11
                     text-sm rounded-xl"
        >
          {t('register')} — It's free
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onClose}
        className="inline-flex items-center justify-center w-full h-11
                   text-sm font-semibold rounded-xl
                   border border-white/[0.12] text-white/70
                   hover:border-gold/40 hover:text-gold
                   transition-all duration-200"
      >
        {t('dashboard')}
      </Link>
      <button
        onClick={() => { logout(); onClose(); }}
        className="w-full h-11 text-sm font-semibold rounded-xl
                   border border-red-500/20 text-red-400 hover:bg-red-500/10
                   transition-all"
      >
        {t('signOut')}
      </button>
    </>
  );
}

/* ── Country Switcher ────────────────────────────────────────── */
const COUNTRIES = [
  { code: 'KRI', flag: '🏔️', name: 'Kurdistan', nameKu: 'کوردستان', cities: 'Erbil · Sulaymaniyah · Duhok' },
  { code: 'IQ',  flag: '🇮🇶', name: 'Iraq',      nameKu: 'عێراق',    cities: 'Baghdad · Basra · Mosul' },
  { code: 'AE',  flag: '🇦🇪', name: 'UAE',       nameKu: 'ئیماڕات',  cities: 'Dubai · Sharjah · Abu Dhabi' },
  { code: 'CN',  flag: '🇨🇳', name: 'China',     nameKu: 'چین',      cities: 'Import & Export' },
] as const;

function CountrySwitcher() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof COUNTRIES[number]>(COUNTRIES[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg
                   text-xs font-semibold
                   border border-white/[0.10] text-white/55
                   hover:border-[rgba(201,168,76,0.4)] hover:text-[var(--gold)]
                   hover:bg-[rgba(201,168,76,0.06)] transition-all duration-200"
        aria-label="Select country"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="hidden lg:inline text-[11px]">{selected.code}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select region"
          className="absolute top-full end-0 mt-2 w-52 rounded-xl overflow-hidden z-50
                     bg-[#060d1a]/99 backdrop-blur-2xl
                     border border-[rgba(201,168,76,0.15)]
                     shadow-[0_20px_56px_rgba(0,0,0,0.80),0_0_0_1px_rgba(201,168,76,0.06)]"
        >
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25 font-black flex items-center gap-1.5">
              <Globe className="w-3 h-3" />Select Region
            </p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {COUNTRIES.map(country => (
              <button
                key={country.code}
                role="option"
                aria-selected={selected.code === country.code}
                onClick={() => { setSelected(country); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-start
                            transition-all duration-150
                            ${selected.code === country.code
                              ? 'bg-[var(--gold-subtle)] text-[var(--gold)]'
                              : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                            }`}
              >
                <span className="text-xl leading-none flex-shrink-0">{country.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold leading-none mb-0.5">{country.name}</div>
                  <div className="text-[10px] opacity-40 truncate">{country.cities}</div>
                </div>
                {selected.code === country.code && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────── */
interface NavbarProps {
  locale: string;
}

export function Navbar({ locale }: NavbarProps) {
  const t = useTranslations('common');
  const pathname = usePathname();
  const isRTL = locale === 'ar' || locale === 'ku';

  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [navMounted, setNavMounted]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  // Read auth store for role-based Sell CTA visibility
  const navUser = useAuthStore((s) => s.user);

  useEffect(() => {
    setNavMounted(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const id = requestAnimationFrame(() => {
        if (mountedRef.current) searchRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [searchOpen]);

  useEffect(() => {
    const close = () => { if (mountedRef.current) setMobileOpen(false); };
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  // Always /sell — proxy.ts redirects logged-in users from /sell to dashboard
  const sellHref = '/sell';

  const navLinks = [
    { href: '/cars',        label: t('cars') },
    { href: '/motorcycles', label: t('motorcycles') },
    { href: '/spare-parts', label: t('spareParts') },
    { href: '/accessories', label: t('accessories') },
    { href: '/services',    label: t('services') },
    { href: '/dealers',     label: t('dealers') },
  ];

  const navBg = scrolled
    ? 'bg-[rgba(6,12,24,0.98)] backdrop-blur-[28px] saturate-150 shadow-[0_1px_0_rgba(201,168,76,0.18),0_4px_20px_rgba(0,0,0,0.35)]'
    : 'bg-[rgba(5,11,20,0.85)] backdrop-blur-md';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999]
                   focus:px-4 focus:py-2 focus:rounded-xl focus:bg-gold focus:text-[var(--ink-900)]
                   focus:font-bold focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* ══ Top announcement bar ══════════════════════════════════ */}
      <div className="hidden lg:flex items-center justify-center h-8 text-[10px] font-semibold tracking-widest uppercase
                       text-gold/70 bg-[#030710] border-b border-gold/10">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="text-gold">🏆</span>
            <span>Iraq & Gulf&apos;s #1 Automotive Marketplace</span>
          </span>
          <span className="text-white/10">|</span>
          <span>24,000+ Listings · 1,200+ Dealers</span>
          <span className="text-white/10">|</span>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1 text-white/50 hover:text-gold transition-colors cursor-pointer">
              <span>🇮🇶</span><span className="text-white/30">Iraq</span>
            </span>
            <span className="text-white/15">·</span>
            <span className="flex items-center gap-1 text-white/50 hover:text-gold transition-colors cursor-pointer">
              <span>🇦🇪</span><span className="text-white/30">UAE</span>
            </span>
            <span className="text-white/15">·</span>
            <span className="flex items-center gap-1 text-white/50 hover:text-gold transition-colors cursor-pointer">
              <span>🇨🇳</span><span className="text-white/30">China</span>
            </span>
          </div>
        </div>
      </div>

      {/* ══ Main Navbar ══════════════════════════════════════════ */}
      <nav
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-label="Primary navigation"
        className={`sticky top-0 inset-x-0 z-50 transition-all duration-300 ${navBg}`}
      >
        <div className="gold-line h-[2px] w-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[66px] gap-4">

            {/* ── Logo ─────────────────────────────────────────── */}
            <Link
              href="/"
              className="flex-shrink-0 flex items-center gap-2 group"
              aria-label="CarsAuto Home"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-[10px]
                               overflow-hidden
                               shadow-[0_0_16px_rgba(201,168,76,0.40)]
                               transition-all duration-300
                               group-hover:shadow-[0_0_24px_rgba(201,168,76,0.60)]
                               group-hover:scale-[1.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-96x96.png" alt="CarsAuto" className="w-full h-full object-cover" />
              </span>
              <span className="text-[1.1rem] font-display font-extrabold tracking-tight leading-none">
                <span className="text-gold">Cars</span>
                <span className="text-white">Auto</span>
              </span>
            </Link>

            {/* ── Desktop nav links ─────────────────────────────── */}
            <div className="hidden md:flex items-center">
              {navLinks.map(l => (
                <NavLink key={l.href} {...l} active={isActive(l.href)} />
              ))}
            </div>

            {/* ── Desktop search ───────────────────────────────── */}
            <div className="hidden lg:flex flex-1 max-w-sm xl:max-w-md">
              <div className="relative w-full group">
                <Search
                  className={`absolute top-1/2 -translate-y-1/2 w-[15px] h-[15px]
                              text-white/35 transition-colors duration-200
                              group-focus-within:text-gold
                              start-3`}
                />
                <input
                  type="search"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full h-9 text-sm text-white/85
                              bg-white/[0.07] border border-white/[0.10]
                              rounded-xl placeholder:text-white/30
                              focus:outline-none focus:bg-white/[0.10]
                              focus:border-gold/50
                              focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)]
                              transition-all duration-200
                              ps-9 pe-3 text-start`}
                />
              </div>
            </div>

            {/* ── Right cluster ─────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-shrink-0">

              <button
                aria-label="Search"
                onClick={() => setSearchOpen(v => !v)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl
                           text-white/50 hover:text-gold hover:bg-white/[0.08]
                           transition-all duration-200"
              >
                {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </button>

              <CountrySwitcher />
              <div className="hidden md:flex items-center gap-1">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {/* Sell CTA — hidden for USER (buyer) role */}
              {(!navMounted || !navUser || navUser.role !== 'USER') && (
                <Link
                  href={sellHref}
                  className="hidden md:inline-flex items-center gap-1.5 h-8 px-4
                             text-xs font-bold rounded-lg
                             bg-gold/15 border border-gold/35
                             text-gold hover:bg-gold/25 hover:border-gold/60
                             transition-all duration-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('sellYourCar')}
                </Link>
              )}

              {/* Auth — isolated component, no SSR mismatch */}
              <AuthSection />

              {/* Mobile hamburger */}
              <button
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-menu"
                onClick={() => setMobileOpen(v => !v)}
                className="md:hidden flex flex-col justify-center items-center
                           w-9 h-9 gap-[5px] rounded-xl
                           hover:bg-white/[0.08] transition-colors duration-200"
              >
                <span className={`block w-[18px] h-[1.5px] bg-white/75 rounded-full
                                  transition-all duration-300 origin-center
                                  ${mobileOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
                <span className={`block w-[18px] h-[1.5px] bg-white/75 rounded-full
                                  transition-all duration-200
                                  ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} />
                <span className={`block w-[18px] h-[1.5px] bg-white/75 rounded-full
                                  transition-all duration-300 origin-center
                                  ${mobileOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile expandable search ─────────────────────────── */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out
                         ${searchOpen ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-3 pt-1 border-t border-white/[0.07]">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-white/35
                                  start-3`} />
              <input
                ref={searchRef}
                type="search"
                aria-label="Search cars, motorcycles and more"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full h-10 text-sm text-white bg-white/[0.07] border border-white/10
                            rounded-xl placeholder:text-white/30 focus:outline-none
                            focus:border-gold/40 focus:shadow-[0_0_0_3px_rgba(201,168,76,0.10)]
                            transition-all duration-200
                            ps-9 pe-3 text-start`}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* ══ Mobile slide-down menu ═══════════════════════════════ */}
      <div
        id="mobile-nav-menu"
        aria-label="Mobile navigation"
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`fixed inset-x-0 z-40 md:hidden
                    bg-[#070d18]/98 backdrop-blur-2xl
                    border-b border-gold/15
                    shadow-[0_8px_40px_rgba(0,0,0,0.60)]
                    transition-all duration-300 ease-in-out
                    ${mobileOpen
                      ? 'top-[68px] opacity-100 pointer-events-auto'
                      : '-top-full opacity-0 pointer-events-none'}`}
      >
        <div className="px-4 py-5 flex flex-col gap-1">
          {/* Mobile Sell CTA — hidden for USER (buyer) role */}
          {(!navMounted || !navUser || navUser.role !== 'USER') && (
            <Link
              href={sellHref}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl mb-2
                         bg-gold/15 border border-gold/35 text-gold
                         text-sm font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('sellYourCar')}
            </Link>
          )}

          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl
                          text-sm font-semibold transition-all duration-200
                          ${isActive(href)
                            ? 'bg-gold/10 text-gold'
                            : 'text-white/65 hover:text-white hover:bg-white/[0.07]'}
                          ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                                ${isActive(href) ? 'bg-gold' : 'bg-gold opacity-70'}`} />
              {label}
            </Link>
          ))}

          <div className="my-3 border-t border-white/[0.08]" />

          <div className={`flex items-center gap-3 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <MobileAuthSection onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      </div>

      {/* ══ Mobile backdrop ══════════════════════════════════════ */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-30 md:hidden bg-black/50 backdrop-blur-sm
                    transition-opacity duration-300 ease-in-out
                    ${mobileOpen
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none'}`}
      />
    </>
  );
}
