'use client';
// apps/web/src/components/features/sell/ImageUploadGrid.tsx
// Drag-and-drop image upload grid.
// Images are uploaded to POST /upload/image and the returned CDN URL is stored.
//
// ✅ FIX #5 (High): Added specific error handling for 401 and 403 responses
// so users see actionable messages instead of a generic error.

import { useRef, useCallback, useState, DragEvent, ChangeEvent } from 'react';
import { sellApi } from '@/lib/sell-api';

interface ImageUploadGridProps {
  images:    string[];
  onChange:  (imgs: string[]) => void;
  error?:    string;
  maxImages?: number;
}

export function ImageUploadGrid({
  images,
  onChange,
  error,
  maxImages = 10,
}: ImageUploadGridProps) {
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Upload files → get CDN URLs from the real API ─────────────────────────
  const processFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const remaining = maxImages - images.length;
      const toProcess = Array.from(files)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, remaining);

      if (toProcess.length === 0) return;

      setUploading(true);
      setUploadError(null);

      try {
        const urls = await Promise.all(
          toProcess.map((file) => sellApi.uploadImage(file))
        );
        onChange([...images, ...urls]);
      } catch (err: any) {
        // ✅ FIX #5: Specific messages for auth/permission errors
        const status = err?.response?.status as number | undefined;

        let msg: string;
        if (status === 401) {
          msg = 'Session expired — please refresh the page and log in again.';
        } else if (status === 403) {
          msg = 'Email not verified — please verify your email before uploading photos.';
        } else if (status === 429) {
          msg = 'Too many uploads — please wait a moment and try again.';
        } else {
          msg =
            err?.response?.data?.message ??
            err?.message ??
            'Failed to upload image. Please try again.';
        }
        setUploadError(msg);
      } finally {
        setUploading(false);
        // Reset file input so the same file can be re-selected after an error
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [images, maxImages, onChange],
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) =>
    processFiles(e.target.files);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) =>
    onChange(images.filter((_, i) => i !== idx));

  const canAdd = images.length < maxImages && !uploading;

  return (
    <div className="space-y-3">
      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((src, idx) => (
          <div
            key={`image-${idx}`}
            className="relative group aspect-square rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`upload-${idx}`}
              className="w-full h-full object-cover"
            />
            {idx === 0 && (
              <span className="absolute bottom-1 left-1 text-[9px] font-bold uppercase tracking-wider bg-[var(--gold)] text-[var(--ink-900)] px-1.5 py-0.5 rounded-md">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="
                absolute top-1 right-1 w-6 h-6 rounded-full
                bg-[rgba(0,0,0,0.7)] text-white text-xs
                opacity-0 group-hover:opacity-100
                transition-opacity duration-150
                flex items-center justify-center
                hover:bg-[rgba(220,38,38,0.9)]
              "
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add slot */}
        {canAdd && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`
              aspect-square rounded-xl border-2 border-dashed cursor-pointer
              flex flex-col items-center justify-center gap-1
              transition-all duration-200
              ${error
                ? 'border-[rgba(220,38,38,0.5)] bg-[rgba(220,38,38,0.04)]'
                : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(201,168,76,0.4)] hover:bg-[rgba(201,168,76,0.04)]'}
            `}
          >
            <span className="text-2xl opacity-60">+</span>
            <span className="text-[10px] text-[var(--text-faint)] text-center px-1">
              {images.length === 0 ? 'Add Photo' : 'Add More'}
            </span>
          </div>
        )}

        {/* Uploading spinner slot */}
        {uploading && (
          <div className="aspect-square rounded-xl border-2 border-dashed border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.04)] flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-[var(--text-faint)]">Uploading…</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hints */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[var(--text-faint)]">
          {images.length}/{maxImages} photos · First photo is the cover · JPG, PNG, WebP
        </p>
        {images.length > 0 && !uploading && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-[rgba(220,38,38,0.7)] hover:text-[#ef4444] transition-colors"
          >
            Remove all
          </button>
        )}
      </div>

      {/* Upload API error */}
      {uploadError && (
        <p className="text-[#ef4444] text-xs flex items-center gap-1.5 p-3 rounded-lg bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)]">
          <span>⚠</span>
          {uploadError}
        </p>
      )}

      {/* Validation error (no photos selected) */}
      {error && !uploadError && (
        <p className="text-[#ef4444] text-xs flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}
