'use client';
// hooks/useMobileGestures.ts
// Touch gesture hooks: pull-to-refresh, swipe, long press, pinch

import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Pull-to-refresh ──────────────────────────────────────────── */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [progress, setProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const threshold = 80;

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startY.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        setProgress(Math.min(1, dy / threshold));
        if (dy < threshold) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (progress >= 1 && !refreshing) {
        setRefreshing(true);
        setProgress(1);
        await onRefresh();
        setRefreshing(false);
      }
      setProgress(0);
      startY.current = 0;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [progress, refreshing, onRefresh]);

  return { progress, refreshing };
}

/* ── Horizontal swipe (for carousels / tab switching) ─────────── */
export function useSwipe(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'h' | 'v' | null>(null);
  const threshold = 60;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;

    if (Math.abs(dx) < threshold || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}

/* ── Long press ───────────────────────────────────────────────── */
export function useLongPress(onLongPress: () => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const movedRef = useRef(false);

  const start = useCallback(() => {
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(25);
        onLongPress();
      }
    }, ms);
  }, [onLongPress, ms]);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const move = useCallback(() => {
    movedRef.current = true;
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerMove: move,
  };
}

/* ── Inertial scroll momentum ──────────────────────────────────── */
export function useInertialScroll(containerRef: React.RefObject<HTMLElement>) {
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      velocity.current = 0;
      lastY.current = e.touches[0].clientY;
      lastTime.current = Date.now();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const onTouchMove = (e: TouchEvent) => {
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        velocity.current = (lastY.current - e.touches[0].clientY) / dt;
      }
      lastY.current = e.touches[0].clientY;
      lastTime.current = now;
    };

    const onTouchEnd = () => {
      const decay = 0.95;
      const step = () => {
        if (Math.abs(velocity.current) < 0.1) return;
        el.scrollTop += velocity.current * 16;
        velocity.current *= decay;
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);
}

/* ── Shared element transition helper ─────────────────────────── */
export function useSharedTransition(id: string) {
  const fromRef = useRef<HTMLElement | null>(null);

  const captureFrom = useCallback((el: HTMLElement | null) => {
    fromRef.current = el;
  }, []);

  const getTransitionStyle = useCallback((): React.CSSProperties => {
    if (!fromRef.current) return { animation: 'mobileFadeUp 0.25s ease-out both' };
    const rect = fromRef.current.getBoundingClientRect();
    return {
      transformOrigin: `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`,
      animation: 'mobileScaleIn 0.3s cubic-bezier(0.32,0.72,0,1) both',
    };
  }, []);

  return { captureFrom, getTransitionStyle };
}
