// apps/web/src/app/[locale]/(auth)/layout.tsx
import { dir } from '@/i18n/config';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div dir={dir(locale)} className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d0d1a] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-xl p-8">
        {children}
      </div>
    </div>
  );
}
