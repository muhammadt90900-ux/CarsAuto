// apps/web/src/app/[locale]/(auth)/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';

export const metadata = { title: 'Forgot Password — CarsAuto' };

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ForgotPasswordForm locale={locale} />;
}
