// components/features/marketplace/serviceFilters.ts
//
// Filter/config for the SERVICE listing type, consumed by
// <ListingTypeClient listingType="SERVICE" config={serviceConfig} />.
//
// `serviceType` and `mobile` are the two ListingAccessorySpec fields that
// ListingsService.buildWhereClause() actually filters on server-side for
// SERVICE listings (see listings.service.ts ~line 944-959) — both wired
// below. `duration`/`warranty`/`availableDays`/`certifications` are not
// filterable yet; they're shown on the card via `displayFields` instead.
import type { ListingTypeConfig } from './ListingTypeClient';

// Matches the free-text values used by ListingAccessorySpec.serviceType
// (see prisma/schema.prisma comment: repair | maintenance | inspection | towing | other)
export const SERVICE_TYPES = [
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'towing', label: 'Towing' },
  { value: 'other', label: 'Other' },
];

export const serviceConfig: ListingTypeConfig = {
  listingType: 'SERVICE',
  routeSegment: 'services',
  titleKu: 'خزمەتگوزاری',
  titleEn: 'Services',
  emptyIcon: '🛠️',
  cardIcon: '🛠️',
  filters: [
    {
      key: 'serviceType',
      label: 'Service Type',
      kind: 'radio',
      options: SERVICE_TYPES,
    },
    {
      key: 'mobile',
      label: 'Availability',
      kind: 'toggle',
      toggleLabel: 'Mobile — comes to you',
    },
  ],
  displayFields: ['serviceType', 'duration', 'mobile', 'warranty', 'availableDays'],
};
