// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 9 — Integration patch for apps/api/src/modules/listings/listings.service.ts
// Triggers follower notifications when a dealer's listing is created and active.
// ─────────────────────────────────────────────────────────────────────────────

// STEP 1 — Add import at the top of the file:
import { DealersService } from '../dealers/dealers.service';

// STEP 2 — Add to the constructor (alongside existing private readonly deps):
constructor(
  private readonly prisma:       PrismaService,
  private readonly cache:        CacheService,
  private readonly ai:           AiService,
  private readonly translation:  TranslationService,
  private readonly dealers:      DealersService,   // ← ADD THIS LINE
) {}

// STEP 3 — In listings.module.ts, import DealersModule so DealersService is
// injectable here. Forward-ref is required to avoid circular-import issues
// (DealersModule may later depend on ListingsModule for "latest listing" previews):
//
//   apps/api/src/modules/listings/listings.module.ts
//
//   import { forwardRef, Module } from '@nestjs/common';
//   import { DealersModule } from '../dealers/dealers.module';
//
//   @Module({
//     imports: [
//       PrismaModule,
//       forwardRef(() => DealersModule),
//       // ...other existing imports
//     ],
//     ...
//   })
//
// And in dealers.module.ts, export DealersService is already done — no change needed there
// since listings.module only needs to *consume* it, not the reverse.

// STEP 4 — Inside create(), right after the existing translation-queue block
// (after the `if (needsTranslation) { ... }` block, before `return listing;`),
// add the follower-notification trigger. Only fires for dealer-owned listings
// that go live immediately (status ACTIVE, not quarantined):

      // ── FEATURE 9: Notify dealer followers of new listing ─────────────────
      if (listing.status === 'ACTIVE') {
        // Resolve dealerId from the listing owner — only dealers have followers
        this.prisma.dealer
          .findUnique({ where: { userId: data.userId }, select: { id: true } })
          .then((dealer) => {
            if (!dealer) return; // listing owner is a private seller, not a dealer
            const title = listing.titleKu ?? listing.titleEn ?? '';
            this.dealers
              .notifyFollowersOfNewListing(dealer.id, listing.id, title)
              .catch((err: Error) => {
                this.logger.warn(
                  `Failed to notify followers for listing ${listing.id}: ${err.message}`,
                );
              });
          })
          .catch(() => {});
      }

// Full context — the end of create() should now read:

      // ── Auto-translate (background BullMQ job) ────────────────────────────
      const needsTranslation =
        !listing.titleEn ||
        listing.titleEn === listing.titleKu ||
        listing.titleEn.trim() === '';

      if (needsTranslation) {
        this.translation.queueTranslation(
          listing.id,
          listing.titleKu ?? '',
          listing.descriptionKu ?? '',
        ).catch((err: Error) => {
          this.logger.warn(`Failed to queue translation for listing ${listing.id}: ${err.message}`);
        });
      }

      // ── FEATURE 9: Notify dealer followers of new listing ─────────────────
      if (listing.status === 'ACTIVE') {
        this.prisma.dealer
          .findUnique({ where: { userId: data.userId }, select: { id: true } })
          .then((dealer) => {
            if (!dealer) return;
            const title = listing.titleKu ?? listing.titleEn ?? '';
            this.dealers
              .notifyFollowersOfNewListing(dealer.id, listing.id, title)
              .catch((err: Error) => {
                this.logger.warn(
                  `Failed to notify followers for listing ${listing.id}: ${err.message}`,
                );
              });
          })
          .catch(() => {});
      }

      return listing;
    } catch (err) {
      this.logger.error(`Failed to create listing: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

// Notes:
// - Fully fire-and-forget — never blocks the HTTP response (per project rule).
// - Quarantined listings (status UNDER_REVIEW from AI moderation) do NOT
//   trigger follower notifications — only listings that go live immediately.
// - Private sellers (no Dealer row) are silently skipped via the dealer lookup.
