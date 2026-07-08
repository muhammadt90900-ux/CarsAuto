/**
 * apps/api/src/modules/ai/comparison/comparison.service.ts
 *
 * Prompt 6 — AI Vehicle Comparison.
 *
 * PAUSED PER THE SOURCE PROMPT'S OWN INSTRUCTION: only compareListing()
 * (the diff builder) is written here — generateSummary() is deliberately
 * NOT written yet. Diff shape below first, for confirmation, before the
 * summary prompt gets built around it.
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

const MIN_LISTINGS = 2;
const MAX_LISTINGS = 3;

export interface ListingDiffRow {
  listingId: string;
  title: string; // English title — fallback for the summary prompt; UI can swap in locale-specific title separately
  price: string; // Decimal serialized as string — see note in compareListing()
  currency: string;
  brand: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  mileageKm: number | null;
  bodyType: string | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  condition: string | null;
  engineLabel: string | null;
  powerKw: number | null;
  doors: number | null;
  seats: number | null;
  color: string | null;
}

export interface ListingDiff {
  listings: ListingDiffRow[];
  // Fields where not all listings share the same value — the summary
  // prompt should focus on these, not restate identical specs.
  differingFields: string[];
}

@Injectable()
export class ComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  async compareListing(listingIds: string[]): Promise<ListingDiff> {
    const uniqueIds = [...new Set(listingIds)];

    if (uniqueIds.length < MIN_LISTINGS || uniqueIds.length > MAX_LISTINGS) {
      throw new BadRequestException(`Provide ${MIN_LISTINGS}-${MAX_LISTINGS} distinct listing ids`);
    }

    const listings = await this.prisma.db('read').listing.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      select: {
        id: true,
        price: true,
        currency: true,
        translations: { where: { locale: 'en' }, select: { title: true }, take: 1 },
        vehicleSpec: {
          select: {
            year: true,
            mileageKm: true,
            bodyType: true,
            fuelType: true,
            transmission: true,
            drivetrain: true,
            condition: true,
            engineLabel: true,
            powerKw: true,
            doors: true,
            seats: true,
            color: true,
            brand: { select: { nameEn: true } },
            model: { select: { nameEn: true } },
            trim: { select: { name: true } },
          },
        },
      },
    });

    if (listings.length !== uniqueIds.length) {
      const foundIds = new Set(listings.map((l: { id: string }) => l.id));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Listing(s) not found or deleted: ${missing.join(', ')}`);
    }

    // Preserve the caller's requested order (findMany with `in` doesn't
    // guarantee it) — matters for a stable left-to-right comparison table.
    const byId = new Map(listings.map((l: any) => [l.id, l]));
    const ordered = uniqueIds.map((id) => byId.get(id));

    const rows: ListingDiffRow[] = ordered.map((l: any) => ({
      listingId: l.id,
      title: l.translations[0]?.title ?? '(no English title)',
      // Prisma Decimal → string, not number: avoids silent float precision
      // loss on a value the summary prompt will quote back to the user
      // (same reasoning as this schema's own price column comment).
      price: l.price.toString(),
      currency: l.currency,
      brand: l.vehicleSpec?.brand?.nameEn ?? null,
      model: l.vehicleSpec?.model?.nameEn ?? null,
      trim: l.vehicleSpec?.trim?.name ?? null,
      year: l.vehicleSpec?.year ?? null,
      mileageKm: l.vehicleSpec?.mileageKm ?? null,
      bodyType: l.vehicleSpec?.bodyType ?? null,
      fuelType: l.vehicleSpec?.fuelType ?? null,
      transmission: l.vehicleSpec?.transmission ?? null,
      drivetrain: l.vehicleSpec?.drivetrain ?? null,
      condition: l.vehicleSpec?.condition ?? null,
      engineLabel: l.vehicleSpec?.engineLabel ?? null,
      powerKw: l.vehicleSpec?.powerKw ?? null,
      doors: l.vehicleSpec?.doors ?? null,
      seats: l.vehicleSpec?.seats ?? null,
      color: l.vehicleSpec?.color ?? null,
    }));

    const differingFields = this.computeDifferingFields(rows);

    return { listings: rows, differingFields };
  }

  private computeDifferingFields(rows: ListingDiffRow[]): string[] {
    if (rows.length < 2) return [];
    const keys = Object.keys(rows[0]).filter((k) => k !== 'listingId') as Array<keyof ListingDiffRow>;
    return keys.filter((key) => {
      const values = rows.map((r) => r[key]);
      return new Set(values.map((v) => JSON.stringify(v))).size > 1;
    });
  }
}
