// apps/api/src/common/upload/upload.service.spec.ts
//
// Unit tests for the UploadService security layer.
// Run with: npx jest upload.service.spec

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UploadService } from './upload.service';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Minimal JPEG: SOI + valid magic header bytes */
function makeJpegBuffer(extra = 0): Buffer {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  return Buffer.concat([header, Buffer.alloc(extra)]);
}

/** Minimal PNG: 8-byte signature */
function makePngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
}

/** Fake EXE: MZ header */
function makeExeBuffer(): Buffer {
  return Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
}

/** PDF header disguised as JPEG (polyglot) */
function makePdfAsFakeJpeg(): Buffer {
  // PDF magic: %PDF-
  return Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00]);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UploadService — security checks', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def: any) => def,
          },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  // ── MIME / magic-byte validation ────────────────────────────────────────────

  it('rejects an EXE file with a JPEG extension (magic-byte mismatch)', async () => {
    await expect(
      service.processImageUpload({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 12,
        buffer: makeExeBuffer(),
      }),
    ).rejects.toThrow(UnsupportedMediaTypeException);
  });

  it('rejects a PDF masquerading as JPEG', async () => {
    await expect(
      service.processImageUpload({
        originalname: 'car.jpg',
        mimetype: 'image/jpeg',
        size: 12,
        buffer: makePdfAsFakeJpeg(),
      }),
    ).rejects.toThrow(UnsupportedMediaTypeException);
  });

  it('rejects an SVG (XSS vector)', async () => {
    const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(
      service.processImageUpload({
        originalname: 'icon.svg',
        mimetype: 'image/svg+xml',
        size: svgBuf.length,
        buffer: svgBuf,
      }),
    ).rejects.toThrow(UnsupportedMediaTypeException);
  });

  it('accepts a valid JPEG buffer (magic bytes pass)', async () => {
    // Note: without sharp installed, optimisation is skipped but validation runs
    const jpegBuf = makeJpegBuffer();
    // We only test validation here — sharp processing may fail in CI without native binding
    // so we spy on optimiseImage to short-circuit
    const spy = jest
      .spyOn(service as any, 'optimiseImage')
      .mockResolvedValue({ buffer: jpegBuf, info: { width: 100, height: 100 } });
    const writeSpy = jest
      .spyOn(service as any, 'persistFile')
      .mockResolvedValue({ filename: 'test.webp', originalName: 'photo.jpg', mimeType: 'image/webp', size: 12, url: 'http://localhost/test.webp' });

    await expect(
      service.processImageUpload({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: jpegBuf.length,
        buffer: jpegBuf,
      }),
    ).resolves.toBeDefined();

    spy.mockRestore();
    writeSpy.mockRestore();
  });

  // ── File size limits ────────────────────────────────────────────────────────

  it('rejects a file exceeding the absolute 15 MB ceiling', async () => {
    const oversized = Buffer.alloc(16 * 1024 * 1024); // 16 MB
    await expect(
      service.processImageUpload({
        originalname: 'big.jpg',
        mimetype: 'image/jpeg',
        size: oversized.length,
        buffer: oversized,
      }),
    ).rejects.toThrow(PayloadTooLargeException);
  });

  it('rejects an empty file', async () => {
    await expect(
      service.processImageUpload({
        originalname: 'empty.jpg',
        mimetype: 'image/jpeg',
        size: 0,
        buffer: Buffer.alloc(0),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Filename sanitisation ────────────────────────────────────────────────────

  it('rejects filename with path traversal ../../etc/passwd', async () => {
    const jpeg = makeJpegBuffer();
    await expect(
      service.processImageUpload({
        originalname: '../../etc/passwd.jpg',
        mimetype: 'image/jpeg',
        size: jpeg.length,
        buffer: jpeg,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects filename with null byte', async () => {
    const jpeg = makeJpegBuffer();
    await expect(
      service.processImageUpload({
        originalname: 'photo\x00.jpg',
        mimetype: 'image/jpeg',
        size: jpeg.length,
        buffer: jpeg,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects filename with .php extension (double extension attack)', async () => {
    const jpeg = makeJpegBuffer();
    await expect(
      service.processImageUpload({
        originalname: 'shell.php',
        mimetype: 'image/jpeg',
        size: jpeg.length,
        buffer: jpeg,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects filename longer than 255 characters', async () => {
    const jpeg = makeJpegBuffer();
    await expect(
      service.processImageUpload({
        originalname: 'a'.repeat(256) + '.jpg',
        mimetype: 'image/jpeg',
        size: jpeg.length,
        buffer: jpeg,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Batch upload limits ──────────────────────────────────────────────────────

  it('rejects a batch that exceeds maxCount', async () => {
    const jpeg = makeJpegBuffer();
    const files = Array.from({ length: 21 }, (_, i) => ({
      originalname: `photo${i}.jpg`,
      mimetype: 'image/jpeg',
      size: jpeg.length,
      buffer: jpeg,
    }));

    await expect(service.processImageUploads(files, 20)).rejects.toThrow(BadRequestException);
  });

  // ── deleteFile path-traversal prevention ────────────────────────────────────

  it('deleteFile rejects path-traversal filename', async () => {
    await expect(service.deleteFile('../secrets/key.pem')).rejects.toThrow(BadRequestException);
  });

  it('deleteFile rejects non-UUID filename', async () => {
    await expect(service.deleteFile('../../etc/shadow')).rejects.toThrow(BadRequestException);
  });
});
