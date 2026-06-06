// apps/web/src/components/shared/ThemeToggle.tsx (Accessibility-enhanced)
'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggle = () => {
    document.documentElement.classList.toggle('dark');
    setDark(prev => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 transition-colors"
    >
      {dark
        ? <Sun className="w-5 h-5" aria-hidden="true" />
        : <Moon className="w-5 h-5" aria-hidden="true" />}
    </button>
  );
}
