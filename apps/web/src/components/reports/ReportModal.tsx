// apps/web/src/components/reports/ReportModal.tsx
'use client';
// Trust & Safety Prompt 7 frontend wiring.
//
// Generalizes the CarDetailClient.tsx's ReportModalInline mockup (dead
// "Submit Report" button, no onClick at all — confirmed by reading that
// file) into a real, reusable component wired to POST /reports (built in
// Prompt 7's backend half — that endpoint didn't exist before this).
// targetType/targetId are props so this same component serves listings,
// users, and reviews (the doc's "just pointed at the new targetTypes"),
// not just the car-detail page it originally lived only inside of.

import { useState } from 'react';
import { Flag, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

export type ReportTargetType = 'LISTING' | 'USER' | 'DEALER' | 'MESSAGE' | 'REVIEW';

const REASON_PRESETS: Record<ReportTargetType, string[]> = {
  LISTING: ['Incorrect information', 'Fraudulent listing', 'Already sold', 'Duplicate listing', 'Wrong price', 'Other'],
  USER:    ['Suspicious behavior', 'Harassment', 'Scam attempt', 'Fake profile', 'Other'],
  DEALER:  ['Suspicious behavior', 'Fraudulent listings', 'Fake reviews', 'Other'],
  MESSAGE: ['Harassment', 'Scam / off-platform payment request', 'Spam', 'Other'],
  REVIEW:  ['Fake review', 'Offensive content', 'Not a real transaction', 'Other'],
};

const TITLES: Record<ReportTargetType, string> = {
  LISTING: 'Report Listing',
  USER: 'Report User',
  DEALER: 'Report Dealer',
  MESSAGE: 'Report Message',
  REVIEW: 'Report Review',
};

interface ReportModalProps {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}

export function ReportModal({ targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const finalReason = reason === 'Other' ? customReason.trim() : reason;
  const canSubmit = finalReason.length >= 3 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/reports', { targetType, targetId, reason: finalReason });
      setDone(true);
      setTimeout(onClose, 1400);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-[var(--ink-750)] border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.8)] p-6 space-y-4">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-white font-semibold text-sm">Report submitted</p>
            <p className="text-white/40 text-xs text-center">Our team will review this shortly. Thank you.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Flag className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display font-bold text-white text-lg">{TITLES[targetType]}</h3>
            </div>

            <div className="space-y-2">
              {REASON_PRESETS[targetType].map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-150',
                    reason === r
                      ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                      : 'bg-white/[0.04] border border-white/[0.06] text-white/60 hover:bg-white/[0.07]',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            {reason === 'Other' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={255}
                placeholder="Describe the issue…"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)] resize-none"
                rows={3}
              />
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit Report
            </button>
            <button onClick={onClose} className="w-full py-2 text-white/40 text-sm hover:text-white/60 transition-colors">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
