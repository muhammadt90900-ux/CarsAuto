// prisma/seed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Automotive Seeder — generates 3,000+ realistic listings across countries.
//
// Architecture:
//   1. Reference data  → CarBrand / CarModel / CarModelGeneration / CarTrim
//   2. Infrastructure  → Location / Category / User
//   3. Listings        → CAR / MOTORCYCLE / SPARE_PART with vehicle specs
//
// Run: npx ts-node --project tsconfig.seed.json prisma/seed.ts
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  BRANDS,
  MODELS,
  type BrandSeed,
  type ModelSeed,
} from './data-brands';
import {
  LOCATIONS,
  USERS,
  COLORS,
  CAR_IMAGE_POOLS,
  SPARE_PARTS,
  CAR_LISTING_TEMPLATES,
  type LocationSeed,
} from './data-listings';

const prisma = new PrismaClient();

// ─── RNG helpers ──────────────────────────────────────────────────────────────

function rng(seed: number): number {
  // Simple deterministic LCG so seeds are reproducible
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

let _seq = 0;
function rand(): number {
  return rng(++_seq);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randPrice(base: number, spread = 0.15): number {
  const factor = 1 + (rand() * 2 - 1) * spread;
  return Math.round(base * factor / 100) * 100;
}

/** Round-robin index across an array with deterministic spread */
function roundRobin<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

// ─── Image helpers ────────────────────────────────────────────────────────────

function imagesForBodyType(bodyType: string, fuelType: string, count = 4): string[] {
  let pool: string[];
  if (fuelType === 'ELECTRIC') pool = CAR_IMAGE_POOLS.electric;
  else if (['SUV', 'CROSSOVER'].includes(bodyType)) pool = CAR_IMAGE_POOLS.suv;
  else if (bodyType === 'PICKUP_TRUCK') pool = CAR_IMAGE_POOLS.pickup;
  else if (['SEDAN', 'COUPE', 'CONVERTIBLE'].includes(bodyType)) pool = CAR_IMAGE_POOLS.sedan;
  else if (bodyType === 'HATCHBACK') pool = CAR_IMAGE_POOLS.hatchback;
  else pool = CAR_IMAGE_POOLS.sedan;

  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[i % pool.length]);
}

// ─── Condition/mileage helper ─────────────────────────────────────────────────

interface ConditionSpec {
  condition: 'NEW' | 'USED' | 'SALVAGE';
  mileageKm: number;
  mileageDiscount: number; // price multiplier
}

function deriveCondition(year: number): ConditionSpec {
  const age = 2025 - year;
  if (age <= 0) return { condition: 'NEW', mileageKm: randInt(0, 500), mileageDiscount: 1.0 };
  if (age === 1) return { condition: 'USED', mileageKm: randInt(5_000, 25_000), mileageDiscount: 0.88 };
  if (age <= 3) return { condition: 'USED', mileageKm: randInt(20_000, 60_000), mileageDiscount: 0.78 };
  if (age <= 6) return { condition: 'USED', mileageKm: randInt(55_000, 120_000), mileageDiscount: 0.65 };
  if (age <= 10) return { condition: 'USED', mileageKm: randInt(100_000, 200_000), mileageDiscount: 0.50 };
  if (age <= 15) return { condition: 'USED', mileageKm: randInt(180_000, 300_000), mileageDiscount: 0.35 };
  return { condition: 'SALVAGE', mileageKm: randInt(250_000, 500_000), mileageDiscount: 0.20 };
}

// ─── Base prices per brand (USD) ──────────────────────────────────────────────

const BRAND_BASE_PRICE: Record<string, number> = {
  toyota: 28_000, honda: 24_000, nissan: 22_000, mitsubishi: 21_000,
  mazda: 23_000, subaru: 25_000, lexus: 55_000, isuzu: 30_000,
  bmw: 52_000, 'mercedes-benz': 58_000, volkswagen: 32_000, audi: 48_000, porsche: 90_000,
  ford: 30_000, chevrolet: 34_000, jeep: 40_000, cadillac: 65_000,
  hyundai: 22_000, kia: 21_000, genesis: 45_000,
  byd: 35_000, chery: 18_000, haval: 22_000,
  'land-rover': 75_000, jaguar: 65_000,
  fiat: 17_000, 'alfa-romeo': 38_000,
  renault: 19_000, peugeot: 20_000,
};

// ─── Status distribution ───────────────────────────────────────────────────────

const STATUS_WEIGHTS = [
  { status: 'ACTIVE',  weight: 70 },
  { status: 'SOLD',    weight: 18 },
  { status: 'DRAFT',   weight: 5  },
  { status: 'EXPIRED', weight: 5  },
  { status: 'PENDING', weight: 2  },
];

function pickStatus(): string {
  const total = STATUS_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = rand() * total;
  for (const { status, weight } of STATUS_WEIGHTS) {
    r -= weight;
    if (r <= 0) return status;
  }
  return 'ACTIVE';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEEDER
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting automotive seed...\n');

  // ── 0. Clear existing seed data (idempotent) ──────────────────────────────
  console.log('  🗑  Clearing previous seed data...');
  await prisma.$transaction([
    prisma.image.deleteMany(),
    prisma.partCompatibility.deleteMany(),
    prisma.listingVehicleSpec.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.category.deleteMany(),
    prisma.location.deleteMany(),
    prisma.user.deleteMany(),
    prisma.carTrim.deleteMany(),
    prisma.carModelGeneration.deleteMany(),
    prisma.carModel.deleteMany(),
    prisma.carBrand.deleteMany(),
  ]);

  // ── 1. Seed brands ─────────────────────────────────────────────────────────
  console.log('  🏭 Seeding brands...');
  const brandMap = new Map<string, string>(); // slug → id

  for (const b of BRANDS) {
    const brand = await prisma.carBrand.create({
      data: {
        slug: b.slug, nameEn: b.nameEn, nameAr: b.nameAr,
        nameKu: b.nameKu, nameZh: b.nameZh,
        countryCode: b.countryCode, logoUrl: b.logoUrl,
      },
    });
    brandMap.set(b.slug, brand.id);
  }
  console.log(`     → ${BRANDS.length} brands created`);

  // ── 2. Seed models + generations + trims ──────────────────────────────────
  console.log('  🚗 Seeding models, generations & trims...');
  const modelMap  = new Map<string, string>(); // brandSlug:modelSlug → modelId
  const trimIds:  string[] = [];

  // trimMeta is keyed by trimId and stores spec metadata for later use
  const trimMeta = new Map<string, {
    brandId: string; modelId: string; brandSlug: string;
    bodyType: string; fuelType: string; transmission: string;
    drivetrain: string; engineCC?: number; engineLabel?: string;
    powerKw?: number; doors?: number; seats?: number;
    yearFrom: number; yearTo?: number;
  }>();

  let totalTrims = 0;

  for (const m of MODELS) {
    const brandId = brandMap.get(m.brandSlug);
    if (!brandId) continue;

    const model = await prisma.carModel.create({
      data: {
        brandId, slug: m.slug,
        nameEn: m.nameEn, nameAr: m.nameAr, nameKu: m.nameKu, nameZh: m.nameZh,
      },
    });
    const modelKey = `${m.brandSlug}:${m.slug}`;
    modelMap.set(modelKey, model.id);

    for (const gen of m.generations) {
      const generation = await prisma.carModelGeneration.create({
        data: {
          modelId: model.id,
          name: gen.name ?? null,
          yearFrom: gen.yearFrom,
          yearTo: gen.yearTo ?? null,
        },
      });

      for (const t of gen.trims) {
        const trim = await prisma.carTrim.create({
          data: {
            generationId: generation.id,
            name: t.name,
            bodyType: t.bodyType as any,
            fuelType: t.fuelType as any,
            transmission: t.transmission as any,
            drivetrain: t.drivetrain as any,
            engineCC: t.engineCC ?? null,
            engineLabel: t.engineLabel ?? null,
            powerKw: t.powerKw ?? null,
            doors: t.doors ?? null,
            seats: t.seats ?? null,
          },
        });
        trimIds.push(trim.id);
        trimMeta.set(trim.id, {
          brandId, modelId: model.id, brandSlug: m.brandSlug,
          bodyType: t.bodyType, fuelType: t.fuelType,
          transmission: t.transmission, drivetrain: t.drivetrain,
          engineCC: t.engineCC, engineLabel: t.engineLabel,
          powerKw: t.powerKw, doors: t.doors, seats: t.seats,
          yearFrom: gen.yearFrom, yearTo: gen.yearTo,
        });
        totalTrims++;
      }
    }
  }
  console.log(`     → ${MODELS.length} models, ${totalTrims} trims created`);

  // ── 3. Seed categories ────────────────────────────────────────────────────
  console.log('  📂 Seeding categories...');
  const catCars = await prisma.category.create({
    data: { slug: 'cars', nameKu: 'ئۆتۆمبێل', nameAr: 'سيارات', nameEn: 'Cars', nameZh: '汽车', icon: '🚗' },
  });
  const catMoto = await prisma.category.create({
    data: { slug: 'motorcycles', nameKu: 'مۆتۆسیکلەت', nameAr: 'دراجات نارية', nameEn: 'Motorcycles', nameZh: '摩托车', icon: '🏍️' },
  });
  const catParts = await prisma.category.create({
    data: { slug: 'spare-parts', nameKu: 'پارچەی یەدەک', nameAr: 'قطع غيار', nameEn: 'Spare Parts', nameZh: '配件', icon: '🔧' },
  });
  // Sub-categories for cars
  await Promise.all([
    prisma.category.create({ data: { slug: 'cars-sedans', nameKu: 'سێدان', nameAr: 'سيدان', nameEn: 'Sedans', nameZh: '轿车', parentId: catCars.id } }),
    prisma.category.create({ data: { slug: 'cars-suvs', nameKu: 'ئێس یو ڤی', nameAr: 'إس يو في', nameEn: 'SUVs', nameZh: 'SUV', parentId: catCars.id } }),
    prisma.category.create({ data: { slug: 'cars-trucks', nameKu: 'پیکاپ', nameAr: 'بيك أب', nameEn: 'Trucks', nameZh: '皮卡', parentId: catCars.id } }),
    prisma.category.create({ data: { slug: 'cars-electric', nameKu: 'کارەبایی', nameAr: 'كهربائية', nameEn: 'Electric', nameZh: '电动车', parentId: catCars.id } }),
  ]);
  console.log('     → Categories created');

  // ── 4. Seed locations ─────────────────────────────────────────────────────
  console.log('  📍 Seeding locations...');
  const locationIds: string[] = [];
  const locationMap = new Map<string, string>(); // country → first locationId for that country

  for (const loc of LOCATIONS) {
    const l = await prisma.location.create({
      data: {
        country: loc.country, governorate: loc.governorate ?? null,
        city: loc.city, nameKu: loc.nameKu, nameAr: loc.nameAr,
        nameEn: loc.nameEn, nameZh: loc.nameZh, lat: loc.lat, lng: loc.lng,
      },
    });
    locationIds.push(l.id);
    if (!locationMap.has(loc.country)) locationMap.set(loc.country, l.id);
  }
  console.log(`     → ${locationIds.length} locations created`);

  // Location lookup by index
  const locById = new Map(LOCATIONS.map((loc, i) => [locationIds[i], loc]));

  // ── 5. Seed users ──────────────────────────────────────────────────────────
  console.log('  👤 Seeding users...');
  const userIds: string[] = [];
  const userCountryMap = new Map<string, string>(); // userId → countryHint

  const seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword) {
    throw new Error(
      'SEED_USER_PASSWORD env var is not set. ' +
      'Add it to apps/api/.env before running the seed. ' +
      'Example: SEED_USER_PASSWORD=DevSeedPass@local',
    );
  }
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        email: u.email, phone: u.phone ?? null,
        name: u.name, avatar: u.avatar,
        role: u.role as any, locale: u.locale,
        verified: u.verified, password: passwordHash,
      },
    });
    userIds.push(user.id);
    userCountryMap.set(user.id, u.countryHint);
  }
  console.log(`     → ${userIds.length} users created`);

  // ── 6. Seed CAR listings (2,500 target) ───────────────────────────────────
  console.log('  🚘 Seeding car listings...');

  // Build weighted trim selection — popular brands generate more listings
  const BRAND_WEIGHT: Record<string, number> = {
    toyota: 20, nissan: 12, hyundai: 8, kia: 7, mitsubishi: 7,
    'mercedes-benz': 8, bmw: 7, honda: 6, ford: 5, chevrolet: 5,
    lexus: 5, jeep: 4, land-rover: 3, porsche: 2, cadillac: 2,
    byd: 2, haval: 2, volkswagen: 1, audi: 1,
  };

  const weightedTrimIds: string[] = [];
  for (const [trimId, meta] of trimMeta.entries()) {
    const weight = BRAND_WEIGHT[meta.brandSlug] ?? 1;
    for (let w = 0; w < weight; w++) weightedTrimIds.push(trimId);
  }

  const TARGET_CAR_LISTINGS = 2500;
  let carCount = 0;

  // Batch insert: process in chunks to avoid memory spikes
  const BATCH = 100;
  for (let batch = 0; batch < Math.ceil(TARGET_CAR_LISTINGS / BATCH); batch++) {
    const creates: Promise<any>[] = [];
    const batchSize = Math.min(BATCH, TARGET_CAR_LISTINGS - carCount);

    for (let i = 0; i < batchSize; i++) {
      const listingIndex = carCount + i;

      // Pick trim deterministically spread across weighted pool
      const trimId = roundRobin(weightedTrimIds, listingIndex + randInt(0, 5));
      const meta = trimMeta.get(trimId)!;

      // Year selection: prefer recent years, allow up to current
      const yearSpread = meta.yearTo ? meta.yearTo - meta.yearFrom : 2025 - meta.yearFrom;
      const yearOffset = Math.floor(rand() * (yearSpread + 1));
      const year = Math.min(meta.yearFrom + yearOffset, 2025);

      const condSpec = deriveCondition(year);
      const color = pick(COLORS);
      const locationIndex = listingIndex % locationIds.length;
      const locationId = locationIds[locationIndex];
      const locData = locById.get(locationId)!;

      // Price calculation
      const base = BRAND_BASE_PRICE[meta.brandSlug] ?? 20_000;
      const ageFactor = condSpec.mileageDiscount;
      const locFactor = locData.priceMultiplier;
      const price = randPrice(base * ageFactor * locFactor, 0.12);

      const userId = roundRobin(userIds, listingIndex);
      const template = roundRobin(CAR_LISTING_TEMPLATES, listingIndex);
      const images = imagesForBodyType(meta.bodyType, meta.fuelType, randInt(2, 5));

      // Build brand/model name strings for the template
      const brandSeed = BRANDS.find(b => b.slug === meta.brandSlug)!;
      const modelSeed = MODELS.find(m => trimMeta.get(trimId)?.modelId &&
        modelMap.get(`${m.brandSlug}:${m.slug}`) === trimMeta.get(trimId)!.modelId);

      const brandNameEn = brandSeed?.nameEn ?? 'Brand';
      const brandNameAr = brandSeed?.nameAr ?? 'Brand';
      const brandNameKu = brandSeed?.nameKu ?? 'Brand';
      const modelNameEn = modelSeed?.nameEn ?? 'Model';
      const modelNameAr = modelSeed?.nameAr ?? 'Model';
      const modelNameKu = modelSeed?.nameKu ?? 'Model';

      // Trim name object for templates
      const trimName = (trimMeta.get(trimId) as any)?.name ?? '';

      const categoryId = ['SUV', 'CROSSOVER'].includes(meta.bodyType)
        ? catCars.id
        : meta.bodyType === 'PICKUP_TRUCK'
          ? catCars.id
          : catCars.id;

      creates.push(
        prisma.listing.create({
          data: {
            type: 'CAR',
            status: pickStatus() as any,
            userId,
            titleKu: template.titleKu(brandNameKu, modelNameKu, year, trimName),
            titleAr: template.titleAr(brandNameAr, modelNameAr, year, trimName),
            titleEn: template.titleEn(brandNameEn, modelNameEn, year, trimName),
            titleZh: template.titleZh(brandNameEn, modelNameEn, year, trimName),
            descriptionKu: template.descKu(brandNameKu, modelNameKu, year, condSpec.mileageKm, color.ku),
            descriptionAr: template.descAr(brandNameAr, modelNameAr, year, condSpec.mileageKm, color.ar),
            descriptionEn: template.descEn(brandNameEn, modelNameEn, year, condSpec.mileageKm, color.en),
            descriptionZh: template.descZh(brandNameEn, modelNameEn, year, condSpec.mileageKm, color.en),
            price,
            currency: locData.currency,
            negotiable: rand() > 0.6,
            locationId,
            categoryId,
            views: randInt(0, 2000),
            featured: rand() > 0.92,
            vehicleSpec: {
              create: {
                trimId,
                brandId: meta.brandId,
                modelId: meta.modelId,
                year,
                bodyType: meta.bodyType as any,
                fuelType: meta.fuelType as any,
                transmission: meta.transmission as any,
                drivetrain: meta.drivetrain as any,
                engineCC: meta.engineCC ?? null,
                engineLabel: meta.engineLabel ?? null,
                powerKw: meta.powerKw ?? null,
                doors: meta.doors ?? null,
                seats: meta.seats ?? null,
                condition: condSpec.condition as any,
                mileageKm: condSpec.mileageKm,
                color: color.en,
                vin: rand() > 0.7 ? `VIN${String(listingIndex).padStart(11, '0')}` : null,
              },
            },
            images: {
              create: images.map((url, idx) => ({
                url, isCover: idx === 0, order: idx,
              })),
            },
          },
        })
      );
    }

    await Promise.all(creates);
    carCount += batchSize;
    process.stdout.write(`\r     → ${carCount}/${TARGET_CAR_LISTINGS} car listings...`);
  }
  console.log(`\n     ✓ ${carCount} car listings created`);

  // ── 7. Seed SPARE PARTS listings (400 target) ────────────────────────────
  console.log('  🔧 Seeding spare part listings...');
  const TARGET_PARTS = 400;
  let partsCount = 0;

  for (let i = 0; i < TARGET_PARTS; i++) {
    const part = roundRobin(SPARE_PARTS, i);
    const userId = roundRobin(userIds, i + 1);
    const locationId = roundRobin(locationIds, i);
    const locData = locById.get(locationId)!;
    const price = randPrice(part.basePriceUsd * locData.priceMultiplier, 0.20);
    const images = pickN(CAR_IMAGE_POOLS.spare, 2);

    // Find compatible brands/models
    const compatBrandSlug = pick(part.compatibleBrands);
    const compatBrandId = brandMap.get(compatBrandSlug);

    await prisma.listing.create({
      data: {
        type: 'SPARE_PART',
        status: pickStatus() as any,
        userId,
        titleKu: part.nameKu,
        titleAr: part.nameAr,
        titleEn: part.nameEn,
        titleZh: part.nameZh,
        descriptionKu: part.descKu,
        descriptionAr: part.descAr,
        descriptionEn: part.descEn,
        descriptionZh: part.descZh,
        price,
        currency: locData.currency,
        negotiable: rand() > 0.5,
        locationId,
        categoryId: catParts.id,
        partNumber: `${part.partNumber}-${String(i).padStart(4, '0')}`,
        views: randInt(0, 500),
        featured: rand() > 0.95,
        images: {
          create: images.map((url, idx) => ({ url, isCover: idx === 0, order: idx })),
        },
        partCompatibility: compatBrandId ? {
          create: [{
            brandId: compatBrandId,
            yearFrom: randInt(2005, 2018),
            yearTo: randInt(2019, 2025),
            notes: `Compatible with ${compatBrandSlug} models`,
          }],
        } : undefined,
      },
    });
    partsCount++;
  }
  console.log(`     ✓ ${partsCount} spare part listings created`);

  // ── 8. Seed MOTORCYCLE listings (100 target) ─────────────────────────────
  console.log('  🏍️  Seeding motorcycle listings...');
  const MOTO_BRANDS = [
    { nameEn: 'Honda CBR', nameAr: 'هوندا CBR', nameKu: 'هۆندا CBR', nameZh: '本田CBR', price: 8_000 },
    { nameEn: 'Yamaha R1', nameAr: 'ياماها R1', nameKu: 'یاماها R1', nameZh: '雅马哈R1', price: 15_000 },
    { nameEn: 'Kawasaki Ninja', nameAr: 'كاواساكي نينجا', nameKu: 'کاواساکی نینجا', nameZh: '川崎忍者', price: 12_000 },
    { nameEn: 'Suzuki GSX-R', nameAr: 'سوزوكي GSX-R', nameKu: 'سووزووکی GSX-R', nameZh: '铃木GSX-R', price: 10_000 },
    { nameEn: 'BMW R 1250', nameAr: 'بي إم دبليو R 1250', nameKu: 'BMW R 1250', nameZh: '宝马R 1250', price: 18_000 },
    { nameEn: 'Ducati Panigale', nameAr: 'دوكاتي بانيجالي', nameKu: 'دووکاتی پانیگالی', nameZh: '杜卡迪Panigale', price: 25_000 },
  ];

  const TARGET_MOTOS = 100;
  for (let i = 0; i < TARGET_MOTOS; i++) {
    const moto = roundRobin(MOTO_BRANDS, i);
    const userId = roundRobin(userIds, i + 2);
    const locationId = roundRobin(locationIds, i + 3);
    const locData = locById.get(locationId)!;
    const year = randInt(2015, 2025);
    const price = randPrice(moto.price * locData.priceMultiplier, 0.18);

    await prisma.listing.create({
      data: {
        type: 'MOTORCYCLE',
        status: pickStatus() as any,
        userId,
        titleKu: `${moto.nameKu} ${year}`,
        titleAr: `${moto.nameAr} ${year}`,
        titleEn: `${moto.nameEn} ${year}`,
        titleZh: `${year}款${moto.nameZh}`,
        descriptionKu: `${moto.nameKu} ساڵی ${year}، بار باشە.`,
        descriptionAr: `${moto.nameAr} موديل ${year}، حالة ممتازة.`,
        descriptionEn: `${year} ${moto.nameEn} in excellent condition.`,
        descriptionZh: `${year}年款${moto.nameZh}，状态极佳。`,
        price,
        currency: locData.currency,
        negotiable: rand() > 0.5,
        locationId,
        categoryId: catMoto.id,
        views: randInt(0, 300),
        featured: rand() > 0.95,
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&w=800', isCover: true, order: 0 },
            { url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&w=800', isCover: false, order: 1 },
          ],
        },
      },
    });
  }
  console.log(`     ✓ ${TARGET_MOTOS} motorcycle listings created`);

  // ── 9. Summary ────────────────────────────────────────────────────────────
  const [totalListings, totalUsers, totalBrands] = await Promise.all([
    prisma.listing.count(),
    prisma.user.count(),
    prisma.carBrand.count(),
  ]);

  console.log('\n✅ Seed complete!\n');
  console.log('  ┌─────────────────────────────────┐');
  console.log(`  │  Brands        : ${String(totalBrands).padStart(5)}            │`);
  console.log(`  │  Models        : ${String(MODELS.length).padStart(5)}            │`);
  console.log(`  │  Trims         : ${String(totalTrims).padStart(5)}            │`);
  console.log(`  │  Locations     : ${String(locationIds.length).padStart(5)}            │`);
  console.log(`  │  Users         : ${String(totalUsers).padStart(5)}            │`);
  console.log(`  │  Listings      : ${String(totalListings).padStart(5)}            │`);
  console.log('  └─────────────────────────────────┘\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
