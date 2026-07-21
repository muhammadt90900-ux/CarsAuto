'use client';
// apps/web/src/components/shared/DevScriptWarningSuppressor.tsx
//
// KNOWN NEXT.JS 16.2 / REACT 19 ISSUE — not a bug in this codebase.
// Since Next.js 16.2, the dev overlay logs a false-positive error for ANY
// inline <script> rendered via next/script strategy="beforeInteractive"
// (and even for next-themes' internal script), even though the script is
// correctly hoisted into the server HTML and runs before hydration exactly
// as intended. Reported upstream in multiple repos, e.g.:
//   - https://github.com/shadcn-ui/ui/issues/10104
//   - https://github.com/pacocoursey/next-themes/issues/385
//   - https://github.com/heroui-inc/heroui/issues/6348
// There is no code-level fix on our side — the warning is cosmetic and
// dev-only; the theme-init script in [locale]/layout.tsx still runs
// correctly (no flash-of-wrong-theme in production or dev). This component
// filters *only* that exact console.error message, only in development,
// so real errors are never hidden. Safe to delete once Next.js patches this
// upstream.
import { useEffect } from 'react';

export function DevScriptWarningSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const original = console.error;
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
        return;
      }
      original.apply(console, args);
    };
    return () => {
      console.error = original;
    };
  }, []);

  return null;
}