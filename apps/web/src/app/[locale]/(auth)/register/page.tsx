// apps/web/src/app/[locale]/(auth)/register/page.tsx
import { RegisterForm } from '@/components/features/auth/RegisterForm';

interface Props {
  params: { locale: string };
}

export default function RegisterPage({ params }: Props) {
  return <RegisterForm locale={params.locale} />;
}
