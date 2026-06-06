// apps/web/src/app/[locale]/(auth)/verify-email/page.tsx
// Handles the ?token=<raw> link sent by the API's email verification email.
// Pattern mirrors reset-password/page.tsx — Suspense boundary required because
// the inner component reads searchParams via useSearchParams().
import { Suspense } from 'react';
import { VerifyEmailForm } from '@/components/features/auth/VerifyEmailForm';

export const metadata = { title: 'Verify Email — Cars Auto' };

export default function VerifyEmailPage({
  params,
}: {
  params: { locale: string };
}) {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm locale={params.locale} />
    </Suspense>
  );
}
