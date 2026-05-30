'use client';
// components/shared/Navbar.tsx
// Redesigned — Unified Premium Design System (Gold / Midnight Navy)

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '@/store/auth.store';
import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

/* ── Logo SVG ────────────────────────────────────────────────── */
const CarLogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92" />
    <circle cx="6.5" cy="15" r="2" fill="white" />
    <circle cx="13.5" cy="15" r="2" fill="white" />
    <path d="M6 6.5L7.5 3H12.5L14 6.5" stroke="white" strokeWidth="1" opacity=".5" />
  </svg>
);

/* ── NavLink with gold underline animation ───────────────────── */
function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="relative px-3 py-2 text-[0.78rem] font-semibold tracking-[0.08em] uppercase
                 text-white/65 hover:text-white transition-colors duration-200 group"
    >
      {label}
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] rounded-full
                       bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a]
                       transition-all duration-300 group-hover:w-4/5" />
    </Link>
  );
}

export function Navbar() {
  const t = useTranslations('common');
  const { user, logout } = useAuthStore();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? '');
  const isRTL = locale === 'ar' || locale === 'ku';

  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [scrolled,   setScrolled]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef   = useRef<HTMLInputElement>(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* Scroll listener — reveals opaque bg after 60px */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Focus search input after drawer opens */
  useEffect(() => {
    if (searchOpen) {
      const id = requestAnimationFrame(() => {
        if (mountedRef.current) searchRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [searchOpen]);

  /* Close mobile menu on resize */
  useEffect(() => {
    const close = () => { if (mountedRef.current) setMobileOpen(false); };
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const navLinks = [
    { href: `/${locale}/cars`,        label: t('cars') },
    { href: `/${locale}/motorcycles`, label: t('motorcycles') },
    { href: `/${locale}/spare-parts`, label: t('spareParts') },
  ];

  /* Computed navbar classes */
  const navBg = scrolled
    ? 'bg-[#070d18]/95 backdrop-blur-2xl shadow-[0_1px_0_rgba(201,168,76,0.15)]'
    : 'bg-[#050b14]/80 backdrop-blur-md';

  return (
    <>
      {/* ══ Main Navbar ══════════════════════════════════════════ */}
      <nav
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${navBg}`}
      >
        {/* Animated gold top accent line */}
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
              {navLinks.map(l => <NavLink key={l.href} {...l} />)}
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

              {/* Auth buttons — desktop */}
              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <>
                    <Link
                      href={`/${locale}/dashboard`}
                      className="text-[0.78rem] font-semibold tracking-wide text-white/65
                                 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.08]
                                 transition-all duration-200"
                    >
                      {t('dashboard')}
                    </Link>
                    <button
                      onClick={logout}
                      className="btn-gold h-8 px-4 text-xs rounded-lg"
                    >
                      {t('logout')}
                    </button>
                  </>
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
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl
                          text-sm font-semibold text-white/65 hover:text-white
                          hover:bg-white/[0.07] transition-all duration-200
                          ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] opacity-70 flex-shrink-0" />
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
                  className="btn-gold w-full h-11 text-sm rounded-xl"
                >
                  {t('logout')}
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
                  {t('register')}
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
