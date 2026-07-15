// app/[locale]/(public)/services/[id]/page.tsx
// AUDIT FIX (C1 — Critical): this route did not exist — every service
// card linked here and 404'd. See createListingDetailPage.tsx for the
// shared implementation.

import { createListingDetailPage } from '@/components/features/marketplace/createListingDetailPage';
import { serviceDetailConfig } from '@/components/features/marketplace/detailConfigs';

const { generateStaticParams, generateMetadata, DetailPage } = createListingDetailPage({
  listingType: 'SERVICE',
  config: serviceDetailConfig,
});

export { generateStaticParams, generateMetadata };
export default DetailPage;
