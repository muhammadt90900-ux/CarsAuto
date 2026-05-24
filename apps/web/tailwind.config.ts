// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      /* ── Brand colors ─────────────────────────────────────── */
      colors: {
        gold: {
          DEFAULT: '#c9a84c',
          light:   '#e8cc7a',
          dim:     '#9e7c2e',
          50:  'rgba(201,168,76,0.05)',
          100: 'rgba(201,168,76,0.10)',
          200: 'rgba(201,168,76,0.20)',
          300: 'rgba(201,168,76,0.30)',
        },
        ink: {
          900: '#050b14',
          800: '#080f1c',
          750: '#0b1525',
          700: '#0f1c2e',
          600: '#142236',
          500: '#1c2f45',
        },
      },

      /* ── Typography ──────────────────────────────────────── */
      fontFamily: {
        display: ['Syne', 'Noto Sans Arabic', 'sans-serif'],
        sans:    ['DM Sans', 'Noto Sans Arabic', 'sans-serif'],
        arabic:  ['Noto Sans Arabic', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },

      /* ── Spacing ──────────────────────────────────────────── */
      spacing: {
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
        '34':  '8.5rem',
        '18px': '18px',
        '66px': '66px',
        '68px': '68px',
      },

      /* ── Border radius ────────────────────────────────────── */
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      /* ── Shadows ──────────────────────────────────────────── */
      boxShadow: {
        'gold':    '0 8px 32px rgba(201,168,76,0.25), 0 2px 8px rgba(201,168,76,0.15)',
        'gold-sm': '0 4px 16px rgba(201,168,76,0.20)',
        'dark-md': '0 4px 20px rgba(0,0,0,0.50)',
        'dark-lg': '0 12px 48px rgba(0,0,0,0.60)',
        'glass':   'inset 0 1px 0 rgba(255,255,255,0.08)',
      },

      /* ── Background images ────────────────────────────────── */
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-gold':    'linear-gradient(135deg, #b8922e 0%, #e0b84a 45%, #c9a84c 100%)',
        'gradient-hero':    'linear-gradient(175deg, #050b14 0%, #080f1c 35%, #0b1525 65%, #050b14 100%)',
        'gradient-nav':     'linear-gradient(180deg, rgba(5,11,20,0.90) 0%, transparent 100%)',
        'dot-gold':         'radial-gradient(circle, rgba(201,168,76,0.8) 1px, transparent 1px)',
      },

      /* ── Animations ───────────────────────────────────────── */
      animation: {
        'fade-up':    'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer':    'shimmer 1.8s ease-in-out infinite',
        'gold-slide': 'goldSlide 3s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'sweep':      'sweep 8s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        goldSlide: {
          '0%, 100%': { backgroundPosition: '-100% 0' },
          '50%':      { backgroundPosition:  '100% 0' },
        },
        'pulse-ring': {
          '0%':   { boxShadow: '0 0 0 0 rgba(201,168,76,0.5)' },
          '70%':  { boxShadow: '0 0 0 8px rgba(201,168,76,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0)'   },
        },
        sweep: {
          '0%,100%': { backgroundPosition: '-100% -100%' },
          '50%':     { backgroundPosition:  '100%  100%' },
        },
      },

      /* ── Transition timing ────────────────────────────────── */
      transitionDuration: {
        '350': '350ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34,1.56,0.64,1)',
        'out-expo': 'cubic-bezier(0.16,1,0.3,1)',
      },

      /* ── Screen ───────────────────────────────────────────── */
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
};

export default config;
