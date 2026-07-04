// components/features/marketplace/accessoryFilters.ts
//
// Filter/config for the ACCESSORY listing type, consumed by
// <ListingTypeClient listingType="ACCESSORY" config={accessoryConfig} />.
//
// NOTE on scope: apps/api ListingsService.buildWhereClause() only wires up
// `search`, `minPrice`/`maxPrice`, `page`/`limit`, and — for
// ACCESSORY/SERVICE specifically — `serviceType` + `mobile` as real,
// functional query filters (see listings.service.ts ~line 944-959).
// `brand`/`model`/`color`/`material`/`condition` exist on
// ListingAccessorySpec but are NOT filterable server-side yet (the
// top-level `condition`/`color` DTO fields only apply to vehicleSpec for
// CAR/MOTORCYCLE). Rather than ship sidebar checkboxes that silently do
// nothing, this config only lists genuinely wired filters. The remaining
// spec fields are still shown on the card as informational chips via
// `displayFields`. If brand/color/material filtering is wanted later,
// ListingsService needs a few more `accWhere.x = …` lines first.
import type { ListingTypeConfig } from './ListingTypeClient';

export const accessoryConfig: ListingTypeConfig = {
  listingType: 'ACCESSORY',
  routeSegment: 'accessories',
  titleKu: 'ئاکسسواری',
  titleEn: 'Accessories',
  emptyIcon: '🎒',
  cardIcon: '🎒',
  filters: [
    // No accessory-specific server-side filters exist yet — search + price
    // (defined generically in ListingTypeClient) are all that's real today.
  ],
  displayFields: ['brand', 'model', 'condition', 'color', 'material', 'weight', 'dimensions'],
};
