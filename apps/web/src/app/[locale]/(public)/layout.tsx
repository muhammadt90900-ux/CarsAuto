// apps/web/src/app/[locale]/(public)/layout.tsx
import { PublicLayout } from '@/components/layouts/PublicLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
