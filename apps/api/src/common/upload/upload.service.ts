// apps/api/src/common/upload/upload.service.ts
//
// F-HIGH fix: storage backend moved from local disk (/tmp/uploads) to
// Cloudinary. Local disk storage doesn't survive container
// restarts/redeploys and isn't shared across multiple API replicas, so an
// image uploaded to replica A is a 404 on a request served by replica B.
// Cloudinary gives durable, CDN-backed, replica-independent storage and
// handles responsive image delivery (auto format/quality negotiation)
// at the edge.
//
// Validation pipeline (size limits, filename sanitisation, magic-byte MIME
// detection, sharp-based image-integrity check) is UNCHANGED — only the
// final storage step changed.

import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as sharp  from 'sharp';
import {
  v2 as cloudinary,
  UploadApiOptions,
  UploadApiErrorResponse,
} from 'cloudinary';

/**
 * Cloudinary folder / transformation profile. 'avatars' also covers dealer
 * logos. 'verification' ADDED (Trust & Safety Prompt 2) — ID/selfie photos
 * for KYC, uploaded via the private uploadPrivateImage() path below, NOT
 * through UploadController — see that method's comment for why.
 */
export type UploadFolderType = 'listings' | 'avatars' | 'verification';

export interface UploadedFileInfo {
  /** Cloudinary public_id, e.g. "carsauto/listings/<uuid>" — stored as the DB ownership key. */
  filename:     string;
  originalName: string;
  mimeType:     string;
  size:         number;
  /** Cloudinary secure_url (CDN-served). */
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

// F-HIGH fix: per-folder Cloudinary delivery transformations, applied at
// upload time (Cloudinary stores/derives the transformed asset).
// - "listings": marketplace photos — constrained to a sane max width,
//   format/quality auto-negotiated per requesting browser.
// - "avatars":  profile photos / dealer logos — fixed square thumbnail crop.
// ADDED (Trust & Safety Prompt 2): 'verification' caps width higher than
// avatars/listings (2000, not 400-1200) — ID card and passport text needs
// to stay legible for admin review, unlike a marketplace thumbnail.
const CLOUDINARY_TRANSFORMATIONS: Record<UploadFolderType, Record<string, unknown>> = {
  listings:     { quality: 'auto', fetch_format: 'auto', width: 1200, crop: 'limit' },
  avatars:      { quality: 'auto', fetch_format: 'auto', width: 400, height: 400, crop: 'fill', gravity: 'auto' },
  verification: { quality: 'auto', fetch_format: 'auto', width: 2000, crop: 'limit' },
};

const PUBLIC_ID_PATTERN = /^carsauto\/(listings|avatars|verification)\/[a-f0-9-]+$/;

// ADDED (Trust & Safety Prompt 2): folders whose contents must NEVER be
// publicly readable off a guessable URL — national ID / passport / selfie
// photos. Cloudinary's default delivery `type` is 'upload' (publicly
// readable at a predictable URL once you know the public_id). For these
// folders we upload with type: 'authenticated' instead, which requires a
// signed URL to view — see uploadToCloudinary()'s branch below.
const PRIVATE_FOLDER_TYPES: ReadonlySet<UploadFolderType> = new Set(['verification']);

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly cloudinaryConfigured: boolean;

