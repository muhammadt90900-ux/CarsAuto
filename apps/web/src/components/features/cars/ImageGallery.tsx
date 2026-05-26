'use client';
// components/features/cars/ImageGallery.tsx
// Premium image gallery with slider + fullscreen lightbox

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, Maximize2,
  Grid3X3, Play, Share2
} from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';

interface GalleryImage { url: string; isCover?: boolean; order?: number; }

interface ImageGalleryProps {
  images: GalleryImage[];
  title: string;
}

/* ── Fullscreen Lightbox ─────────────────────────────────────── */
function Lightbox({
  images, currentIndex, onClose, onNext, onPrev,
}: {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/97 backdrop-blur-2xl">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 flex items-center justify-center
                   w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/10
                   text-white/60 hover:text-white hover:bg-white/[0.14]
                   transition-all duration-200"
        aria-label="Close gallery"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10
                      px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md
                      text-xs font-bold tracking-widest text-white/50 tabular-nums">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Prev */}
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10
                   flex items-center justify-center w-12 h-12 rounded-2xl
                   bg-white/[0.07] border border-white/10
                   text-white/60 hover:text-white hover:bg-white/[0.13]
                   transition-all duration-200 hover:scale-105"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Image */}
      <div className="flex items-center justify-center w-full h-full px-20 py-16">
        <img
          key={currentIndex}
          src={images[currentIndex]?.url}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-2xl
                     animate-[fadeIn_0.2s_ease-out]"
          style={{ animation: 'fadeIn 0.18s ease-out' }}
        />
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10
                   flex items-center justify-center w-12 h-12 rounded-2xl
                   bg-white/[0.07] border border-white/10
                   text-white/60 hover:text-white hover:bg-white/[0.13]
                   transition-all duration-200 hover:scale-105"
        aria-label="Next image"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Thumbnail strip */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
                      flex items-center gap-2 px-4 py-3
                      rounded-2xl bg-black/70 backdrop-blur-xl
                      border border-white/[0.08] max-w-[90vw] overflow-x-auto">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => {/* handled by parent */}}
            className={cn(
              'flex-shrink-0 w-12 h-9 rounded-lg overflow-hidden',
              'border-2 transition-all duration-200',
              i === currentIndex
                ? 'border-[#c9a84c] scale-105 shadow-[0_0_8px_rgba(201,168,76,0.5)]'
                : 'border-transparent opacity-50 hover:opacity-80'
            )}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" draggable={false} />
          </button>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

/* ── Main Gallery ─────────────────────────────────────────────── */
export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [activeIdx, setActiveIdx]       = useState(0);
  const [lightbox, setLightbox]         = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState(0);
  const [showGrid, setShowGrid]         = useState(false);
  const touchStartX = useRef(0);

  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalImages = sorted.length;

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLightbox(true);
  };

  const nextSlide = useCallback(() => setActiveIdx(v => (v + 1) % totalImages), [totalImages]);
  const prevSlide = useCallback(() => setActiveIdx(v => (v - 1 + totalImages) % totalImages), [totalImages]);

  const lbNext = useCallback(() => setLightboxIdx(v => (v + 1) % totalImages), [totalImages]);
  const lbPrev = useCallback(() => setLightboxIdx(v => (v - 1 + totalImages) % totalImages), [totalImages]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) dx > 0 ? nextSlide() : prevSlide();
  };

  if (!totalImages) return (
    <div className="w-full aspect-[16/9] rounded-3xl bg-[#0b1525] flex items-center justify-center">
      <span className="text-6xl opacity-10">🚗</span>
    </div>
  );

  return (
    <>
      {/* Main slider */}
      <div className="relative w-full group">
        {/* Main image */}
        <div
          className="relative w-full aspect-[16/9] lg:aspect-[21/10] rounded-3xl overflow-hidden
                     bg-[#060f1a] cursor-zoom-in"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={() => openLightbox(activeIdx)}
        >
          <img
            key={activeIdx}
            src={sorted[activeIdx]?.url}
            alt={`${title} — image ${activeIdx + 1}`}
            className="w-full h-full object-cover transition-all duration-500"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
            draggable={false}
          />

          {/* Dark gradient bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

          {/* Fullscreen hint */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0
                          group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl
                            bg-black/60 backdrop-blur-md border border-white/10">
              <Maximize2 className="w-4 h-4 text-white/80" />
              <span className="text-xs text-white/80 font-semibold">View fullscreen</span>
            </div>
          </div>

          {/* Prev / Next buttons */}
          {totalImages > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2
                           w-10 h-10 rounded-xl flex items-center justify-center
                           bg-black/50 backdrop-blur-sm border border-white/10
                           text-white opacity-0 group-hover:opacity-100
                           transition-all duration-200 hover:bg-black/70"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           w-10 h-10 rounded-xl flex items-center justify-center
                           bg-black/50 backdrop-blur-sm border border-white/10
                           text-white opacity-0 group-hover:opacity-100
                           transition-all duration-200 hover:bg-black/70"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Photo count badge */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowGrid(v => !v); }}
            className="absolute bottom-4 right-4
                       flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                       bg-black/60 backdrop-blur-md border border-white/10
                       text-xs text-white/80 font-semibold
                       hover:bg-black/80 transition-all duration-200"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            {totalImages} photos
          </button>

          {/* Dot indicators */}
          {totalImages > 1 && totalImages <= 8 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {sorted.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === activeIdx ? 'w-6 bg-[#c9a84c]' : 'w-1.5 bg-white/40 hover:bg-white/60'
                  )}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {totalImages > 1 && (
          <div className={cn(
            'mt-3 overflow-hidden transition-all duration-300',
            showGrid ? 'max-h-64' : 'max-h-20'
          )}>
            <div className={cn(
              'flex gap-2 overflow-x-auto pb-1',
              showGrid && 'flex-wrap overflow-x-visible'
            )}
              style={{ scrollbarWidth: 'none' }}
            >
              {sorted.map((img, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveIdx(i); setShowGrid(false); }}
                  className={cn(
                    'flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200',
                    showGrid ? 'w-[calc(25%-6px)] sm:w-[calc(20%-6px)] aspect-video' : 'w-20 h-14',
                    i === activeIdx
                      ? 'ring-2 ring-[#c9a84c] ring-offset-2 ring-offset-[#050b14] scale-[0.97]'
                      : 'opacity-55 hover:opacity-85'
                  )}
                >
                  <img
                    src={img.url}
                    alt={`Thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          images={sorted}
          currentIndex={lightboxIdx}
          onClose={() => setLightbox(false)}
          onNext={lbNext}
          onPrev={lbPrev}
        />
      )}
    </>
  );
}
