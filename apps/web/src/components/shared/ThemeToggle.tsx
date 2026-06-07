// apps/web/src/components/shared/ThemeToggle.tsx
'use client';
import { useEffect } from 'react';

// SVG icons inlined — avoids lucide className mismatch between SSR and client
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

export function ThemeToggle() {
  useEffect(() => {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;

    const update = () => {
      const isDark = document.documentElement.classList.contains('dark');
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', String(isDark));
      const moon = document.getElementById('theme-icon-moon');
      const sun  = document.getElementById('theme-icon-sun');
      if (moon) moon.style.display = isDark ? 'none'  : 'block';
      if (sun)  sun.style.display  = isDark ? 'block' : 'none';
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    document.documentElement.classList.toggle('dark');
  };

  // SSR and client render IDENTICAL HTML — no dynamic values at all
  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2
                 transition-colors"
    >
      <span id="theme-icon-moon"><MoonIcon /></span>
      <span id="theme-icon-sun" style={{ display: 'none' }}><SunIcon /></span>
    </button>
  );
}