  constructor(private config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey    = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    this.cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);
    if (this.cloudinaryConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key:    apiKey,
        api_secret: apiSecret,
        secure:     true,
      });
    } else {
      // env.validation.ts already warns at boot if Cloudinary is unconfigured;
      // this is the runtime-side guard so uploads fail with a clear error
      // instead of a confusing Cloudinary SDK exception about missing config.
      this.logger.warn(
        'Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) — image uploads will be rejected.',
      );
    }
  }

  /**
   * Two entry paths call this:
   *  1. UploadController (POST /upload/image|images) — the public-facing
   *     route, gated to DEALER/ADMIN only (buyers/USER role can't upload
   *     listing photos or avatars there).
   *  2. VerificationService, DIRECTLY, for KYC document uploads — deliberately
   *     bypassing UploadController. Private sellers submitting ID
   *     verification ARE role USER, exactly the role UploadController
   *     blocks, and that block is a correct business rule for
   *     listings/avatars that must not be relaxed just to let this feature
   *     through. This method itself has no role opinion — validation/
   *     optimisation/storage only — so it's safe to call from both places;
   *     the role decision belongs to (and stays in) each caller.
   */
  async processImageUpload(
    file: RawUploadedFile,
    type: UploadFolderType = 'listings',
  ): Promise<UploadedFileInfo> {
    this.guardAbsoluteSize(file);
    this.sanitiseOriginalName(file.originalname);
    const detectedMime = this.detectMimeType(file.buffer);
    this.assertAllowedImageMime(detectedMime, file.buffer);
    const optimised = await this.optimiseImage(file.buffer);
    return this.uploadToCloudinary(optimised.buffer, file.originalname, optimised.info, type);
  }

  async processImageUploads(
    files: RawUploadedFile[],
    type: UploadFolderType = 'listings',
    maxCount = 20,
  ): Promise<UploadedFileInfo[]> {
    if (!files || files.length === 0) return [];
    if (files.length > maxCount) {
      throw new BadRequestException(`Maximum ${maxCount} images allowed, received ${files.length}`);
    }
    return Promise.all(files.map(f => this.processImageUpload(f, type)));
  }

  /**
   * Deletes an image from Cloudinary.
   * `publicId` must be the full Cloudinary public_id we generated on upload
   * (e.g. "carsauto/listings/<uuid>") — this is exactly what's stored as
   * `UploadedFile.filename` in the DB, so callers (the controller) should
   * pass that value straight through.
   *
   * NOTE (Trust & Safety Prompt 2): NOT currently called for 'verification'
   * uploads — there's no delete-my-verification-doc or admin-purge-doc
   * feature yet. If one is added, `cloudinary.uploader.destroy` needs an
   * explicit `type: 'authenticated'` for those assets, or it looks in the
   * wrong bucket and silently no-ops. Flagging so this isn't rediscovered
   * the hard way later.
   */
  async deleteFile(publicId: string): Promise<void> {
    if (!PUBLIC_ID_PATTERN.test(publicId)) {
      throw new BadRequestException('Invalid file identifier');
    }
    if (!this.cloudinaryConfigured) {
      throw new InternalServerErrorException('Image storage is not configured on this server');
    }
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.warn(`Cloudinary destroy returned unexpected result for ${publicId}: ${result.result}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to delete ${publicId} from Cloudinary: ${err.message}`);
      // Deletion failures shouldn't surface as 500s to the caller if the
      // asset is simply already gone — but genuine API/auth errors should.
      throw new InternalServerErrorException('Failed to delete file');
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

  // Sharp still does local validation/normalisation BEFORE the buffer ever
  // leaves this process: it proves the buffer is a genuinely decodable
  // image (rejects corrupt files / decompression bombs that pass the magic
  // byte check), strips EXIF/orientation metadata, and caps dimensions —
  // independent of and in addition to whatever Cloudinary does on its side.
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

  /** Streams the already-validated/optimised buffer to Cloudinary via upload_stream — no temp file ever touches disk. */
  private uploadToCloudinary(
    buffer: Buffer,
    originalName: string,
    imgInfo: { width: number; height: number },
    type: UploadFolderType,
  ): Promise<UploadedFileInfo> {
    if (!this.cloudinaryConfigured) {
      throw new InternalServerErrorException('Image upload is not configured on this server');
    }

    const uuid = crypto.randomUUID();
    const isPrivate = PRIVATE_FOLDER_TYPES.has(type);

    const options: UploadApiOptions = {
      folder:        `carsauto/${type}`,
      public_id:     uuid,
      resource_type: 'image',
      overwrite:     false,
      transformation: [CLOUDINARY_TRANSFORMATIONS[type]],
      // ADDED (Trust & Safety Prompt 2): 'authenticated' delivery type means
      // the asset is NOT servable from a plain guessable URL — every
      // request must carry Cloudinary's signature. Default ('upload') is
      // public, correct for listing/avatar photos, wrong for ID documents.
      ...(isPrivate ? { type: 'authenticated' as const, access_mode: 'authenticated' as const } : {}),
    };

    return new Promise<UploadedFileInfo>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error: UploadApiErrorResponse | undefined, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed: ${error?.message ?? 'unknown error'}`);
            reject(new BadRequestException('Image upload failed'));
            return;
          }
          // ADDED (Trust & Safety Prompt 2): for authenticated assets,
          // `result.secure_url` from the upload response is NOT a working
          // delivery URL on its own (401 without a signature) — we build
          // and store the signed URL ourselves so downstream code (the
          // verification module, admin review) can just use `.url` as-is.
          const deliveryUrl = isPrivate
            ? cloudinary.url(result.public_id, {
                type: 'authenticated',
                sign_url: true,
                secure: true,
                resource_type: 'image',
              })
            : result.secure_url;

          resolve({
            filename:     result.public_id,
            originalName,
            mimeType:     'image/webp',
            size:         result.bytes ?? buffer.length,
            url:          deliveryUrl,
            width:        result.width  ?? imgInfo.width  ?? undefined,
            height:       result.height ?? imgInfo.height ?? undefined,
          });
        },
      );
      uploadStream.end(buffer);
    });
  }
}