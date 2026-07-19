'use client';
// components/features/cars/Viewer360.tsx
// 360° Vehicle Viewer — frame-sequence drag-to-rotate approach
// No heavy 3D library — uses preloaded <img> frames + requestAnimationFrame

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';
import { RotateCcw, Maximize2, Minimize2, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { cn } from '@cars-auto/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Viewer360Props {
  /** Ordered sequence of image URLs (18–36 recommended; 36 = one every 10°) */
  images: string[];
  autoRotate?: boolean;
  className?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const DRAG_SENSITIVITY   = 0.35;   // pixels per frame step
const AUTO_ROTATE_FPS    = 30;     // frames per second for auto-rotation
const AUTO_ROTATE_SPEED  = 0.4;    // frames per tick (fractional for smoothness)
const PINCH_ZOOM_MIN     = 1;
const PINCH_ZOOM_MAX     = 3;

// ── Viewer360 ──────────────────────────────────────────────────────────────────
export const Viewer360 = memo(function Viewer360({
  images,
  autoRotate: initialAutoRotate = false,
  className,
}: Viewer360Props) {
  const total = images.length;

  // Preload state
  const [loadedCount, setLoadedCount] = useState(0);
  const [frameIdx,    setFrameIdx]    = useState(0);
  const [autoRotate,  setAutoRotate]  = useState(initialAutoRotate);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom,        setZoom]         = useState(1);
  const [dragging,    setDragging]     = useState(false);
  const [hint,        setHint]         = useState(true); // show drag hint briefly

  // Refs for perf — avoid re-renders during active drag
  const containerRef  = useRef<HTMLDivElement>(null);
  const frameRef      = useRef(0);           // current frame (float for smooth)
  const dragStartX    = useRef(0);
  const dragStartFrame = useRef(0);
  const rafId         = useRef<number | null>(null);
  const autoRafId     = useRef<number | null>(null);
  const lastRafTime   = useRef(0);
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);
  const imgRefs       = useRef<(HTMLImageElement | null)[]>([]);

  // Dismiss hint after 3s
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Preload all images in background
  useEffect(() => {
    setLoadedCount(0);
    imgRefs.current = Array(total).fill(null);
    let cancelled = false;

    images.forEach((src, i) => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        if (cancelled) return;
        imgRefs.current[i] = img;
        setLoadedCount((c) => c + 1);
      };
      img.onerror = () => {
        if (cancelled) return;
        // Count failed loads so the progress still completes
        setLoadedCount((c) => c + 1);
      };
    });

    return () => { cancelled = true; };
  }, [images, total]);

  // ── Auto-rotation loop ────────────────────────────────────────────────────────
  const startAutoRotate = useCallback(() => {
    if (autoRafId.current !== null) return;

    const tick = (time: number) => {
      if (!lastRafTime.current) lastRafTime.current = time;
      const elapsed = time - lastRafTime.current;
      lastRafTime.current = time;

      // ~30fps target
      if (elapsed < 1000 / AUTO_ROTATE_FPS) {
        autoRafId.current = requestAnimationFrame(tick);
        return;
      }

      frameRef.current = (frameRef.current + AUTO_ROTATE_SPEED) % total;
      setFrameIdx(Math.round(frameRef.current) % total);
      autoRafId.current = requestAnimationFrame(tick);
    };

    autoRafId.current = requestAnimationFrame(tick);
  }, [total]);

  const stopAutoRotate = useCallback(() => {
    if (autoRafId.current !== null) {
      cancelAnimationFrame(autoRafId.current);
      autoRafId.current = null;
      lastRafTime.current = 0;
    }
  }, []);

  useEffect(() => {
    if (autoRotate && loadedCount === total) {
      startAutoRotate();
    } else {
      stopAutoRotate();
    }
    return stopAutoRotate;
  }, [autoRotate, loadedCount, total, startAutoRotate, stopAutoRotate]);

  // Stop auto-rotate when user starts dragging
  const pauseAutoForDrag = useCallback(() => {
    if (autoRotate) stopAutoRotate();
  }, [autoRotate, stopAutoRotate]);

  const resumeAutoAfterDrag = useCallback(() => {
    if (autoRotate) startAutoRotate();
  }, [autoRotate, startAutoRotate]);

  // ── Drag-to-rotate (mouse) ────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setHint(false);
    pauseAutoForDrag();
    dragStartX.current    = e.clientX;
    dragStartFrame.current = frameRef.current;
  }, [pauseAutoForDrag]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const delta  = e.clientX - dragStartX.current;
    const newFrame = (dragStartFrame.current + delta * DRAG_SENSITIVITY / (containerRef.current?.offsetWidth ?? 600) * total);
    const clamped = ((Math.round(newFrame) % total) + total) % total;
    frameRef.current = clamped;
    setFrameIdx(clamped);
  }, [dragging, total]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
    resumeAutoAfterDrag();
  }, [resumeAutoAfterDrag]);

  // ── Drag-to-rotate (touch) ────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setDragging(true);
      setHint(false);
      pauseAutoForDrag();
      dragStartX.current     = e.touches[0].clientX;
      dragStartFrame.current = frameRef.current;
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom: record initial distance
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.hypot(dx, dy);
      pinchStartZoom.current = zoom;
    }
  }, [pauseAutoForDrag, zoom]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragging) {
      const delta = e.touches[0].clientX - dragStartX.current;
      const newFrame = dragStartFrame.current + delta * DRAG_SENSITIVITY / (containerRef.current?.offsetWidth ?? 400) * total;
      const clamped = ((Math.round(newFrame) % total) + total) % total;
      frameRef.current = clamped;
      setFrameIdx(clamped);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newZoom = Math.min(
        PINCH_ZOOM_MAX,
        Math.max(PINCH_ZOOM_MIN, pinchStartZoom.current * (dist / pinchStartDist.current))
      );
      setZoom(newZoom);
    }
  }, [dragging, total]);

  const onTouchEnd = useCallback(() => {
    setDragging(false);
    resumeAutoAfterDrag();
  }, [resumeAutoAfterDrag]);

  // ── Fullscreen ────────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Zoom controls ─────────────────────────────────────────────────────────────
  const zoomIn  = useCallback(() => setZoom((z) => Math.min(PINCH_ZOOM_MAX, +(z + 0.25).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(PINCH_ZOOM_MIN, +(z - 0.25).toFixed(2))), []);

  // ── Loading state ──────────────────────────────────────────────────────────────
  const loadProgress = total ? Math.round((loadedCount / total) * 100) : 0;
  const isReady      = loadedCount === total;

  // ── Current image URL ─────────────────────────────────────────────────────────
  const currentSrc = images[frameIdx] ?? images[0];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-[16/9] lg:aspect-[21/10] rounded-3xl overflow-hidden',
        'bg-[#060f1a] select-none',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="img"
      aria-label={`360° vehicle view — frame ${frameIdx + 1} of ${total}`}
    >
      {/* Loading overlay */}
      {!isReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#060f1a]">
          <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
          <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[var(--gold)] rounded-full transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p className="text-xs text-white/40 tabular-nums">
            Loading 360° view… {loadProgress}%
          </p>
        </div>
      )}

      {/* Current frame */}
      {isReady && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-75"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
      )}

      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Drag hint */}
      {hint && isReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10">
            <span className="text-lg">↔</span>
            <span className="text-xs text-white/80 font-medium">Drag to rotate</span>
          </div>
        </div>
      )}

      {/* Frame indicator */}
      {isReady && (
        <div className="absolute top-4 start-1/2 -translate-x-1/2 z-10
                        px-3 py-1 rounded-full bg-black/60 backdrop-blur-md
                        text-[10px] font-bold tracking-widest text-white/40 tabular-nums
                        pointer-events-none">
          {frameIdx + 1} / {total}
        </div>
      )}

      {/* 360° badge */}
      <div className="absolute top-4 start-4 z-10 flex items-center gap-1.5 px-2.5 py-1
                      rounded-lg bg-[rgba(201,168,76,0.2)] border border-[rgba(201,168,76,0.3)] pointer-events-none">
        <span className="text-[var(--gold)] text-xs font-black tracking-wider">360°</span>
      </div>

      {/* Controls */}
      {isReady && (
        <div className="absolute bottom-4 end-4 z-10 flex items-center gap-2">
          {/* Zoom out */}
          <button
            onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            disabled={zoom <= PINCH_ZOOM_MIN}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl',
              'bg-black/60 backdrop-blur-md border border-white/10',
              'text-white/70 hover:text-white transition-all duration-200',
              'disabled:opacity-30 disabled:cursor-not-allowed',
            )}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom in */}
          <button
            onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            disabled={zoom >= PINCH_ZOOM_MAX}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl',
              'bg-black/60 backdrop-blur-md border border-white/10',
              'text-white/70 hover:text-white transition-all duration-200',
              'disabled:opacity-30 disabled:cursor-not-allowed',
            )}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Auto-rotate */}
          <button
            onClick={(e) => { e.stopPropagation(); setAutoRotate((v) => !v); }}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl',
              'backdrop-blur-md border transition-all duration-200',
              autoRotate
                ? 'bg-[rgba(201,168,76,0.2)] border-[rgba(201,168,76,0.4)] text-[var(--gold)]'
                : 'bg-black/60 border-white/10 text-white/70 hover:text-white',
            )}
            aria-label={autoRotate ? 'Stop auto-rotate' : 'Start auto-rotate'}
            aria-pressed={autoRotate}
          >
            <RotateCcw className={cn('w-4 h-4', autoRotate && 'animate-spin')} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl',
              'bg-black/60 backdrop-blur-md border border-white/10',
              'text-white/70 hover:text-white transition-all duration-200',
            )}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen
              ? <Minimize2 className="w-4 h-4" />
              : <Maximize2 className="w-4 h-4" />
            }
          </button>
        </div>
      )}

      {/* Bottom progress dots — frame position indicator */}
      {isReady && total <= 36 && (
        <div className="absolute bottom-4 start-4 end-24 z-10 flex items-center pointer-events-none">
          <div className="h-0.5 w-full max-w-[160px] rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[rgba(201,168,76,0.6)] rounded-full transition-all duration-75"
              style={{ width: `${((frameIdx + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default Viewer360;
