'use client';
// apps/web/src/components/features/sell/SellFormUI.tsx
//
// F-QUALITY fix: shared presentational helpers extracted from
// SellCarForm.tsx, used by Step1BasicInfo/Step2*/Step3Photos. Not one of
// the explicitly-named extraction targets, but necessary — without a
// shared home for these, each step file would need its own copy of the
// Tailwind class-string helpers and StepHeading/CharCount/Upload360Section,
// which is exactly the kind of duplication this refactor is meant to avoid.

import { useState, useRef, useCallback } from 'react';

// ── StepHeading / CharCount ─────────────────────────────────────────────────────

export function StepHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-white font-bold text-xl">{title}</h2>
        <p className="text-[var(--text-faint)] text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

export function CharCount({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  return (
    <p className={`text-xs mt-1 text-right ${pct > 0.9 ? 'text-[#ef4444]' : 'text-[var(--text-faint)]'}`}>
      {current}/{max}
    </p>
  );
}

// ── Tailwind helpers ──────────────────────────────────────────────────────────

const baseInput = `
  w-full h-[42px] px-4 rounded-xl text-sm text-white placeholder-[var(--text-faint)]
  bg-[rgba(255,255,255,0.05)] border transition-all duration-150
  focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-0
  focus:bg-[rgba(255,255,255,0.07)]
`;
export const inputCls    = (e: boolean) => `${baseInput} ${e ? 'border-[rgba(220,38,38,0.5)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;
export const selectCls   = (e: boolean) => `${baseInput} cursor-pointer appearance-none [&>option]:bg-[#0b1525] [&>option]:text-white [&>optgroup]:bg-[#0b1525] [&>optgroup]:text-[#c9a84c] ${e ? 'border-[rgba(220,38,38,0.5)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;
export const textareaCls = (e: boolean) =>
  `w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[var(--text-faint)]
   bg-[rgba(255,255,255,0.05)] border transition-all duration-150 resize-none
   focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:bg-[rgba(255,255,255,0.07)]
   ${e ? 'border-[rgba(220,38,38,0.5)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;
export const goldBtn = `
  inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm
  bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e] text-[#050b14]
  border border-[rgba(201,168,76,0.4)] shadow-[0_3px_14px_rgba(201,168,76,0.22)]
  hover:from-[#e8cc7a] hover:to-[#c9a84c] hover:shadow-[0_6px_28px_rgba(201,168,76,0.28)]
  hover:-translate-y-px active:translate-y-0 transition-all duration-200 cursor-pointer
  disabled:opacity-50 disabled:pointer-events-none
`;
export const ghostBtn = `
  inline-flex items-center gap-2 h-11 px-5 rounded-xl font-semibold text-sm
  bg-transparent text-[var(--text-muted)] border border-[rgba(255,255,255,0.08)]
  hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all duration-200 cursor-pointer
`;
export const draftBtn = `
  inline-flex items-center gap-2 h-11 px-5 rounded-xl font-semibold text-sm
  bg-transparent text-[var(--gold)] border border-[#c9a84c]
  hover:bg-[rgba(201,168,76,0.08)] transition-all duration-200 cursor-pointer
`;

// Hex swatches for the small colored badge in the Preview box (Feature: Step Two
// preview) — also used by Step2VehicleDetails' color picker, hence living here
// rather than in either file alone.
export const COLOR_SWATCH: Record<string, string> = {
  White: '#f5f5f5', Black: '#1a1a1a', Silver: '#c0c0c0', Red: '#dc2626',
  Blue: '#2563eb', Grey: '#6b7280', Brown: '#78350f', Green: '#16a34a',
  Yellow: '#eab308', Orange: '#ea580c', Other: '#888888',
};

// ── Upload360Section ──────────────────────────────────────────────────────────
const TOTAL_FRAMES = 36;

export function Upload360Section({
  images360,
  onChange,
}: {
  images360: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropTarget   = useRef<number | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const updated = [...images360];
    let slot = dropTarget.current ?? updated.findIndex((u) => !u);
    if (slot === -1) slot = updated.length;
    for (const file of files.slice(0, TOTAL_FRAMES)) {
      const url = URL.createObjectURL(file);
      updated[slot < TOTAL_FRAMES ? slot : TOTAL_FRAMES - 1] = url;
      slot++;
    }
    onChange(updated.slice(0, TOTAL_FRAMES));
    dropTarget.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [images360, onChange]);

  const openFilePicker = useCallback((slotIndex?: number) => {
    dropTarget.current = slotIndex ?? null;
    fileInputRef.current?.click();
  }, []);

  const removeFrame = useCallback((idx: number) => {
    const updated = [...images360];
    updated[idx] = '';
    onChange(updated);
  }, [images360, onChange]);

  const filledCount = images360.filter(Boolean).length;
  const is360Ready  = filledCount >= 18;

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-[rgba(201,168,76,0.25)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4
                   bg-[rgba(201,168,76,0.04)] hover:bg-[rgba(201,168,76,0.08)]
                   transition-colors duration-200 text-start"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔄</span>
          <div>
            <p className="text-white font-semibold text-sm">
              360° Photo Set
              <span className="ms-2 text-[10px] font-bold uppercase tracking-wider
                               px-2 py-0.5 rounded-md bg-[#c9a84c]/15 text-[#c9a84c]">
                Optional
              </span>
            </p>
            <p className="text-[var(--text-faint)] text-xs mt-0.5">
              {filledCount === 0
                ? 'Add 18–36 photos taken every 10° around the car'
                : is360Ready
                  ? `✓ ${filledCount} frames ready — 360° view enabled`
                  : `${filledCount}/18 frames uploaded — ${18 - filledCount} more needed`
              }
            </p>
          </div>
        </div>
        <span className="text-white/40 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-3 bg-[rgba(0,0,0,0.3)]">
          <p className="text-[var(--text-faint)] text-xs mb-4">
            Take photos every 10° around the car for a full 360° view. Start from the front-left
            and rotate clockwise. Minimum 18 photos required to enable the 360° viewer.
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 mb-4">
            {Array.from({ length: TOTAL_FRAMES }, (_, i) => {
              const url = images360[i];
              const angle = i * 10;
              return (
                <div key={i} className="relative aspect-square group">
                  {url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Frame ${i + 1} (${angle}°)`}
                        className="w-full h-full object-cover rounded-lg border border-[#c9a84c]/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeFrame(i)}
                        className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full
                                   bg-[#ef4444] text-white text-xs font-bold
                                   flex items-center justify-center
                                   opacity-0 group-hover:opacity-100 transition-opacity duration-150
                                   shadow-lg z-10"
                        aria-label={`Remove frame ${i + 1}`}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker(i)}
                      className="w-full h-full flex flex-col items-center justify-center gap-0.5
                                 rounded-lg border border-dashed border-[rgba(255,255,255,0.08)]
                                 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]
                                 hover:border-[#c9a84c]/30 transition-all duration-150 group/slot"
                      aria-label={`Upload frame ${i + 1} (${angle}°)`}
                    >
                      <span className="text-[8px] text-[var(--text-faint)] group-hover/slot:text-[#c9a84c]/60 font-bold tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-[7px] text-[var(--text-faint)]/50 tabular-nums">
                        {angle}°
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => openFilePicker()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                         bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)]
                         text-[#c9a84c] hover:bg-[rgba(201,168,76,0.18)] transition-all duration-200"
            >
              <span>📁</span> Upload multiple frames
            </button>
            {is360Ready && (
              <div className="flex items-center gap-2 text-xs text-[#4ade80]">
                <span>✓</span>
                <span>360° view ready — buyers can rotate the car</span>
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
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
