// components/features/marketplace/detailConfigs.ts
//
// AUDIT FIX (C1 — Critical): DetailConfig objects for the three listing
// types that previously had no detail page. specFields match the actual
// fields on SparePartListing / AccessoryListing / ServiceListing in
// packages/types/src/listing.ts.

import type { DetailConfig } from './ListingDetailClient';

export const sparePartDetailConfig: DetailConfig = {
  routeSegment: 'spare-parts',
  titleKu: 'پارچە یەدەگی',
  titleEn: 'Spare Parts',
  cardIcon: '⚙️',
  specObjectKeys: ['partSpec'],
  specFields: [
    { key: 'partNumber', label: 'Part Number' },
    { key: 'condition', label: 'Condition' },
    { key: 'quantity', label: 'Quantity Available' },
    { key: 'compatibleMakes', label: 'Compatible Makes' },
    { key: 'compatibleModels', label: 'Compatible Models' },
    { key: 'compatibleYears', label: 'Compatible Years' },
  ],
};

export const accessoryDetailConfig: DetailConfig = {
  routeSegment: 'accessories',
  titleKu: 'ئاکسسواری',
  titleEn: 'Accessories',
  cardIcon: '🎒',
  specObjectKeys: ['accessorySpec'],
  specFields: [
    { key: 'brand', label: 'Brand' },
    { key: 'model', label: 'Model' },
    { key: 'condition', label: 'Condition' },
    { key: 'color', label: 'Color' },
    { key: 'material', label: 'Material' },
    { key: 'weight', label: 'Weight' },
    { key: 'dimensions', label: 'Dimensions' },
    { key: 'compatibleBrands', label: 'Compatible Brands' },
    { key: 'compatibleModels', label: 'Compatible Models' },
  ],
};

export const serviceDetailConfig: DetailConfig = {
  routeSegment: 'services',
  titleKu: 'خزمەتگوزاری',
  titleEn: 'Services',
  cardIcon: '🛠️',
  specObjectKeys: ['serviceSpec'],
  specFields: [
    { key: 'serviceType', label: 'Service Type' },
    { key: 'duration', label: 'Duration (minutes)' },
    { key: 'mobile', label: 'Mobile Service' },
    { key: 'warranty', label: 'Warranty (days)' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'availableDays', label: 'Available Days' },
    { key: 'compatibleBrands', label: 'Compatible Brands' },
    { key: 'compatibleModels', label: 'Compatible Models' },
  ],
};
