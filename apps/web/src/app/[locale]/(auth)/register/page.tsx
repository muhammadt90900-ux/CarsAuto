// apps/web/src/app/[locale]/(auth)/register/page.tsx
import { RegisterForm } from '@/components/features/auth/RegisterForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  return <RegisterForm locale={locale} />;
}
