// apps/api/src/common/upload/upload.controller.ts
//
// Secure multipart upload endpoints with rate limiting.
//
// Routes:
//   POST /api/upload/image          — single image (avatar, dealer logo, etc.)
//   POST /api/upload/images         — batch of images (listing photos, max 20)
//   DELETE /api/upload/:filename    — delete own uploaded file
//
// Rate limits (enforced here in addition to IpThrottleMiddleware):
//   - Single image: 30 uploads/minute per user
//   - Batch images: 10 batch requests/minute per user
//   - Daily cap:    200 uploads per user per 24h (prevents storage exhaustion)

import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { imageUploadOptions } from './multer.config';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Upload rate limit constants ──────────────────────────────────────────────
const SINGLE_UPLOAD_LIMIT_PER_MIN  = 30;
const BATCH_UPLOAD_LIMIT_PER_MIN   = 10;
const DAILY_UPLOAD_CAP_PER_USER    = 200;
const ONE_MINUTE_MS                = 60_000;
const ONE_DAY_MS                   = 24 * 60 * 60_000;

@Controller('upload')
@UseGuards(JwtAuthGuard)   // All upload endpoints require authentication
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly uploadService: UploadService,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /api/upload/image
   *
   * Single image upload — for avatar photos, dealer logos, etc.
   * Returns: { url, filename, width, height, size }
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file provided. Send a multipart/form-data request with field name "file".',
      );
    }

    const userId = (req as any).user?.userId ?? (req as any).user?.sub;

    // Role guard: USER (buyer) accounts cannot upload any files
    const actor = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });
    if (actor.role === 'USER') {
      throw new ForbiddenException({
        ku: 'تەنها فرۆشیار دەتوانێت فایل بار بکات',
        en: 'Only dealers can upload files',
        code: 'UPLOAD_NOT_ALLOWED',
      });
    }

    this.enforceUploadRateLimit(userId, 'single');

    // BUG #2 FIX: single upload was skipping the daily cap — only batch enforced it.
    // A user could bypass the 200/day limit by calling POST /upload/image 201 times.
    this.enforceDailyCap(userId, 1);

    const result = await this.uploadService.processImageUpload({
      originalname: file.originalname,
      mimetype:     file.mimetype,
      size:         file.size,
      buffer:       file.buffer,
    });

    this.logger.log(
      `Image uploaded: ${result.filename} (${result.size} bytes, ${result.width}×${result.height}) by user ${userId}`,
    );

    // F7 fix: persist ownership in DB instead of in-process cache.
    // Cache-only ownership reset on every restart, making the IDOR check
    // silently fail-open for all files uploaded before the last deploy.
    await this.prisma.uploadedFile.create({
      data: { filename: result.filename, userId },
    });

    return {
      url:          result.url,
      filename:     result.filename,
      width:        result.width,
      height:       result.height,
      size:         result.size,
      originalName: result.originalName,
    };
  }

  /**
   * POST /api/upload/images
   *
   * Batch image upload — for listing photos (max 20 files).
   * Returns: Array of { url, filename, width, height, size }
   */
  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 20, imageUploadOptions))
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'No files provided. Send a multipart/form-data request with field name "files".',
      );
    }

    const userId = (req as any).user?.userId ?? (req as any).user?.sub;

    // Role guard: USER (buyer) accounts cannot upload any files
    const actorBatch = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });
    if (actorBatch.role === 'USER') {
      throw new ForbiddenException({
        ku: 'تەنها فرۆشیار دەتوانێت فایل بار بکات',
        en: 'Only dealers can upload files',
        code: 'UPLOAD_NOT_ALLOWED',
      });
    }

    this.enforceUploadRateLimit(userId, 'batch');

    // Also check daily cap before processing the whole batch
    this.enforceDailyCap(userId, files.length);

    const results = await this.uploadService.processImageUploads(
      files.map(f => ({
        originalname: f.originalname,
        mimetype:     f.mimetype,
        size:         f.size,
        buffer:       f.buffer,
      })),
      20,
    );

    this.logger.log(`Batch upload: ${results.length} images processed by user ${userId}`);

    // F7 fix: persist ownership for all batch files in one DB write.
    await this.prisma.uploadedFile.createMany({
      data: results.map(r => ({ filename: r.filename, userId })),
      skipDuplicates: true,
    });

    return results.map(r => ({
      url:          r.url,
      filename:     r.filename,
      width:        r.width,
      height:       r.height,
      size:         r.size,
      originalName: r.originalName,
    }));
  }

  /**
   * DELETE /api/upload/:filename
   *
   * Remove a previously uploaded file.
   * Validates ownership via the audit trail before deletion —
   * a user can only delete files they uploaded (IDOR prevention).
   * Validates the filename before deletion (path-traversal prevention).
   */
  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('filename') filename: string, @Req() req: Request) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub;

    // Role guard: USER (buyer) accounts cannot manage uploads
    const actorDel = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });
    if (actorDel.role === 'USER') {
      throw new ForbiddenException({
        ku: 'تەنها فرۆشیار دەتوانێت فایل بار بکات',
        en: 'Only dealers can upload files',
        code: 'UPLOAD_NOT_ALLOWED',
      });
    }

    // F7 fix: fail-closed DB ownership check instead of cache-based fail-open.
    // Old code: if cache miss (after any restart) → check skipped → anyone could delete.
    // New code: if no DB record → NotFoundException; if wrong owner → ForbiddenException.
    const ownerRecord = await this.prisma.uploadedFile.findUnique({
      where: { filename },
      select: { userId: true },
    });
    if (!ownerRecord) {
      throw new ForbiddenException('You do not have permission to delete this file');
    }
    if (ownerRecord.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this file');
    }

    await this.uploadService.deleteFile(filename);
    await this.prisma.uploadedFile.delete({ where: { filename } });
    this.logger.log(`File deleted: ${filename} by user ${userId}`);
  }

  // ── Rate-limiting helpers ─────────────────────────────────────────────────

  private async enforceUploadRateLimit(userId: string, type: 'single' | 'batch'): Promise<void> {
    const limit = type === 'single' ? SINGLE_UPLOAD_LIMIT_PER_MIN : BATCH_UPLOAD_LIMIT_PER_MIN;
    const key   = `upload:${type}:${userId}`;
    const now   = Date.now();

    const cached = await this.cache.get<{ hits: number; expiresAt: number }>(key);
    const entry  = cached?.value ?? null;
    let hits: number;
    let expiresAt: number;

    if (entry) {
      hits      = entry.hits + 1;
      expiresAt = entry.expiresAt;
      await this.cache.set(key, { hits, expiresAt }, expiresAt - now);
    } else {
      hits      = 1;
      expiresAt = now + ONE_MINUTE_MS;
      await this.cache.set(key, { hits, expiresAt }, ONE_MINUTE_MS);
    }

    if (hits > limit) {
      const retryAfter = Math.ceil((expiresAt - now) / 1000);
      throw new HttpException(
        `Upload rate limit exceeded. Retry after ${retryAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async enforceDailyCap(userId: string, newCount: number): Promise<void> {
    const key = `upload:daily:${userId}`;
    const now = Date.now();

    const cached    = await this.cache.get<{ hits: number; expiresAt: number }>(key);
    const current   = cached?.value.hits ?? 0;
    const expiresAt = cached?.value.expiresAt ?? (now + ONE_DAY_MS);

    if (current + newCount > DAILY_UPLOAD_CAP_PER_USER) {
      const retryAfter = Math.ceil((expiresAt - now) / 1000);
      throw new HttpException(
        `Daily upload limit (${DAILY_UPLOAD_CAP_PER_USER} files) reached. Retry after ${retryAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.cache.set(key, { hits: current + newCount, expiresAt }, expiresAt - now);
  }
}
