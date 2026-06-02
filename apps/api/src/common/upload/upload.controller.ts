// apps/api/src/common/upload/upload.controller.ts
//
// Secure multipart upload endpoints.
//
// Routes:
//   POST /api/upload/image          — single image (avatar, dealer logo, etc.)
//   POST /api/upload/images         — batch of images (listing photos, max 20)
//   DELETE /api/upload/:filename    — delete own uploaded file

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
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { imageUploadOptions } from './multer.config';

@Controller('upload')
@UseGuards(JwtAuthGuard)   // All upload endpoints require authentication
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/upload/image
   *
   * Single image upload — for avatar photos, dealer logos, etc.
   * Returns: { url, filename, width, height, size }
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided. Send a multipart/form-data request with field name "file".');
    }

    const result = await this.uploadService.processImageUpload({
      originalname: file.originalname,
      mimetype:     file.mimetype,
      size:         file.size,
      buffer:       file.buffer,
    });

    this.logger.log(
      `Image uploaded: ${result.filename} (${result.size} bytes, ${result.width}×${result.height})`,
    );

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
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided. Send a multipart/form-data request with field name "files".');
    }

    const results = await this.uploadService.processImageUploads(
      files.map(f => ({
        originalname: f.originalname,
        mimetype:     f.mimetype,
        size:         f.size,
        buffer:       f.buffer,
      })),
      20,
    );

    this.logger.log(`Batch upload: ${results.length} images processed`);

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
   * Validates the filename before deletion (path-traversal prevention).
   */
  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('filename') filename: string) {
    await this.uploadService.deleteFile(filename);
    this.logger.log(`File deleted: ${filename}`);
  }
}
