'use client';
// components/shared/Navbar.tsx — UX-Improved: better visual hierarchy, CTA prominence, sticky search

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '@/store/auth.store';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Bell, ChevronDown } from 'lucide-react';

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
                 ${active ? 'text-[#c9a84c]' : 'text-white/65 hover:text-white'}`}
    >
      {label}
      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full
                       bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a]
                       transition-all duration-300
                       ${active ? 'w-4/5' : 'w-0 group-hover:w-4/5'}`} />
    </Link>
  );
}

export function Navbar() {
  const t = useTranslations('common');
  const { user, logout } = useAuthStore();
  const params = useParams();
  const pathname = usePathname();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? '');
  const isRTL = locale === 'ar' || locale === 'ku';
  const router = useRouter();

  // Sell button: always href="/register" for SSR consistency, then redirect on client if logged in
  const handleSell = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMounted && user) {
      router.push(`/${locale}/dashboard/listings`);
    } else {
      router.push(`/${locale}/register`);
    }
  };

  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMounted, setIsMounted]     = useState(false);
  const searchRef   = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setIsMounted(true);
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

  /* Close user menu on outside click */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const navLinks = [
    { href: `/${locale}/cars`,        label: t('cars') },
    { href: `/${locale}/motorcycles`, label: t('motorcycles') },
    { href: `/${locale}/spare-parts`, label: t('spareParts') },
    { href: `/${locale}/dealers`,     label: 'Dealers' },
  ];

  const navBg = scrolled
    ? 'bg-[#070d18]/98 backdrop-blur-2xl shadow-[0_1px_0_rgba(201,168,76,0.15)]'
    : 'bg-[#050b14]/85 backdrop-blur-md';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Skip to main content — keyboard/screen-reader */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999]
                   focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#c9a84c] focus:text-[#050b14]
                   focus:font-bold focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* ══ Top announcement bar ══════════════════════════════════ */}
      <div className="hidden lg:flex items-center justify-center h-8 text-[10px] font-semibold tracking-widest uppercase
                       text-[#c9a84c]/70 bg-[#030710] border-b border-[#c9a84c]/10">
        <span>🏆 Iraq & Gulf's #1 Automotive Marketplace</span>
        <span className="mx-4 text-white/10">|</span>
        <span>24,000+ Listings · 1,200+ Dealers · 8 Cities</span>
      </div>

      {/* ══ Main Navbar ══════════════════════════════════════════ */}
      <nav
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-label="Primary navigation"
        className={`sticky top-0 inset-x-0 z-50 transition-all duration-300 ${navBg}`}
      >
        {/* Gold top accent line */}
        <div className="gold-line h-[2px] w-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[66px] gap-4">

            {/* ── Logo ─────────────────────────────────────────── */}
            <Link
              href={`/${locale}`}
              className="flex-shrink-0 flex items-center gap-2 group"
              aria-label="AutoBazaarPro Home"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-[10px]
                               bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e]
                               shadow-[0_0_16px_rgba(201,168,76,0.40)]
                               transition-all duration-300
                               group-hover:shadow-[0_0_24px_rgba(201,168,76,0.60)]
                               group-hover:scale-[1.06]">
                <CarLogoIcon />
              </span>
              <span className="text-[1.1rem] font-display font-extrabold tracking-tight leading-none">
                <span className="text-[#c9a84c]">Auto</span>
                <span className="text-white">Bazaar</span>
                <span style={{
                  background: 'linear-gradient(135deg,#c9a84c,#f0d278)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>Pro</span>
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
                              group-focus-within:text-[#c9a84c]
                              ${isRTL ? 'right-3' : 'left-3'}`}
                />
                <input
                  type="search"
                  placeholder={t('searchPlaceholder') ?? 'Search cars, motorcycles…'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full h-9 text-sm text-white/85
                              bg-white/[0.07] border border-white/[0.10]
                              rounded-xl placeholder:text-white/30
                              focus:outline-none
                              focus:bg-white/[0.10]
                              focus:border-[#c9a84c]/50
                              focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)]
                              transition-all duration-200
                              ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'}`}
                />
              </div>
            </div>

            {/* ── Right cluster ─────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* Mobile search toggle */}
              <button
                aria-label="Search"
                onClick={() => setSearchOpen(v => !v)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl
                           text-white/50 hover:text-[#c9a84c] hover:bg-white/[0.08]
                           transition-all duration-200"
              >
                {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </button>

              {/* Tools — desktop only */}
              <div className="hidden md:flex items-center gap-1">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {/* Sell CTA — prominent, desktop */}
              <Link
                href={`/${locale}/register`}
                onClick={handleSell}
                className="hidden md:inline-flex items-center gap-1.5 h-8 px-4
                           text-xs font-bold rounded-lg
                           bg-[#c9a84c]/15 border border-[#c9a84c]/35
                           text-[#c9a84c] hover:bg-[#c9a84c]/25 hover:border-[#c9a84c]/60
                           transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Sell
              </Link>

              {/* Auth buttons — desktop */}
              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <div ref={userMenuRef} className="relative">
                    <button
                      onClick={() => setUserMenuOpen(v => !v)}
                      className="flex items-center gap-2 h-8 px-3 rounded-lg
                                 text-xs font-semibold text-white/70 hover:text-white
                                 hover:bg-white/[0.08] transition-all duration-200"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e]
                                      flex items-center justify-center text-[10px] font-black text-[#030710]">
                        {user.name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute top-full right-0 mt-2 w-52 rounded-2xl
                                      bg-[#0b1525] border border-white/[0.08]
                                      shadow-[0_16px_48px_rgba(0,0,0,0.7)]
                                      overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-white/[0.06]">
                          <p className="text-xs font-bold text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-white/35 truncate">{user.email}</p>
                        </div>
                        <div className="p-2 space-y-0.5">
                          <Link href={`/${locale}/dashboard`} onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/65
                                       hover:bg-white/[0.07] hover:text-white transition-all">
                            Dashboard
                          </Link>
                          <Link href={`/${locale}/dashboard/listings`} onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/65
                                       hover:bg-white/[0.07] hover:text-white transition-all">
                            My Listings
                          </Link>
                          <Link href={`/${locale}/dashboard/notifications`} onClick={() => setUserMenuOpen(false)}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-white/65
                                       hover:bg-white/[0.07] hover:text-white transition-all">
                            Notifications
                            <span className="px-1.5 py-0.5 rounded-full bg-[#e94560] text-[9px] font-bold text-white">5</span>
                          </Link>
                        </div>
                        <div className="p-2 border-t border-white/[0.06]">
                          <button
                            onClick={() => { logout(); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                                       text-red-400 hover:bg-red-500/10 transition-all text-left"
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/${locale}/login`}
                      className="inline-flex items-center justify-center h-8 px-4
                                 text-xs font-semibold rounded-lg
                                 border border-white/[0.15] text-white/70
                                 hover:border-[#c9a84c]/50 hover:text-[#c9a84c]
                                 hover:bg-[#c9a84c]/[0.08]
                                 transition-all duration-200"
                    >
                      {t('login')}
                    </Link>
                    <Link
                      href={`/${locale}/register`}
                      className="btn-gold inline-flex h-8 px-4 text-xs rounded-lg"
                    >
                      {t('register')}
                    </Link>
                  </>
                )}
              </div>

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
                                  ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                ref={searchRef}
                type="search"
                aria-label="Search cars, motorcycles and more"
                placeholder={t('searchPlaceholder') ?? 'Search cars, motorcycles…'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full h-10 text-sm text-white bg-white/[0.07] border border-white/10
                            rounded-xl placeholder:text-white/30 focus:outline-none
                            focus:border-[#c9a84c]/40 focus:shadow-[0_0_0_3px_rgba(201,168,76,0.10)]
                            transition-all duration-200
                            ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'}`}
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
                    border-b border-[#c9a84c]/15
                    shadow-[0_8px_40px_rgba(0,0,0,0.60)]
                    transition-all duration-300 ease-in-out
                    ${mobileOpen
                      ? 'top-[68px] opacity-100 pointer-events-auto'
                      : '-top-full opacity-0 pointer-events-none'}`}
      >
        <div className="px-4 py-5 flex flex-col gap-1">
          {/* Sell CTA — mobile prominent */}
          <Link
            href={`/${locale}/register`}
            onClick={(e) => { handleSell(e); setMobileOpen(false); }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl mb-2
                       bg-[#c9a84c]/15 border border-[#c9a84c]/35 text-[#c9a84c]
                       text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            Sell Your Car
          </Link>

          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl
                          text-sm font-semibold transition-all duration-200
                          ${isActive(href)
                            ? 'bg-[#c9a84c]/10 text-[#c9a84c]'
                            : 'text-white/65 hover:text-white hover:bg-white/[0.07]'}
                          ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                                ${isActive(href) ? 'bg-[#c9a84c]' : 'bg-[#c9a84c] opacity-70'}`} />
              {label}
            </Link>
          ))}

          <div className="my-3 border-t border-white/[0.08]" />

          <div className={`flex items-center gap-3 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href={`/${locale}/dashboard`}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center w-full h-11
                             text-sm font-semibold rounded-xl
                             border border-white/[0.12] text-white/70
                             hover:border-[#c9a84c]/40 hover:text-[#c9a84c]
                             transition-all duration-200"
                >
                  {t('dashboard')}
                </Link>
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full h-11 text-sm font-semibold rounded-xl
                             border border-red-500/20 text-red-400 hover:bg-red-500/10
                             transition-all"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center w-full h-11
                             text-sm font-semibold rounded-xl
                             border border-white/[0.12] text-white/70
                             hover:border-[#c9a84c]/40 hover:text-[#c9a84c]
                             transition-all duration-200"
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  onClick={() => setMobileOpen(false)}
                  className="btn-gold inline-flex items-center justify-center w-full h-11
                             text-sm rounded-xl"
                >
                  {t('register')} — It's free
                </Link>
              </>
            )}
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
