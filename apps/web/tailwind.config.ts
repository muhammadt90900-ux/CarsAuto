// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss';
import { colors, fontFamily, spacing, borderRadius, shadows } from '@auto-bazaar-pro/ui/tokens';

const config: Config = {
  content: [
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...colors,
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-noto-arabic)', 'var(--font-noto-sc)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      spacing,
      borderRadius,
      boxShadow: shadows,
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
export default config;
