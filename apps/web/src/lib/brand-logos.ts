// lib/brand-logos.ts
// Maps every car brand in carData.ts to its Simple Icons CDN slug and brand color.
//
// CDN format: https://cdn.simpleicons.org/{slug}/{hexColor}
//   – slug must be lowercase, no spaces, no hyphens (simple-icons convention)
//   – hexColor without '#' — e.g. "ffffff" for white, "eb0a1e" for Toyota red
//
// Brands NOT in Simple Icons get slug: null → CarBrandLogo renders text-initial fallback.

export interface BrandMeta {
  /** Simple Icons slug, or null if the brand isn't in the library */
  slug:  string | null;
  /** Hex color WITHOUT '#' — used for fallback badge bg and simpleicons color param */
  color: string;
}

/** Full lookup table — covers every brand in carData.ts */
export const BRAND_META: Record<string, BrandMeta> = {
  // ── Japanese ────────────────────────────────────────────────
  'Toyota':       { slug: 'toyota',       color: 'eb0a1e' },
  'Honda':        { slug: 'honda',        color: 'e40521' },
  'Nissan':       { slug: 'nissan',       color: 'c3002f' },
  'Mazda':        { slug: 'mazda',        color: 'e2001a' },
  'Subaru':       { slug: 'subaru',       color: '003399' },
  'Mitsubishi':   { slug: 'mitsubishi',   color: 'e60012' },
  'Suzuki':       { slug: 'suzuki',       color: 'e40521' },
  'Lexus':        { slug: 'lexus',        color: '1a1a1a' },
  'Infiniti':     { slug: 'infiniti',     color: '1a1a1a' },
  'Acura':        { slug: 'acura',        color: 'cc0000' },
  'Daihatsu':     { slug: 'daihatsu',     color: 'cc0000' },
  'Isuzu':        { slug: null,           color: 'cc0000' },

  // ── Korean ──────────────────────────────────────────────────
  'Hyundai':      { slug: 'hyundai',      color: '002c5f' },
  'Kia':          { slug: 'kia',          color: '05141f' },
  'Genesis':      { slug: 'genesis',      color: '1a1a1a' },
  'SsangYong':    { slug: null,           color: '003087' },
  'Daewoo':       { slug: null,           color: '004a97' },

  // ── German ──────────────────────────────────────────────────
  'BMW':          { slug: 'bmw',          color: '1c69d4' },
  'Mercedes-Benz':{ slug: 'mercedesbenz', color: '00adef' },
  'Audi':         { slug: 'audi',         color: 'bb0a30' },
  'Volkswagen':   { slug: 'volkswagen',   color: '151f6d' },
  'Porsche':      { slug: 'porsche',      color: 'b5a26a' },
  'Opel':         { slug: 'opel',         color: 'ffdd00' },

  // ── American ────────────────────────────────────────────────
  'Ford':         { slug: 'ford',         color: '003499' },
  'Chevrolet':    { slug: 'chevrolet',    color: 'cfb428' },
  'Dodge':        { slug: null,           color: 'cc0000' },
  'Jeep':         { slug: 'jeep',         color: '3a3a3a' },
  'RAM':          { slug: null,           color: 'cc0000' },
  'GMC':          { slug: null,           color: 'cc0000' },
  'Cadillac':     { slug: 'cadillac',     color: '284492' },
  'Buick':        { slug: null,           color: 'c0102c' },
  'Lincoln':      { slug: null,           color: '000000' },
  'Tesla':        { slug: 'tesla',        color: 'cc0000' },
  'Rivian':       { slug: 'rivian',       color: 'f7f8f8' },
  'Lucid':        { slug: null,           color: 'cc0000' },

  // ── British ─────────────────────────────────────────────────
  'Land Rover':   { slug: 'landrover',    color: '005a2b' },
  'Range Rover':  { slug: 'landrover',    color: '005a2b' },
  'Jaguar':       { slug: 'jaguar',       color: '1a1a1a' },
  'Bentley':      { slug: null,           color: '40523c' },
  'Rolls-Royce':  { slug: null,           color: '6d1a36' },
  'Aston Martin': { slug: null,           color: '004225' },
  'McLaren':      { slug: null,           color: 'ff7700' },
  'Mini':         { slug: 'mini',         color: '000000' },
  'MINI':         { slug: 'mini',         color: '000000' },

  // ── Italian ─────────────────────────────────────────────────
  'Ferrari':      { slug: 'ferrari',      color: 'da0328' },
  'Lamborghini':  { slug: 'lamborghini',  color: 'e5a100' },
  'Maserati':     { slug: null,           color: '0a3161' },
  'Alfa Romeo':   { slug: 'alfaromeo',    color: 'c00000' },
  'Fiat':         { slug: 'fiat',         color: '8b1e3f' },

  // ── French ──────────────────────────────────────────────────
  'Peugeot':      { slug: 'peugeot',      color: '00367a' },
  'Renault':      { slug: 'renault',      color: 'efdf00' },
  'Citroën':      { slug: 'citroen',      color: 'e31936' },
  'Citroen':      { slug: 'citroen',      color: 'e31936' },
  'DS Automobiles':{ slug: null,          color: '8b6914' },

  // ── Swedish ─────────────────────────────────────────────────
  'Volvo':        { slug: 'volvo',        color: '003057' },
  'Polestar':     { slug: 'polestar',     color: '0d0e13' },
  'SAAB':         { slug: null,           color: '003087' },
  'Saab':         { slug: null,           color: '003087' },

  // ── Chinese ─────────────────────────────────────────────────
  'BYD':          { slug: 'byd',          color: '1db954' },
  'Geely':        { slug: null,           color: '003087' },
  'Chery':        { slug: null,           color: 'c00000' },
  'Haval':        { slug: null,           color: 'cc0000' },
  'MG':           { slug: 'mg',           color: 'a2262a' },
  'GAC':          { slug: null,           color: '003087' },
  'BAIC':         { slug: null,           color: '003087' },
  'Changan':      { slug: null,           color: 'cc0000' },
  'JAC':          { slug: null,           color: '003087' },
  'Dongfeng':     { slug: null,           color: 'cc0000' },
  'Lynk & Co':    { slug: null,           color: '00c8c8' },
  'Great Wall':   { slug: null,           color: 'cc0000' },

  // ── Spanish ─────────────────────────────────────────────────
  'SEAT':         { slug: 'seat',         color: 'f9b900' },

  // ── Czech ───────────────────────────────────────────────────
  'Škoda':        { slug: 'skoda',        color: '4ba82e' },
  'Skoda':        { slug: 'skoda',        color: '4ba82e' },

  // ── Romanian ────────────────────────────────────────────────
  'Dacia':        { slug: 'dacia',        color: '00a6df' },

  // ── Iranian ─────────────────────────────────────────────────
  'Iran Khodro':  { slug: null,           color: '003087' },
  'SAIPA':        { slug: null,           color: 'c00000' },
};

