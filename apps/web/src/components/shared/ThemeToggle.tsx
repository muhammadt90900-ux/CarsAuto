'use client';
// components/shared/ThemeToggle.tsx
//
// Dark-mode-first toggle with localStorage persistence.
//
// ── Strategy ───────────────────────────────────────────────────────────────
//   Default theme : dark  (set by anti-FOUC script + html className="dark")
//   Persistence   : localStorage key 'carsauto-theme' → 'dark' | 'light'
//   Tailwind mode : darkMode: 'class' → .dark on <html>
//
// ── Hydration safety ───────────────────────────────────────────────────────
//   The server always renders dark (html has className="dark").
//   The anti-FOUC script may flip that BEFORE React hydrates if the user
//   previously chose light.  suppressHydrationWarning on <html> absorbs the
//   className diff.  This component uses a `mounted` guard so the icon is
//   never mismatched: before mount it renders a neutral placeholder <span>,
//   after mount it reads the real DOM state.

import { useState, useEffect } from 'react';

// ── Icon components (inlined SVG — no Lucide import needed) ───────────────

/** Sun icon — shown in dark mode ("click to go light") */
function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3"  />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  );
}

/** Moon icon — shown in light mode ("click to go dark") */
function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const THEME_KEY = 'carsauto-theme';

// ── Component ─────────────────────────────────────────────────────────────

export function ThemeToggle() {
  // isDark tracks the live DOM state after hydration.
  // Initial value is true because dark is our default — this makes the SSR
  // render show <SunIcon />, which is correct for a dark-mode page.
  const [isDark,   setIsDark]   = useState(true);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    // Read the real DOM state (anti-FOUC script may have already toggled it).
    const dark = document.documentElement.classList.contains('dark');
    setIsDark(dark);
    setMounted(true);

    // Keep state in sync whenever an external force changes the class
    // (e.g. OS preference change, dev tools, other tabs in the future).
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes:      true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);

    // Apply to DOM
    document.documentElement.classList.toggle('dark', next);

    // Persist — 'light' is the only value we need to save; absence / 'dark'
    // both mean "use dark" so we can clear the key when going dark.
    try {
      if (next) {
        // Going dark: remove key (matches anti-FOUC "null → dark" branch)
        localStorage.removeItem(THEME_KEY);
      } else {
        // Going light: save explicitly
        localStorage.setItem(THEME_KEY, 'light');
      }
    } catch {
      // Private browsing / storage full — ignore
    }
  };

  // Before mount we don't know if the user had saved "light".
  // Render a placeholder that matches the SSR output (dark = SunIcon).
  // suppressHydrationWarning lets React skip the warning when client
  // overrides with MoonIcon immediately after mounting in light mode.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted
        ? (isDark ? 'Switch to light mode' : 'Switch to dark mode')
        : 'Toggle theme'}
      aria-pressed={isDark}
      suppressHydrationWarning
      className="relative w-9 h-9 rounded-xl flex items-center justify-center
                 text-white/60 hover:text-white/90 hover:bg-white/[0.08]
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2
                 focus-visible:ring-offset-transparent
                 transition-all duration-200"
    >
      {/* Inner span carries suppressHydrationWarning to prevent React
          complaining when the icon changes between SSR and first paint */}
      <span
        suppressHydrationWarning
        className="flex items-center justify-center
                   transition-transform duration-300 ease-out"
        style={{ transform: mounted ? 'scale(1)' : 'scale(0.85)' }}
      >
        {!mounted || isDark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}
