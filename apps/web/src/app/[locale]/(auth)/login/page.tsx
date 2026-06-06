// apps/web/src/app/[locale]/(auth)/login/page.tsx
import { LoginForm } from '@/components/features/auth/LoginForm';

interface Props {
  params: { locale: string };
}

export default function LoginPage({ params }: Props) {
  return <LoginForm locale={params.locale} />;
}