/** CDN base for Simple Icons */
const SI_CDN = 'https://cdn.simpleicons.org';

/**
 * Normalise a brand name so it matches a BRAND_META key.
 * Handles:
 *  - Bilingual strings like "تۆیۆتا / Toyota" → "Toyota"
 *  - Slight capitalisation differences
 */
export function normaliseBrand(raw: string): string {
  if (!raw) return '';
  // Strip Kurdish/Arabic prefix like "تۆیۆتا / Toyota"
  const parts = raw.split(/\s*\/\s*/);
  const en = parts.find(p => /^[A-Za-z]/.test(p.trim()))?.trim() ?? raw.trim();
  return en;
}

/**
 * Returns the Simple Icons CDN URL for a brand, or null if the brand
 * is not in the library.
 *
 * @param brand  Brand name (English or bilingual)
 * @param color  Hex color WITHOUT '#' to override the default brand color.
 *               Pass 'ffffff' to get a white logo (for dark backgrounds).
 */
export function getBrandLogoUrl(brand: string, colorOverride?: string): string | null {
  const name  = normaliseBrand(brand);
  const meta  = BRAND_META[name];
  if (!meta?.slug) return null;
  const hex = colorOverride ?? meta.color;
  return `${SI_CDN}/${meta.slug}/${hex}`;
}

/** Brand hex color, falling back to a neutral dark */
export function getBrandColor(brand: string): string {
  const name = normaliseBrand(brand);
  return BRAND_META[name]?.color ?? '555555';
}

/** Initial letters for the text fallback (up to 2 chars) */
export function getBrandInitials(brand: string): string {
  const name = normaliseBrand(brand);
  return name
    .split(/[\s-&]/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
