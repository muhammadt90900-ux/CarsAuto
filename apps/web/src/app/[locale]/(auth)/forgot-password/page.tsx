// apps/web/src/app/[locale]/(auth)/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';

export const metadata = { title: 'Forgot Password — Cars Auto' };

export default function ForgotPasswordPage({
  params,
}: {
  params: { locale: string };
}) {
  return <ForgotPasswordForm locale={params.locale} />;
}
