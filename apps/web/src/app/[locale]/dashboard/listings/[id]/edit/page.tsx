// apps/web/src/app/[locale]/dashboard/listings/[id]/edit/page.tsx
//
// Previously a dead link: dashboard/listings/page.tsx has always linked its
// Edit button to `/dashboard/listings/${listing.id}/edit`, but this route
// didn't exist, so sellers could not edit a listing after creating it —
// only delete-and-recreate. This reuses the same multi-step form the
// creation flow uses (components/features/sell), passing the listing id
// so it loads and pre-fills the real listing instead of starting blank.

import type { Metadata } from 'next';
import { SellCarForm } from '@/components/features/sell/SellCarForm';

export const metadata: Metadata = {
  title: 'Edit Listing | CarsAuto',
  robots: { index: false, follow: false },
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellCarForm listingId={id} />;
}
