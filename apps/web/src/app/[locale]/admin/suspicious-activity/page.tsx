'use client';
// apps/web/src/app/[locale]/admin/suspicious-activity/page.tsx
//
// Trust & Safety Prompt 6/7 frontend — new tab on the existing admin
// panel shell (reuses AdminLayout via the [locale]/admin/layout.tsx this
// route already sits under, same as every other admin/* page — no
// parallel admin UI built). Structure mirrors admin/reports/page.tsx
// (status tabs pattern adapted to severity, table + detail drawer),
// wired to GET /admin/suspicious-activity (SuspiciousActivityService,
// Prompt 5). Read-only — this feed has no resolve/dismiss action of its
// own; admins act on the underlying account via the Users page.

import { useState, useEffect, useCallback } from 'react';
import {
  AlertOctagon, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  Clock, ShieldAlert, XCircle,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

interface SuspiciousEvent {
  id: string;
  userId: string;
  eventType: string;
  severity: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

const EVENT_LABELS: Record<string, string> = {
  RAPID_RELIST: 'Rapid Relist',
  VIN_CLASH: 'VIN Clash',
  IMAGE_REUSE: 'Image Reuse',
  TEXT_DUPLICATE: 'Text Duplicate',
  PRICE_OUTLIER: 'Price Outlier',
  OFFPLATFORM_PAYMENT_ASK: 'Off-Platform Payment',
  MESSAGE_VELOCITY_SPIKE: 'Message Velocity Spike',
};

function severityStyle(severity: number) {
  if (severity >= 80) return { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', label: 'Critical' };
  if (severity >= 60) return { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', label: 'High' };
  if (severity >= 40) return { text: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20', label: 'Medium' };
  return { text: 'text-white/40', bg: 'bg-white/[0.05]', border: 'border-white/[0.09]', label: 'Low' };
}

const PAGE_SIZE = 20;

export default function AdminSuspiciousActivityPage() {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [events, setEvents]     = useState<SuspiciousEvent[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [minSeverity, setMinSeverity] = useState<number | null>(80);
  const [detail, setDetail]     = useState<SuspiciousEvent | null>(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (minSeverity !== null) params.set('minSeverity', String(minSeverity));

    api.get(`/admin/suspicious-activity?${params.toString()}`)
      .then(r => {
        setEvents(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load suspicious activity'))
      .finally(() => setLoading(false));
  }, [page, minSeverity]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { setPage(1); }, [minSeverity]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const SEVERITY_TABS: [number | null, string][] = [
    [80, 'Critical (≥80)'],
    [60, 'High (≥60)'],
    [null, 'All'],
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight">Suspicious Activity</h1>
          <p className="text-white/40 text-sm mt-0.5">Real-time fraud signals — VIN clashes, image reuse, rapid relisting, message-velocity spikes</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {SEVERITY_TABS.map(([val, label]) => (
          <button
            key={String(val)}
            onClick={() => setMinSeverity(val)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
              minSeverity === val
                ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#0d1b2e] border-transparent'
                : 'bg-[#0d1b2e] border-white/[0.07] text-white/50 hover:text-white/80',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-white/40 text-sm">{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertOctagon className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No suspicious activity in this range</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Account', 'Event', 'Severity', 'Detected', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => {
                const sev = severityStyle(event.severity);
                return (
                  <tr
                    key={event.id}
                    onClick={() => setDetail(event)}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 cursor-pointer transition-colors hover:bg-[rgba(201,168,76,0.03)]',
                      i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]',
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white">{event.user?.name ?? '—'}</p>
                      <p className="text-[0.68rem] text-white/30">{event.user?.email ?? `#${event.userId.slice(0, 8)}`}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
                        <ShieldAlert className="w-3.5 h-3.5 text-white/30" />
                        {EVENT_LABELS[event.eventType] ?? event.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit border', sev.bg, sev.text, sev.border)}>
                        {event.severity} · {sev.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-white/30">
                        <Clock className="w-3 h-3" />
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td />
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">Page {page} of {totalPages || 1} — {total} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="w-full sm:w-[480px] h-[80vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-[#0d1b2e] border border-white/[0.12] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Event Details</h3>
                <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 space-y-3">
                {[
                  ['Account', detail.user?.name ?? detail.userId],
                  ['Email', detail.user?.email ?? '—'],
                  ['Event', EVENT_LABELS[detail.eventType] ?? detail.eventType],
                  ['Severity', `${detail.severity} · ${severityStyle(detail.severity).label}`],
                  ['Detected', new Date(detail.createdAt).toLocaleString()],
                ].map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-white/40 flex-shrink-0">{key}</span>
                    <span className="text-sm font-semibold text-white text-right truncate">{val}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4">
                <p className="text-xs text-white/40 mb-2">Metadata</p>
                <pre className="text-[0.7rem] text-white/60 whitespace-pre-wrap break-all">{JSON.stringify(detail.metadata, null, 2)}</pre>
              </div>
              <a
                href={`/admin/users?search=${detail.userId}`}
                className="block text-center py-2.5 rounded-xl bg-[rgba(201,168,76,0.15)] border border-[rgba(201,168,76,0.3)] text-[var(--gold)] text-sm font-semibold hover:bg-[rgba(201,168,76,0.25)] transition-all"
              >
                View Account
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
