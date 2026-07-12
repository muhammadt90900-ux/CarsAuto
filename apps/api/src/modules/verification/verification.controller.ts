/**
 * apps/api/src/modules/verification/verification.controller.ts
 *
 * Trust & Safety Prompt 2 — seller-facing routes:
 *   POST /verification/submit  — submit ID + selfie for review
 *   GET  /verification/status  — check my own verification status
 *
 * Guard stack is JwtAuthGuard + EmailVerifiedGuard (not AdminGuard — these
 * are self-service routes), matching dealers.controller.ts's convention for
 * "authenticated + verified" endpoints. Multer options reused as-is from
 * multer.config.ts (imageUploadOptions) — same size/MIME transport-layer
 * defence used by the general upload endpoints.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { imageUploadOptions } from '../../common/upload/multer.config';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';

@ApiTags('Verification')
@ApiBearerAuth('bearer')
@Controller('verification')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @ApiConsumes('multipart/form-data')
  @Post('submit')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'documentFront', maxCount: 1 },
        { name: 'documentBack', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      imageUploadOptions,
    ),
  )
  async submit(
    @UploadedFiles()
    files: {
      documentFront?: Express.Multer.File[];
      documentBack?: Express.Multer.File[];
      selfie?: Express.Multer.File[];
    },
    @Body() dto: SubmitVerificationDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub;

    const documentFront = files?.documentFront?.[0];
    const documentBack = files?.documentBack?.[0];
    const selfie = files?.selfie?.[0];

    if (!documentFront || !selfie) {
      throw new BadRequestException(
        'وێنەی بەڵگەنامە و سێلفی هەردووکیان پێویستن / Both a document photo and a selfie are required',
      );
    }

    return this.verificationService.submit(userId, dto.documentType, {
      documentFront: toRawFile(documentFront),
      documentBack: documentBack ? toRawFile(documentBack) : undefined,
      selfie: toRawFile(selfie),
    });
  }

  @Get('status')
  async getStatus(@Req() req: Request) {
    const userId = (req as any).user?.userId ?? (req as any).user?.sub;
    return this.verificationService.getMyStatus(userId);
  }
}

// Matches the exact conversion the upload controller does inline for
// single-file uploads — kept as a local helper here since this controller
// needs it three times (front/back/selfie) instead of once.
function toRawFile(file: Express.Multer.File) {
  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  };
}
