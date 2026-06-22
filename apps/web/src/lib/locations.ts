// apps/web/src/lib/locations.ts
// Centralized country + city reference data for every location selector in
// the app (homepage hero search, marketplace filters, listing forms, the
// navbar region switcher, the footer, etc).
//
// IMPORTANT: Kurdistan is modeled as its own country, distinct from Iraq —
// each with its own, separate list of cities. Do not merge the two lists;
// add new cities to the correct country's `cities` array only.

export interface CountryInfo {
  /** Short internal code (also usable as a backend `country` value). */
  code: string;
  /** English display name — used as the value in dropdowns/selectors. */
  name: string;
  /** Kurdish display name. */
  nameKu: string;
  /** Emoji shown next to the name in switchers. Kurdistan has no ISO flag,
   *  so we use the sun from its flag instead of a fabricated country flag. */
  flag: string;
  /** Cities that belong to this country only. */
  cities: string[];
}

export const COUNTRIES_DATA: CountryInfo[] = [
  {
    code: 'KRI',
    name: 'Kurdistan',
    nameKu: 'کوردستان',
    flag: '☀️',
    cities: [
      'Erbil (Hewlêr)',
      'Sulaymaniyah (Silêmanî)',
      'Duhok',
      'Halabja',
      'Zakho',
      'Rania',
      'Koya',
      'Chamchamal',
      'Raparin',
      'Amadiya',
    ],
  },
  {
    code: 'IQ',
    name: 'Iraq',
    nameKu: 'عێراق',
    flag: '🇮🇶',
    cities: [
      'Baghdad',
      'Basra',
      'Mosul',
      'Kirkuk',
      'Najaf',
      'Karbala',
      'Nasiriyah',
      'Fallujah',
      'Ramadi',
      'Tikrit',
    ],
  },
  {
    code: 'AE',
    name: 'UAE',
    nameKu: 'ئیماڕات',
    flag: '🇦🇪',
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  },
  {
    code: 'CN',
    name: 'China',
    nameKu: 'چین',
    flag: '🇨🇳',
    cities: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen'],
  },
];

/** Flat list of country display names, in display order. */
export const COUNTRY_NAMES: string[] = COUNTRIES_DATA.map((c) => c.name);

/** Flat list of every city across all countries — for selectors that use a
 *  single "City" dropdown with no separate country filter alongside it. */
export const ALL_CITIES: string[] = COUNTRIES_DATA.flatMap((c) => c.cities);

/**
 * Cities for a given country display name. Falls back to every city when
 * no country is selected/recognized, so a bare "City" dropdown still works
 * before a country is chosen.
 */
export function getCitiesForCountry(countryName?: string): string[] {
  if (!countryName) return ALL_CITIES;
  return (
    COUNTRIES_DATA.find((c) => c.name === countryName)?.cities ?? ALL_CITIES
  );
}

/** Full country info lookup by display name. */
export function getCountryByName(countryName: string): CountryInfo | undefined {
  return COUNTRIES_DATA.find((c) => c.name === countryName);
}
