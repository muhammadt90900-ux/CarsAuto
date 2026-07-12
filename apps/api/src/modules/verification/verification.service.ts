/**
 * apps/api/src/modules/verification/verification.service.ts
 *
 * Trust & Safety Prompt 2 — individual (private-seller) KYC. This is the
 * User-role equivalent of Dealer.status/verifiedAt/verifiedBy — that dealer
 * flow is untouched by this file.
 *
 * KNOWN GAP, flagged not worked around: IdVerification.userId is @unique
 * (Prompt 1 schema) — one row per user, re-submission after REJECTED/
 * EXPIRED overwrites it in place (see submit() below). UserBadge has NO
 * unique constraint on (userId, code), so approve() below does an
 * app-level existence check before awarding ID_VERIFIED to avoid duplicate
 * badge rows. That's a real gap in the Prompt 1 schema, not a limitation
 * of this service — worth a follow-up migration adding
 * @@unique([userId, code]) if a badge-issuing job (Prompt 6) also needs to
 * avoid duplicates without an app-level check like this one.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadService, RawUploadedFile } from '../../common/upload/upload.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentType } from './dto/submit-verification.dto';

export interface VerificationFilesInput {
  documentFront: RawUploadedFile;
  documentBack?: RawUploadedFile;
  selfie: RawUploadedFile;
}

const ID_VERIFIED_BADGE_CODE = 'ID_VERIFIED';

// Re-verify roughly every 2 years — mirrors how long a real national ID /
// passport stays valid enough to trust without a fresh check. Admins can
// still manually re-trigger sooner via reject(); this is just the default
// forward clock started at approval time.
const VERIFICATION_VALIDITY_MS = 2 * 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Seller-facing ──────────────────────────────────────────────────────

  /**
   * Submit (or re-submit) ID verification. Uploads go straight through
   * UploadService.processImageUpload() with folder type 'verification' —
   * deliberately NOT via POST /upload/image, which blocks role USER
   * entirely (see UploadService.processImageUpload's doc comment).
   */
  async submit(
    userId: string,
    documentType: DocumentType,
    files: VerificationFilesInput,
  ) {
    if (!files.documentFront) {
      throw new BadRequestException(
        'وێنەی پێشەوەی بەڵگەنامە پێویستە / Front-of-document photo is required',
      );
    }
    if (!files.selfie) {
      throw new BadRequestException(
        'وێنەی سێلفی پێویستە / Selfie photo is required',
      );
    }
    if (documentType !== 'PASSPORT' && !files.documentBack) {
      // Passports are single-page; national ID / driving license need both sides.
      throw new BadRequestException(
        'وێنەی پشتی بەڵگەنامە پێویستە بۆ ئەم جۆرە بەڵگەنامەیە / ' +
          'Back-of-document photo is required for this document type',
      );
    }

    const existing = await this.prisma.idVerification.findUnique({ where: { userId } });
    if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
      throw new ConflictException(
        existing.status === 'PENDING'
          ? 'داواکارییەکەت لە چاوەڕوانیدایە بۆ پێداچوونەوە / Your verification is already pending review'
          : 'ناسنامەت پێشتر پشتڕاست کراوەتەوە / Your identity is already verified',
      );
    }

    // Uploads happen before the DB write so a failed upload never leaves a
    // half-submitted row — same ordering UploadController uses.
    const [front, back, selfie] = await Promise.all([
      this.uploadService.processImageUpload(files.documentFront, 'verification'),
      files.documentBack
        ? this.uploadService.processImageUpload(files.documentBack, 'verification')
        : Promise.resolve(null),
      this.uploadService.processImageUpload(files.selfie, 'verification'),
    ]);

    const data = {
      documentType,
      documentFrontUrl: front.url,
      documentBackUrl: back?.url ?? null,
      selfieUrl: selfie.url,
      status: 'PENDING',
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      submittedAt: new Date(),
      expiresAt: null,
    };

    // upsert: first submission creates the 1:1 row; a REJECTED/EXPIRED
    // re-submission overwrites it in place rather than appending — see
    // IdVerification's schema comment (Prompt 1) for why this is append-
    // free by design, unlike DuplicateListingFlag/SuspiciousActivityEvent.
    const record = await this.prisma.idVerification.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    this.logger.log(`ID verification submitted by user ${userId} (${documentType})`);
    return this.toStatusView(record);
  }

  async getMyStatus(userId: string) {
    const record = await this.prisma.idVerification.findUnique({ where: { userId } });
    if (!record) return { status: 'NOT_SUBMITTED' as const };
    return this.toStatusView(record);
  }

  // ── Admin-facing ───────────────────────────────────────────────────────

  /** Oldest-pending-first review queue — mirrors FraudController.queue()'s pagination shape. */
  async getQueue(page: number, limit: number, status = 'PENDING') {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [data, total] = await Promise.all([
      this.prisma.idVerification.findMany({
        where: { status },
        orderBy: { submittedAt: 'asc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } } },
      }),
      this.prisma.idVerification.count({ where: { status } }),
    ]);

    return { data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  async approve(verificationId: string, adminId: string) {
    const record = await this.prisma.idVerification.findUnique({ where: { id: verificationId } });
    if (!record) throw new NotFoundException('Verification request not found');
    if (record.status !== 'PENDING') {
      throw new ConflictException(`Cannot approve a request with status ${record.status}`);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + VERIFICATION_VALIDITY_MS);

    const [updated] = await this.prisma.$transaction([
      this.prisma.idVerification.update({
        where: { id: verificationId },
        data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: now, expiresAt },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { identityVerifiedAt: now },
      }),
    ]);

    await this.awardBadgeIfMissing(record.userId);

    await this.notifications.create(
      record.userId,
      'IDENTITY_VERIFIED',
      'ناسنامەت پشتڕاست کرایەوە / Identity Verified',
      'داواکارییەکەت بۆ پشتڕاستکردنەوەی ناسنامە قبوڵ کرا. / Your identity verification was approved.',
      { verificationId },
    );

    this.logger.log(`ID verification ${verificationId} approved by admin ${adminId}`);
    return updated;
  }

  async reject(verificationId: string, adminId: string, reason: string) {
    const record = await this.prisma.idVerification.findUnique({ where: { id: verificationId } });
    if (!record) throw new NotFoundException('Verification request not found');
    if (record.status !== 'PENDING') {
      throw new ConflictException(`Cannot reject a request with status ${record.status}`);
    }

    const updated = await this.prisma.idVerification.update({
      where: { id: verificationId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.notifications.create(
      record.userId,
      'IDENTITY_REJECTED',
      'داواکارییەکەت ڕەتکرایەوە / Verification Rejected',
      reason,
      { verificationId, reason },
    );

    this.logger.log(`ID verification ${verificationId} rejected by admin ${adminId}: ${reason}`);
    return updated;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async awardBadgeIfMissing(userId: string): Promise<void> {
    const alreadyHas = await this.prisma.userBadge.findFirst({
      where: { userId, code: ID_VERIFIED_BADGE_CODE },
      select: { id: true },
    });
    if (alreadyHas) return;

    await this.prisma.userBadge.create({
      data: { userId, code: ID_VERIFIED_BADGE_CODE },
    });
  }

  /** Never leak document/selfie URLs to the seller-facing status endpoint — admin queue only. */
  private toStatusView(record: {
    status: string;
    documentType: string;
    submittedAt: Date;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    expiresAt: Date | null;
  }) {
    return {
      status: record.status,
      documentType: record.documentType,
      submittedAt: record.submittedAt,
      reviewedAt: record.reviewedAt,
      rejectionReason: record.rejectionReason,
      expiresAt: record.expiresAt,
    };
  }
}
