'use client';
// apps/web/src/components/features/sell/ImageUploadGrid.tsx
// Drag-and-drop image upload grid.
// Images are converted to data-URLs (mock upload) and passed up as string[].
// In production, swap the `toDataURL` with a real upload call and use the
// returned CDN URL instead.

import { useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import Image from 'next/image';

interface ImageUploadGridProps {
  images: string[];
  onChange: (imgs: string[]) => void;
  error?: string;
  maxImages?: number;
}

export function ImageUploadGrid({
  images,
  onChange,
  error,
  maxImages = 10,
}: ImageUploadGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read files → data URLs
  const processFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const remaining = maxImages - images.length;
      const toProcess = Array.from(files).slice(0, remaining);

      const urls = await Promise.all(
        toProcess
          .filter((f) => f.type.startsWith('image/'))
          .map(
            (file) =>
              new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
              })
          )
      );

      onChange([...images, ...urls]);
    },
    [images, maxImages, onChange]
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) =>
    processFiles(e.target.files);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) =>
    onChange(images.filter((_, i) => i !== idx));

  const canAdd = images.length < maxImages;

  return (
    <div className="space-y-3">
      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((src, idx) => (
          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]">
            {/* Next/Image won't work with data-URLs in all configs — use <img> */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`upload-${idx}`}
              className="w-full h-full object-cover"
            />
            {idx === 0 && (
              <span className="absolute bottom-1 left-1 text-[9px] font-bold uppercase tracking-wider bg-[var(--gold)] text-[#050b14] px-1.5 py-0.5 rounded-md">
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hints */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[var(--text-faint)]">
          {images.length}/{maxImages} photos · First photo is the cover · JPG, PNG, WebP
        </p>
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-[rgba(220,38,38,0.7)] hover:text-[#ef4444] transition-colors"
          >
            Remove all
          </button>
        )}
      </div>

      {error && (
        <p className="text-[#ef4444] text-xs flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}
