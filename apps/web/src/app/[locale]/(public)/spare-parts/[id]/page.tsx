// app/[locale]/(public)/spare-parts/[id]/page.tsx
// AUDIT FIX (C1 — Critical): this route did not exist — every spare-part
// card linked here and 404'd. See createListingDetailPage.tsx for the
// shared implementation.

import { createListingDetailPage } from '@/components/features/marketplace/createListingDetailPage';
import { sparePartDetailConfig } from '@/components/features/marketplace/detailConfigs';

const { generateStaticParams, generateMetadata, DetailPage } = createListingDetailPage({
  listingType: 'SPARE_PART',
  config: sparePartDetailConfig,
});

export { generateStaticParams, generateMetadata };
export default DetailPage;
