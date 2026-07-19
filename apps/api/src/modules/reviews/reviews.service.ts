/**
 * apps/api/src/modules/reviews/reviews.service.ts
 *
 * Trust & Safety Prompt 7 (parts 1-2).
 *
 * ⚠️ SCOPE NOTE: "Populate Review.chatId when a review is created" assumed
 * a review-creation code path already existed — it did not. Grepped the
 * whole apps/api tree for `prisma.review.create` / any controller touching
 * reviewerId+revieweeId: the ONLY hit anywhere was trust-profile.service.ts
 * (Prompt 6), reading an aggregate. This entire module (create + list) is
 * new, not a modification of something pre-existing. Built it minimally
 * and in the established style (mirrors dealers.service.ts's createReview
 * for the sibling DealerReview feature) so Prompt 7's actual ask — populate
 * chatId at creation — has a real creation path to attach to.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserReviewDto } from './dto/create-review.dto';

// Real replacement for the homepage's previous fabricated testimonials
// (three invented named customers with fake 5★ quotes). Backed by actual
// Review rows — no name, quote, or rating here is made up.
export interface FeaturedReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  verified: boolean; // true when tied to a real prior chat between the pair
  reviewer: { name: string | null; avatar: string | null };
}

const FEATURED_MIN_RATING = 4;
const FEATURED_MIN_COMMENT_LENGTH = 20; // filters out "good", "ok", etc.

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(reviewerId: string, dto: CreateUserReviewDto) {
    if (reviewerId === dto.revieweeId) {
      throw new BadRequestException(
        'ناتوانیت خۆت هەڵسەنگێنیت / You cannot review yourself',
      );
    }

    const reviewee = await this.prisma.user.findFirst({
      where: { id: dto.revieweeId, deletedAt: null },
      select: { id: true },
    });
    if (!reviewee) throw new NotFoundException('User not found');

    // Prompt 7, part 1: look up (don't require) a prior chat between this
    // pair, either direction (reviewer could have been buyer or seller in
    // it) — most recent one if several. Populates Review.chatId so the
    // frontend can label this review "Verified Interaction"; null is a
    // perfectly valid outcome and does not block the review.
    const priorChat = await this.prisma.chat.findFirst({
      where: {
        OR: [
          { buyerId: reviewerId, sellerId: dto.revieweeId },
          { buyerId: dto.revieweeId, sellerId: reviewerId },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    try {
      const review = await this.prisma.review.create({
        data: {
          reviewerId,
          revieweeId: dto.revieweeId,
          rating: dto.rating,
          comment: dto.comment,
          chatId: priorChat?.id ?? null,
        },
      });
      return review;
    } catch (err: any) {
      // @@unique([reviewerId, revieweeId]) — one review per pair, matches
      // the schema comment's stated intent ("prevent duplicate reviews").
      if (err.code === 'P2002') {
        throw new ConflictException(
          'تۆ پێشتر هەڵسەنگاندنت بۆ ئەم بەکارهێنەرە نووسیوە / You have already reviewed this user',
        );
      }
      this.logger.error(`Failed to create review: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  /** Public — used by profile pages. "Verified Interaction" is just `chatId !== null` on each row; no separate flag needed. */
  async findByReviewee(revieweeId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { revieweeId },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          chatId: true,
          reviewer: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.review.count({ where: { revieweeId } }),
    ]);

    return { data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  /**
   * Public, unauthenticated — powers the homepage testimonials section.
   * Previously that section showed three fabricated named customers with
   * invented 5★ quotes. This returns real reviews only: rating >= 4, a
   * comment substantial enough to be a genuine quote (not "good" / "ok"),
   * preferring reviews tied to an actual prior chat between the reviewer
   * and reviewee ("Verified Interaction"). No row here is invented — if
   * there aren't enough qualifying real reviews yet, this returns fewer
   * than `limit` (or none), and the frontend hides the section rather
   * than padding it with fakes.
   */
  async findFeatured(limit = 6): Promise<FeaturedReview[]> {
    const take = Math.min(12, Math.max(1, limit));
    const selectFields = {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      chatId: true,
      reviewer: { select: { name: true, avatar: true } },
    } as const;

    const verified = await this.prisma.review.findMany({
      where: { rating: { gte: FEATURED_MIN_RATING }, chatId: { not: null } },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: take * 2, // over-fetch since we filter comment length in-app
      select: selectFields,
    });

    let results = verified.filter(
      (r) => r.comment.trim().length >= FEATURED_MIN_COMMENT_LENGTH,
    );

    if (results.length < take) {
      const unverified = await this.prisma.review.findMany({
        where: {
          rating: { gte: FEATURED_MIN_RATING },
          chatId: null,
          id: { notIn: results.map((r) => r.id) },
        },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        take: (take - results.length) * 2,
        select: selectFields,
      });
      results = [
        ...results,
        ...unverified.filter(
          (r) => r.comment.trim().length >= FEATURED_MIN_COMMENT_LENGTH,
        ),
      ];
    }

    return results.slice(0, take).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      verified: r.chatId != null,
      reviewer: { name: r.reviewer.name, avatar: r.reviewer.avatar },
    }));
  }
}
