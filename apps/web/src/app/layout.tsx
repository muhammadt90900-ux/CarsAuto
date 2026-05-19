import type { Metadata } from 'next';
import { Inter, Noto_Sans_Arabic, Noto_Sans_SC, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-noto-arabic', display: 'swap' });
const notoSC = Noto_Sans_SC({ subsets: ['latin'], variable: '--font-noto-sc', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'AutoBazaar Pro',
  description: "The Middle East's Premium Auto Marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={[inter.variable, notoArabic.variable, notoSC.variable, jetbrainsMono.variable, 'font-sans', 'antialiased'].join(' ')}>
        {children}
      </body>
    </html>
  );
}
