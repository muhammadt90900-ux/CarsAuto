/**
 * AutoBazaarPro — Design Tokens
 * Single source of truth for all design values.
 * Import from here; never hard-code colors, spacing, or radii.
 */

// ─── Color Palette ────────────────────────────────────────────────────────────
export const colors = {
  /** Brand gold — primary accent */
  gold: {
    DEFAULT: '#c9a84c',
    light:   '#e8cc7a',
    dim:     '#9e7c2e',
    50:      'rgba(201,168,76,0.05)',
    100:     'rgba(201,168,76,0.10)',
    200:     'rgba(201,168,76,0.20)',
    300:     'rgba(201,168,76,0.30)',
    glow:    'rgba(201,168,76,0.25)',
    subtle:  'rgba(201,168,76,0.12)',
  },
  /** Midnight navy — primary dark backgrounds */
  ink: {
    900: '#050b14',
    800: '#080f1c',
    750: '#0b1525',
    700: '#0f1c2e',
    600: '#142236',
    500: '#1c2f45',
    400: '#263d57',
    300: '#3a5470',
  },
  /** Light-mode surface scale */
  surface: {
    0:   '#ffffff',
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
  },
  /** Semantic status */
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error:   '#ef4444',
    info:    '#3b82f6',
  },
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const typography = {
  fontFamily: {
    display: "'Syne', 'Noto Sans Arabic', sans-serif",
    sans:    "'DM Sans', 'Noto Sans Arabic', sans-serif",
    arabic:  "'Noto Sans Arabic', sans-serif",
    mono:    "'JetBrains Mono', monospace",
  },
  fontSize: {
    xs:   '0.65rem',  // 10.4px
    sm:   '0.78rem',  // 12.5px
    base: '0.875rem', // 14px
    md:   '1rem',     // 16px
    lg:   '1.125rem', // 18px
    xl:   '1.25rem',  // 20px
    '2xl':'1.5rem',   // 24px
    '3xl':'1.875rem', // 30px
    '4xl':'2.25rem',  // 36px
    '5xl':'3rem',     // 48px
  },
  fontWeight: {
    light:    300,
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold:800,
  },
  lineHeight: {
    tight:  1.15,
    snug:   1.35,
    normal: 1.5,
    relaxed:1.625,
  },
  letterSpacing: {
    tight:  '-0.02em',
    normal: '0em',
    wide:   '0.05em',
    wider:  '0.08em',
    widest: '0.12em',
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  0:    '0px',
  1:    '4px',
  2:    '8px',
  3:    '12px',
  4:    '16px',
  5:    '20px',
  6:    '24px',
  8:    '32px',
  10:   '40px',
  12:   '48px',
  16:   '64px',
  20:   '80px',
  24:   '96px',
  navbarH: '68px',
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '20px',
  '2xl':'28px',
  '4xl':'2rem',
  full: '9999px',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const shadows = {
  sm:     '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  md:     '0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
  lg:     '0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)',
  gold:   '0 8px 32px rgba(201,168,76,0.25), 0 2px 8px rgba(201,168,76,0.15)',
  goldSm: '0 4px 16px rgba(201,168,76,0.20)',
  darkMd: '0 4px 20px rgba(0,0,0,0.50)',
  darkLg: '0 12px 48px rgba(0,0,0,0.60)',
  glass:  'inset 0 1px 0 rgba(255,255,255,0.08)',
} as const;

// ─── Transitions ──────────────────────────────────────────────────────────────
export const transitions = {
  fast:   '150ms cubic-bezier(0.4,0,0.2,1)',
  base:   '250ms cubic-bezier(0.4,0,0.2,1)',
  slow:   '400ms cubic-bezier(0.4,0,0.2,1)',
  spring: '300ms cubic-bezier(0.34,1.56,0.64,1)',
  expo:   '350ms cubic-bezier(0.16,1,0.3,1)',
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────────────────
export const zIndex = {
  base:    0,
  raised:  10,
  dropdown:20,
  sticky:  30,
  overlay: 40,
  modal:   50,
  toast:   60,
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────────────────
export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl':'1536px',
} as const;
