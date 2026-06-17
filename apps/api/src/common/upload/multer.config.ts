// apps/api/src/common/upload/multer.config.ts
//
// Multer is configured with MEMORY storage (no temp files on disk before
// validation) and a strict file-size limit at the transport layer.
//
// IMPORTANT: This limit is the FIRST line of defence — it stops oversized
// payloads before they even reach the UploadService. The UploadService then
// performs a second, per-type size check as defence-in-depth.

import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

// Hard ceiling at the transport layer — 15 MB
const MAX_BYTES = 15 * 1024 * 1024;

// Maximum number of files per multipart request
const MAX_FILES = 20;

export const imageUploadOptions: MulterOptions = {
  // BUG #1 FIX: explicit memoryStorage() — storage: undefined relies on undocumented
  // multer default behaviour; some versions fall back to DiskStorage (/tmp) instead,
  // causing file.buffer to be undefined and breaking processImageUpload().
  storage: memoryStorage(),

  limits: {
    fileSize:   MAX_BYTES,   // bytes — multer rejects before calling fileFilter
    files:      MAX_FILES,   // total files per request
    fields:     10,          // non-file fields
    fieldSize:  1024 * 10,   // 10 KB per non-file field value
    headerPairs: 100,        // max header key/value pairs (prevent header-flooding)
  },

  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    // Block known dangerous types at the transport level.
    // This is NOT the primary MIME check (magic bytes in UploadService handles that),
    // but it provides a fast-fail for obviously wrong content types.
    const BLOCKED_MIME_PREFIXES = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-sh',
      'application/x-php',
      'application/x-perl',
      'text/javascript',
      'application/javascript',
      'application/zip',
      'application/x-rar',
      'application/x-tar',
      'application/x-7z',
    ];

    const clientMime = (file.mimetype ?? '').toLowerCase();

    for (const blocked of BLOCKED_MIME_PREFIXES) {
      if (clientMime.startsWith(blocked)) {
        return callback(
          new BadRequestException(`File type '${clientMime}' is not allowed`),
          false,
        );
      }
    }

    // SVG is intentionally rejected — inline scripts make it an XSS vector
    if (clientMime === 'image/svg+xml' || file.originalname?.toLowerCase().endsWith('.svg')) {
      return callback(
        new BadRequestException('SVG files are not accepted for security reasons'),
        false,
      );
    }

    callback(null, true);
  },
};

// memoryStorage is imported above and used in imageUploadOptions.storage
