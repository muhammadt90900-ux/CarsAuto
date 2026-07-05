'use client';
// components/mobile/Drawer.tsx
// Gesture-driven bottom sheet drawer with spring physics

import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { cn } from '@cars-auto/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: number[];   // % of viewport height
  defaultSnap?: number;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  snapPoints = [0.5, 0.92],
  defaultSnap = 0,
  children,
  className,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId   = useId();
  const [currentSnap, setCurrentSnap] = useState(defaultSnap);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const startDragY = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);

  /* Lock body scroll + keyboard close */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setCurrentSnap(defaultSnap);
      setDragY(0);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, defaultSnap]);

  /* Escape key closes the drawer */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const snapHeight = snapPoints[currentSnap] * window.innerHeight;

  /* Pointer handlers */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    startY.current = e.clientY;
    startDragY.current = dragY;
    lastYRef.current = e.clientY;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [dragY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dy = e.clientY - startY.current;
    const now = Date.now();
    velocityRef.current = (e.clientY - lastYRef.current) / (now - lastTimeRef.current + 1);
    lastYRef.current = e.clientY;
    lastTimeRef.current = now;
    setDragY(Math.max(0, dy));
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    const v = velocityRef.current;

    /* Fast swipe down → close */
    if (v > 1.5 || dragY > snapHeight * 0.5) {
      if (currentSnap === 0) {
        onClose();
        setDragY(0);
      } else {
        setCurrentSnap(s => Math.max(0, s - 1));
        setDragY(0);
      }
      return;
    }

    /* Fast swipe up → expand */
    if (v < -1.5 && currentSnap < snapPoints.length - 1) {
      setCurrentSnap(s => Math.min(snapPoints.length - 1, s + 1));
      setDragY(0);
      return;
    }

    /* Snap to nearest */
    const currentTranslate = window.innerHeight - snapHeight + dragY;
    const nearest = snapPoints.reduce((prev, sp, i) => {
      const dist = Math.abs(currentTranslate - (window.innerHeight - sp * window.innerHeight));
      const prevDist = Math.abs(currentTranslate - (window.innerHeight - snapPoints[prev] * window.innerHeight));
      return dist < prevDist ? i : prev;
    }, currentSnap);
    setCurrentSnap(nearest);
    setDragY(0);
  }, [dragging, dragY, snapHeight, currentSnap, snapPoints, onClose]);

  const translateY = dragging
    ? window.innerHeight - snapHeight + dragY
    : open
      ? window.innerHeight - snapHeight
      : window.innerHeight;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Sheet */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'bg-[var(--ink-800)] rounded-t-3xl',
          'border-t border-[var(--gold-subtle)]',
          'shadow-[0_-20px_80px_rgba(0,0,0,0.80)]',
          'will-change-transform',
          !dragging && 'transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]',
          className
        )}
        style={{
          transform: `translateY(${translateY}px)`,
          maxHeight: `${snapPoints[snapPoints.length - 1] * 100}vh`,
          height: `${snapPoints[snapPoints.length - 1] * 100}vh`,
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-hidden="true"
        >
          <div className="w-12 h-1 rounded-full bg-white/15" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <h2 id={titleId} className="text-[1rem] font-display font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center
                         text-white/40 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain"
             style={{ height: `calc(${snapPoints[snapPoints.length - 1] * 100}vh - 60px)` }}>
          {children}
        </div>
      </div>
    </>
  );
}

/* ── Filter Drawer convenience export ─────────────────────────── */
export function FilterDrawer({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Filter & Sort" snapPoints={[0.75, 0.95]}>
      {children}
    </Drawer>
  );
}
