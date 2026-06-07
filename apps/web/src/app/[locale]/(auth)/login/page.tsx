// apps/web/src/app/[locale]/(auth)/login/page.tsx
import { LoginForm } from '@/components/features/auth/LoginForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  return <LoginForm locale={locale} />;
}