'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@auto-bazaar-pro/ui/components';
import { useAuthStore } from '@/store/auth.store';
import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export function Navbar() {
  const t = useTranslations('common');
  const { user, logout } = useAuthStore();
  const { locale } = useParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const isRTL = locale === 'ar' || locale === 'ku';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const close = () => setMobileOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const navLinks = [
    { href: `/${locale}/cars`, label: t('cars') },
    { href: `/${locale}/motorcycles`, label: t('motorcycles') },
    { href: `/${locale}/spare-parts`, label: t('spareParts') },
  ];

  return (
    <>
      {/* ── Main bar ── */}
      <nav
        dir={isRTL ? 'rtl' : 'ltr'}
        className={[
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-white/95 dark:bg-[#0f0f1a]/95 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'bg-white/70 dark:bg-[#0f0f1a]/70 backdrop-blur-md',
        ].join(' ')}
      >
        {/* slim accent line at top */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#e94560] via-[#ff6b35] to-[#e94560]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* ── Logo ── */}
            <Link
              href={`/${locale}`}
              className="flex-shrink-0 flex items-center gap-1.5 group"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#e94560] shadow-[0_0_12px_rgba(233,69,96,0.45)] transition-transform duration-200 group-hover:scale-105">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 11L5 5h6l3 6H2Z" fill="white" opacity=".9"/>
                  <circle cx="5.5" cy="12.5" r="1.5" fill="white"/>
                  <circle cx="10.5" cy="12.5" r="1.5" fill="white"/>
                </svg>
              </span>
              <span className="text-[1.15rem] font-extrabold tracking-tight leading-none">
                <span className="text-[#e94560]">Auto</span>
                <span className="text-[#1a1a2e] dark:text-white">Bazaar</span>
                <span className="text-[#e94560] font-black">Pro</span>
              </span>
            </Link>

            {/* ── Desktop nav links ── */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="relative px-3 py-1.5 text-[0.82rem] font-semibold tracking-wide uppercase text-gray-600 dark:text-gray-300 hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors duration-150 rounded-md hover:bg-gray-100/60 dark:hover:bg-white/5 group"
                >
                  {label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[#e94560] rounded-full transition-all duration-200 group-hover:w-4/5" />
                </Link>
              ))}
            </div>

            {/* ── Search bar (desktop) ── */}
            <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm xl:max-w-md">
              <div className="relative w-full group">
                <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-[#e94560]`}>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/>
                  </svg>
                </span>
                <input
                  type="search"
                  placeholder={t('searchPlaceholder') ?? 'Search cars, motorcycles…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full h-9 ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'} text-sm bg-gray-100/80 dark:bg-white/[0.06] border border-transparent rounded-xl text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#e94560]/50 focus:bg-white dark:focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(233,69,96,0.12)] transition-all duration-200`}
                />
              </div>
            </div>

            {/* ── Right cluster ── */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile search toggle */}
              <button
                aria-label="Search"
                onClick={() => setSearchOpen((v) => !v)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#e94560] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/>
                </svg>
              </button>

              <div className="hidden md:flex items-center gap-1.5">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {/* Auth buttons (desktop) */}
              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <>
                    <Link
                      href={`/${locale}/dashboard`}
                      className="text-[0.82rem] font-semibold text-gray-600 dark:text-gray-300 hover:text-[#e94560] dark:hover:text-[#e94560] px-3 py-1.5 rounded-md hover:bg-gray-100/60 dark:hover:bg-white/5 transition-all"
                    >
                      {t('dashboard')}
                    </Link>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={logout}
                      className="h-8 px-4 text-xs font-bold rounded-lg bg-[#e94560] hover:bg-[#c73652] text-white border-none shadow-[0_2px_8px_rgba(233,69,96,0.35)] hover:shadow-[0_2px_12px_rgba(233,69,96,0.5)] transition-all"
                    >
                      {t('logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href={`/${locale}/login`}>
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-all"
                      >
                        {t('login')}
                      </Button>
                    </Link>
                    <Link href={`/${locale}/register`}>
                      <Button
                        variant="accent"
                        size="sm"
                        className="h-8 px-4 text-xs font-bold rounded-lg bg-[#e94560] hover:bg-[#c73652] text-white border-none shadow-[0_2px_8px_rgba(233,69,96,0.35)] hover:shadow-[0_2px_12px_rgba(233,69,96,0.5)] transition-all"
                      >
                        {t('register')}
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <span className={`block w-5 h-[1.5px] bg-gray-700 dark:bg-gray-200 rounded-full transition-all duration-300 origin-center ${mobileOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
                <span className={`block w-5 h-[1.5px] bg-gray-700 dark:bg-gray-200 rounded-full transition-all duration-200 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} />
                <span className={`block w-5 h-[1.5px] bg-gray-700 dark:bg-gray-200 rounded-full transition-all duration-300 origin-center ${mobileOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile expandable search ── */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${searchOpen ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="px-4 pb-3 pt-1">
            <div className="relative">
              <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-gray-400`}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/>
                </svg>
              </span>
              <input
                ref={searchRef}
                type="search"
                placeholder={t('searchPlaceholder') ?? 'Search cars, motorcycles…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-10 ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'} text-sm bg-gray-100 dark:bg-white/[0.07] border border-transparent rounded-xl text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-[#e94560]/40 focus:shadow-[0_0_0_3px_rgba(233,69,96,0.1)] transition-all`}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile slide-down menu ── */}
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className={[
          'fixed inset-x-0 z-40 md:hidden transition-all duration-300 ease-in-out',
          'bg-white dark:bg-[#0f0f1a] border-b border-gray-200 dark:border-gray-800',
          'shadow-xl',
          mobileOpen ? 'top-[4.125rem] opacity-100 pointer-events-auto' : '-top-full opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <div className="px-4 py-5 flex flex-col gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-[#e94560] hover:bg-gray-100/80 dark:hover:bg-white/[0.07] transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#e94560] opacity-60 flex-shrink-0" />
              {label}
            </Link>
          ))}

          <div className="my-3 border-t border-gray-100 dark:border-gray-800" />

          <div className={`flex items-center gap-3 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {user ? (
              <>
                <Link href={`/${locale}/dashboard`} onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full h-11 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200">
                    {t('dashboard')}
                  </Button>
                </Link>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full h-11 text-sm font-bold rounded-xl bg-[#e94560] hover:bg-[#c73652] text-white border-none shadow-[0_2px_10px_rgba(233,69,96,0.35)]"
                >
                  {t('logout')}
                </Button>
              </>
            ) : (
              <>
                <Link href={`/${locale}/login`} onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full h-11 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200">
                    {t('login')}
                  </Button>
                </Link>
                <Link href={`/${locale}/register`} onClick={() => setMobileOpen(false)}>
                  <Button variant="accent" size="sm" className="w-full h-11 text-sm font-bold rounded-xl bg-[#e94560] hover:bg-[#c73652] text-white border-none shadow-[0_2px_10px_rgba(233,69,96,0.35)]">
                    {t('register')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile menu backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-black/20 dark:bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
