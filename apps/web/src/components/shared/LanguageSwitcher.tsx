'use client';
// components/shared/LanguageSwitcher.tsx
// Uses next-intl's routing helpers for SSR-safe locale switching
// that preserves the current pathname and query parameters.

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next-intl/navigation';
import { locales, localeNames } from '@/i18n/config';
import { useState, useRef, useEffect, useTransition } from 'react';
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'nav' | 'minimal';
  align?: 'left' | 'right';
}

export function LanguageSwitcher({
  variant = 'nav',
  align = 'right',
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const switchLocale = (nextLocale: string) => {
    setOpen(false);
    startTransition(() => {
      // next-intl's router.replace keeps the same pathname and
      // updates the locale prefix — no refresh, no hydration mismatch.
      router.replace(pathname, { locale: nextLocale });
    });
  };

  const currentName = localeNames[locale as keyof typeof localeNames];

  return (
    <div ref={ref} className="relative" aria-label={t('language')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          flex items-center gap-1.5 rounded-lg transition-all duration-200
          ${isPending ? 'opacity-50 cursor-wait' : ''}
          ${
            variant === 'nav'
              ? `px-2.5 py-1.5 text-sm font-medium
                 text-white/70 hover:text-white
                 hover:bg-white/10 border border-transparent
                 hover:border-white/15`
              : 'text-xs font-medium text-gray-600 dark:text-gray-300'
          }
        `}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <span>{currentName}</span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('language')}
          className={`
            absolute top-full mt-2 z-[200] min-w-[140px]
            rounded-xl overflow-hidden
            bg-[#0f1b2d] border border-white/10
            shadow-[0_20px_60px_rgba(0,0,0,0.5)]
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {locales.map((loc) => (
            <button
              key={loc}
              role="option"
              aria-selected={loc === locale}
              onClick={() => switchLocale(loc)}
              className={`
                w-full flex items-center gap-2.5 px-4 py-2.5
                text-sm transition-colors duration-150 text-left
                ${
                  loc === locale
                    ? 'bg-[#c9a84c]/15 text-[#e8cc7a] font-semibold'
                    : 'text-white/70 hover:bg-white/[0.07] hover:text-white'
                }
              `}
            >
              <span className="text-base leading-none" aria-hidden>
                {localeFlag(loc)}
              </span>
              <span>{localeNames[loc]}</span>
              {loc === locale && (
                <span className="ms-auto text-[#c9a84c] text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function localeFlag(locale: string): string {
  const flags: Record<string, string> = {
    ku: '🏳',
    ar: '🇮🇶',
    en: '🇬🇧',
    zh: '🇨🇳',
  };
  return flags[locale] ?? '🌐';
}
