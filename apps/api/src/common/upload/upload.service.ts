// apps/api/src/common/upload/upload.service.ts
//
// ✅ FIX: Replaced dynamic import('sharp') with static top-level import.
// Dynamic import fails in Codespaces/NestJS build because sharp is a
// native Node.js addon — must be imported at module load time, not lazily.

import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path   from 'path';
import * as fs     from 'fs/promises';
import * as crypto from 'crypto';
import * as sharp  from 'sharp';   // ✅ static import — fixes 500 on upload

export interface UploadedFileInfo {
  filename:     string;
  originalName: string;
  mimeType:     string;
  size:         number;
  url:          string;
  width?:       number;
  height?:      number;
}

export interface RawUploadedFile {
  originalname: string;
  mimetype:     string;
  size:         number;
  buffer:       Buffer;
}

interface MimeConfig {
  maxBytes:    number;
  magicChecks: Array<{ offset: number; bytes: Buffer }>;
}

const ALLOWED_IMAGE_MIMES: Record<string, MimeConfig> = {
  'image/jpeg': {
    maxBytes:    10 * 1024 * 1024,
    magicChecks: [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
  },
  'image/png': {
    maxBytes:    10 * 1024 * 1024,
    magicChecks: [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  },
  'image/webp': {
    maxBytes:    10 * 1024 * 1024,
    magicChecks: [
      { offset: 0, bytes: Buffer.from([0x52, 0x49, 0x46, 0x46]) },
      { offset: 8, bytes: Buffer.from([0x57, 0x45, 0x42, 0x50]) },
    ],
  },
};

const ABSOLUTE_MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_MAX_WIDTH    = 1920;
const IMAGE_MAX_HEIGHT   = 1080;
const WEBP_QUALITY       = 82;

const DANGEROUS_PATTERNS = [
  /\.\./,
  /[/\\]/,
  /\x00/,
  /^\.+$/,
  /\.(php|phtml|asp|aspx|jsp|jspx|cfm|cgi|pl|py|rb|sh|bash|exe|dll|bat|cmd|ps1|vbs|htaccess|htpasswd|env|config)$/i,
  /<|>|"|'|\||\?|\*/,
];

@Injectable()
export class UploadService {
  private readonly logger    = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly baseUrl:   string;

  constructor(private config: ConfigService) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR',      '/tmp/uploads');
    this.baseUrl   = this.config.get<string>('UPLOAD_BASE_URL', 'http://localhost:4000/uploads');
  }

  async processImageUpload(file: RawUploadedFile): Promise<UploadedFileInfo> {
    this.guardAbsoluteSize(file);
    this.sanitiseOriginalName(file.originalname);
    const detectedMime = this.detectMimeType(file.buffer);
    this.assertAllowedImageMime(detectedMime, file.buffer);
    const optimised = await this.optimiseImage(file.buffer);
    return this.persistFile(optimised.buffer, 'webp', file.originalname, optimised.info);
  }

  async processImageUploads(files: RawUploadedFile[], maxCount = 20): Promise<UploadedFileInfo[]> {
    if (!files || files.length === 0) return [];
    if (files.length > maxCount) {
      throw new BadRequestException(`Maximum ${maxCount} images allowed, received ${files.length}`);
    }
    return Promise.all(files.map(f => this.processImageUpload(f)));
  }

  async deleteFile(filename: string): Promise<void> {
    if (!/^[a-f0-9-]+\.(webp|jpg|jpeg|png)$/.test(filename)) {
      throw new BadRequestException('Invalid filename');
    }
    const resolved = path.resolve(path.join(this.uploadDir, filename));
    // BUG #4 FIX: add path.sep to make check consistent with persistFile —
    // without it '/tmp/uploads2/evil' passes the startsWith('/tmp/uploads') check.
    if (!resolved.startsWith(path.resolve(this.uploadDir) + path.sep)) {
      throw new BadRequestException('Path traversal detected');
    }
    try {
      await fs.unlink(resolved);
    } catch (err: any) {
      if (err.code !== 'ENOENT') this.logger.error(`Failed to delete ${filename}: ${err.message}`);
    }
  }

  private guardAbsoluteSize(file: RawUploadedFile): void {
    const size = file.buffer?.length ?? file.size ?? 0;
    if (size === 0) throw new BadRequestException('Empty file is not allowed');
    if (size > ABSOLUTE_MAX_BYTES) {
      throw new PayloadTooLargeException(`File exceeds ${ABSOLUTE_MAX_BYTES / 1024 / 1024} MB`);
    }
  }

  private sanitiseOriginalName(name: string): void {
    if (!name || typeof name !== 'string') throw new BadRequestException('Filename is required');
    if (name.length > 255) throw new BadRequestException('Filename too long');
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(name)) throw new BadRequestException(`Filename contains disallowed characters: ${name}`);
    }
  }

  private detectMimeType(buffer: Buffer): string {
    if (!buffer || buffer.length < 12) throw new BadRequestException('File too small');
    for (const [mime, cfg] of Object.entries(ALLOWED_IMAGE_MIMES)) {
      const match = cfg.magicChecks.every(({ offset, bytes }) => {
        if (buffer.length < offset + bytes.length) return false;
        return buffer.subarray(offset, offset + bytes.length).equals(bytes);
      });
      if (match) return mime;
    }
    throw new UnsupportedMediaTypeException('File type not allowed. Accepted: JPEG, PNG, WebP');
  }

  private assertAllowedImageMime(mime: string, buffer: Buffer): void {
    const cfg = ALLOWED_IMAGE_MIMES[mime];
    if (!cfg) throw new UnsupportedMediaTypeException('File type not allowed');
    if (buffer.length > cfg.maxBytes) {
      throw new PayloadTooLargeException(`${mime} exceeds ${cfg.maxBytes / 1024 / 1024} MB`);
    }
  }

  // ✅ FIX: No dynamic import — sharp used directly from top-level import.
  // Handles both ESM default export and CJS module.exports shapes.
  private async optimiseImage(
    buffer: Buffer,
  ): Promise<{ buffer: Buffer; info: { width: number; height: number } }> {
    try {
      const sharpFn = (sharp as any).default ?? sharp;
      const { data, info } = await sharpFn(buffer, { failOnError: true })
        .rotate()
        .resize(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .withMetadata({ orientation: undefined })
        .toBuffer({ resolveWithObject: true });
      return { buffer: data, info: { width: info.width, height: info.height } };
    } catch (err: any) {
      this.logger.error(`Image processing failed: ${err.message}`);
      throw new BadRequestException('Image could not be processed.');
    }
  }

  private async persistFile(
    buffer: Buffer, ext: string, originalName: string,
    imgInfo: { width: number; height: number },
  ): Promise<UploadedFileInfo> {
    const uuid     = crypto.randomUUID();
    const filename = `${uuid}.${ext}`;
    const fullPath = path.join(this.uploadDir, filename);
    await fs.mkdir(this.uploadDir, { recursive: true });
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(this.uploadDir) + path.sep)) {
      throw new InternalServerErrorException('Invalid upload path');
    }
    await fs.writeFile(resolved, buffer, { mode: 0o644 });
    return {
      filename,
      originalName,
      mimeType: `image/${ext}`,
      size:     buffer.length,
      url:      `${this.baseUrl}/${filename}`,
      width:    imgInfo.width  || undefined,
      height:   imgInfo.height || undefined,
    };
  }
}
