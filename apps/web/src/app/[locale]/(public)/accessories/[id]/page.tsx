// app/[locale]/(public)/accessories/[id]/page.tsx
// AUDIT FIX (C1 — Critical): this route did not exist — every accessory
// card linked here and 404'd. See createListingDetailPage.tsx for the
// shared implementation.

import { createListingDetailPage } from '@/components/features/marketplace/createListingDetailPage';
import { accessoryDetailConfig } from '@/components/features/marketplace/detailConfigs';

const { generateStaticParams, generateMetadata, DetailPage } = createListingDetailPage({
  listingType: 'ACCESSORY',
  config: accessoryDetailConfig,
});

export { generateStaticParams, generateMetadata };
export default DetailPage;
