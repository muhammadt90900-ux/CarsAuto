'use client';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (nextLocale: string) => {
    startTransition(() => {
      const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
      router.push(newPath);
    });
  };
  
  return (
    <div className="relative group">
      <button className="flex items-center gap-1 text-sm font-medium">
        <span>{localeNames[locale as keyof typeof localeNames]}</span>
      </button>
      <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 hidden group-hover:block">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => switchLocale(loc)}
            className={`block w-full text-left px-4 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${loc === locale ? 'font-bold text-[#e94560]' : ''}`}
          >
            {localeNames[loc]}
          </button>
        ))}
      </div>
    </div>
  );
}
