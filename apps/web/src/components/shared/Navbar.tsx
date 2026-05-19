'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@auto-bazaar-pro/ui/components';
import { useAuthStore } from '@/store/auth.store';

export function Navbar() {
  const t = useTranslations('common');
  const { user, logout } = useAuthStore();

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-[#e94560]">
          AutoBazaar<span className="text-[#1a1a2e] dark:text-white">Pro</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/cars" className="text-sm font-medium hover:text-[#e94560]">{t('search')}</Link>
          <Link href="/motorcycles" className="text-sm font-medium hover:text-[#e94560]">Motorcycles</Link>
          <Link href="/spare-parts" className="text-sm font-medium hover:text-[#e94560]">Parts</Link>
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <span className="text-sm font-medium">{user.name}</span>
              <Button variant="accent" size="sm" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button size="sm">Login</Button></Link>
              <Link href="/register"><Button variant="accent" size="sm">Register</Button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
