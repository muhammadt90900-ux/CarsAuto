'use client';
// components/mobile/Loading.tsx
// Premium loading states — splash screen, skeletons, spinners

import { useEffect, useState } from 'react';
import { cn } from '@cars-auto/utils';

/* ── Gold shimmer keyframes (inject once) ─────────────────────── */
const SHIMMER_CSS = `
@keyframes mobileShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes mobilePulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.08); }
}
@keyframes mobileSpinner {
  to { transform: rotate(360deg); }
}
@keyframes mobileFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes mobileSplashRing {
  0%   { transform: scale(0.8); opacity: 0; }
  40%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
.m-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.03) 25%,
    rgba(201,168,76,0.08) 50%,
    rgba(255,255,255,0.03) 75%
  );
  background-size: 200% 100%;
  animation: mobileShimmer 1.6s ease-in-out infinite;
}
`;

function InjectShimmerStyles() {
  useEffect(() => {
    if (document.getElementById('mobile-shimmer-styles')) return;
    const el = document.createElement('style');
    el.id = 'mobile-shimmer-styles';
    el.textContent = SHIMMER_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

/* ── Skeleton primitives ──────────────────────────────────────── */
export function SkeletonLine({ w = '100%', h = 14, className }: {
  w?: string | number; h?: number; className?: string;
}) {
  return (
    <div
      className={cn('m-shimmer rounded-lg', className)}
      style={{ width: w, height: h, backgroundColor: 'rgba(255,255,255,0.05)' }}
    />
  );
}

export function SkeletonBox({ h = 200, className }: { h?: number; className?: string }) {
  return (
    <div
      className={cn('m-shimmer rounded-2xl', className)}
      style={{ height: h, backgroundColor: 'rgba(255,255,255,0.05)' }}
    />
  );
}

/* ── Car card skeleton ────────────────────────────────────────── */
export function CarCardSkeleton() {
  return (
    <>
      <InjectShimmerStyles />
      <div className="rounded-2xl overflow-hidden bg-[#0b1525] border border-white/[0.06]">
        <SkeletonBox h={192} className="rounded-none" />
        <div className="p-4 space-y-3">
          <SkeletonLine w="70%" h={16} />
          <SkeletonLine w="45%" h={12} />
          <div className="flex gap-2 pt-1">
            <SkeletonLine w={80} h={10} className="rounded-full" />
            <SkeletonLine w={80} h={10} className="rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <SkeletonLine w={100} h={20} />
            <div className="w-9 h-9 m-shimmer rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Dashboard stat skeleton ──────────────────────────────────── */
export function StatCardSkeleton() {
  return (
    <>
      <InjectShimmerStyles />
      <div className="rounded-2xl bg-[#0b1525] border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 m-shimmer rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <SkeletonLine w={48} h={12} />
        </div>
        <SkeletonLine w="60%" h={28} />
        <SkeletonLine w="40%" h={10} />
        <SkeletonBox h={36} />
      </div>
    </>
  );
}

/* ── List row skeleton ────────────────────────────────────────── */
export function ListRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      <InjectShimmerStyles />
      <div className="space-y-px">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 bg-[#080f1c]">
            <div className="w-11 h-11 m-shimmer rounded-xl flex-shrink-0"
                 style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <div className="flex-1 space-y-2">
              <SkeletonLine w="65%" h={13} />
              <SkeletonLine w="45%" h={10} />
            </div>
            <SkeletonLine w={40} h={10} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Gold spinner ─────────────────────────────────────────────── */
export function GoldSpinner({ size = 32 }: { size?: number }) {
  return (
    <>
      <InjectShimmerStyles />
      <svg
        width={size} height={size}
        viewBox="0 0 32 32"
        style={{ animation: 'mobileSpinner 0.8s linear infinite' }}
        aria-label="Loading…"
      >
        <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="3" />
        <path d="M16 4 A12 12 0 0 1 28 16" fill="none" stroke="#c9a84c" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </>
  );
}

/* ── Full-screen splash (on initial app load) ─────────────────── */
export function AppSplash({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<'logo' | 'ring' | 'done'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('ring'), 400);
    const t2 = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <>
      <InjectShimmerStyles />
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050b14]">
        {/* Outer pulse ring */}
        <div
          className="absolute w-32 h-32 rounded-full border border-[#c9a84c]/20"
          style={{
            animation: phase === 'ring' ? 'mobileSplashRing 0.6s ease-out forwards' : undefined,
            opacity: phase === 'logo' ? 0 : undefined
          }}
        />
        {/* Logo mark */}
        <div
          className="relative flex flex-col items-center gap-3"
          style={{ animation: 'mobileFadeUp 0.4s ease-out forwards' }}
        >
          <div className="w-20 h-20 rounded-[22px] flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)',
                        boxShadow: '0 0 40px rgba(201,168,76,0.50)' }}>
            <svg width="36" height="36" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".95" />
              <circle cx="6.5" cy="15" r="2" fill="white" />
              <circle cx="13.5" cy="15" r="2" fill="white" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[1.4rem] font-display font-extrabold tracking-tight">
              <span style={{ color: '#c9a84c' }}>Auto</span>
              <span className="text-white">Bazaar</span>
              <span style={{ background: 'linear-gradient(135deg,#c9a84c,#f0d278)',
                             WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pro</span>
            </p>
            <div className="mt-3 flex items-center justify-center">
              <GoldSpinner size={20} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Page transition wrapper ──────────────────────────────────── */
export function PageTransition({ children, className }: {
  children: React.ReactNode; className?: string;
}) {
  return (
    <>
      <InjectShimmerStyles />
      <div
        className={cn('', className)}
        style={{ animation: 'mobileFadeUp 0.25s ease-out both' }}
      >
        {children}
      </div>
    </>
  );
}

/* ── Pull-to-refresh indicator ────────────────────────────────── */
export function PullIndicator({ progress }: { progress: number }) {
  const capped = Math.min(1, progress);
  return (
    <>
      <InjectShimmerStyles />
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-center bg-transparent"
        style={{ height: 56 * capped, overflow: 'hidden', transition: 'height 0.15s ease' }}
      >
        <div style={{
          opacity: capped,
          transform: `scale(${0.6 + 0.4 * capped}) rotate(${capped * 360}deg)`,
          transition: 'transform 0.1s linear, opacity 0.1s'
        }}>
          <GoldSpinner size={24} />
        </div>
      </div>
    </>
  );
}
