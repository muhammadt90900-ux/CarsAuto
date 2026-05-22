'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@auto-bazaar-pro/ui/components';
import { useAuthStore } from '@/store/auth.store';
import { useParams } from 'next/navigation';

export function Navbar() {
  const t = useTranslations('common');
  const { user, logout } = useAuthStore();
  const { locale } = useParams();

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="text-2xl font-bold text-[#e94560]">
          AutoBazaar<span className="text-[#1a1a2e] dark:text-white">Pro</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href={`/${locale}/cars`} className="text-sm font-medium hover:text-[#e94560]">{t('cars')}</Link>
          <Link href={`/${locale}/motorcycles`} className="text-sm font-medium hover:text-[#e94560]">{t('motorcycles')}</Link>
          <Link href={`/${locale}/spare-parts`} className="text-sm font-medium hover:text-[#e94560]">{t('spareParts')}</Link>
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <Link href={`/${locale}/dashboard`} className="text-sm font-medium hover:text-[#e94560]">{t('dashboard')}</Link>
              <Button variant="accent" size="sm" onClick={logout}>{t('logout')}</Button>
            </>
          ) : (
            <>
              <Link href={`/${locale}/login`}><Button size="sm">{t('login')}</Button></Link>
              <Link href={`/${locale}/register`}><Button variant="accent" size="sm">{t('register')}</Button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
