// i18n/navigation.ts
// next-intl v3 requires you to create navigation helpers via createNavigation().
// Import useRouter / usePathname / Link / redirect from HERE — not from 'next-intl/navigation'.

import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  defaultLocale,
});
