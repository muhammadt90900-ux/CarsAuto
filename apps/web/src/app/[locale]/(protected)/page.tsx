// apps/web/src/app/[locale]/(protected)/sell/page.tsx
// Server component — auth is enforced by the (protected) layout.
// Renders the SellCarForm client component.

import type { Metadata } from 'next';
import { SellCarForm } from '@/components/features/sell/SellCarForm';

export const metadata: Metadata = {
  title: 'Sell Your Car | AutoBazaarPro',
  description: 'List your car on AutoBazaarPro and reach thousands of buyers.',
};

export default function SellPage() {
  return <SellCarForm />;
}
