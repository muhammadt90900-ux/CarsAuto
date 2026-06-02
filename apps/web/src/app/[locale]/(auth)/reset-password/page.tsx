// apps/web/src/app/[locale]/(auth)/reset-password/page.tsx
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm';

export const metadata = { title: 'Reset Password — Cars Auto' };

export default function ResetPasswordPage({
  params,
}: {
  params: { locale: string };
}) {
  return (
    // Suspense boundary required: ResetPasswordForm reads searchParams via useSearchParams()
    <Suspense fallback={null}>
      <ResetPasswordForm locale={params.locale} />
    </Suspense>
  );
}
