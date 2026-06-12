import {
  Syne,
  DM_Sans,
  Noto_Sans_Arabic,
  Noto_Sans_SC,
  JetBrains_Mono,
} from 'next/font/google';

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-noto-arabic',
  display: 'swap',
});

const notoSC = Noto_Sans_SC({
  subsets: ['chinese-simplified'] as unknown as ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto-sc',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const fontVariables = [
  syne.variable,
  dmSans.variable,
  notoArabic.variable,
  notoSC.variable,
  jetbrainsMono.variable,
].join(' ');
