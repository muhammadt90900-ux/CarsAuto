'use client';
// apps/web/src/app/[locale]/admin/verification/page.tsx
//
// Trust & Safety Prompt 2/6/7 frontend — new tab on the existing admin
// panel, wired to VerificationController/AdminVerificationController
// (Prompt 2): GET /admin/verification/queue, POST /admin/verification/:id/approve,
// POST /admin/verification/:id/reject.

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, FileText, Clock,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

interface VerificationRequest {
  id: string;
  userId: string;
  documentType: string;
  documentFrontUrl: string;
  documentBackUrl: string | null;
  selfieUrl: string;
  status: string;
  submittedAt: string;
  user?: { id: string; name: string; email: string; phone?: string; createdAt: string } | null;
}

const PAGE_SIZE = 20;

export default function AdminVerificationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [items, setItems]     = useState<VerificationRequest[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [detail, setDetail]   = useState<VerificationRequest | null>(null);
  const [acting, setActing]   = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectFor, setShowRejectFor] = useState<string | null>(null);

  const fetchQueue = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get(`/admin/verification/queue?page=${page}&limit=${PAGE_SIZE}`)
      .then(r => {
        setItems(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load verification queue'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const approve = async (id: string) => {
    setActing(id);
    try {
      await api.post(`/admin/verification/${id}/approve`);
      setDetail(null);
      fetchQueue();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to approve');
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: string) => {
    if (rejectReason.trim().length < 3) return;
    setActing(id);
    try {
      await api.post(`/admin/verification/${id}/reject`, { reason: rejectReason.trim() });
      setDetail(null);
      setShowRejectFor(null);
      setRejectReason('');
      fetchQueue();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to reject');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display font-black text-white text-2xl tracking-tight">ID Verification Queue</h1>
        <p className="text-white/40 text-sm mt-0.5">Private-seller identity verification — pending review, oldest first</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
        </div>
      ) : error && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-white/40 text-sm">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ShieldCheck className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No pending verification requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setDetail(item)}
              className="text-left rounded-2xl bg-[#0d1b2e] border border-white/[0.08] p-4 space-y-3 hover:border-[rgba(201,168,76,0.3)] transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white text-sm truncate">{item.user?.name ?? '—'}</p>
                <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">
                  {item.documentType.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-white/30 truncate">{item.user?.email}</p>
              <div className="flex items-center gap-1 text-[0.68rem] text-white/30">
                <Clock className="w-3 h-3" />
                Submitted {new Date(item.submittedAt).toLocaleDateString()}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <img src={item.documentFrontUrl} alt="Document front" className="w-full h-16 object-cover rounded-lg border border-white/[0.08]" />
                {item.documentBackUrl && (
                  <img src={item.documentBackUrl} alt="Document back" className="w-full h-16 object-cover rounded-lg border border-white/[0.08]" />
                )}
                <img src={item.selfieUrl} alt="Selfie" className="w-full h-16 object-cover rounded-lg border border-white/[0.08]" />
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-8 h-8 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-white/40">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-8 h-8 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setDetail(null); setShowRejectFor(null); }}>
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1b2e] border border-white/[0.12] max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{detail.user?.name}</h3>
                  <p className="text-xs text-white/30">{detail.user?.email}</p>
                </div>
                <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-white/40 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {detail.documentType.replace('_', ' ')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <a href={detail.documentFrontUrl} target="_blank" rel="noopener noreferrer">
                    <img src={detail.documentFrontUrl} alt="Document front" className="w-full h-40 object-cover rounded-xl border border-white/[0.08]" />
                    <p className="text-[0.65rem] text-white/30 mt-1 text-center">Front</p>
                  </a>
                  {detail.documentBackUrl ? (
                    <a href={detail.documentBackUrl} target="_blank" rel="noopener noreferrer">
                      <img src={detail.documentBackUrl} alt="Document back" className="w-full h-40 object-cover rounded-xl border border-white/[0.08]" />
                      <p className="text-[0.65rem] text-white/30 mt-1 text-center">Back</p>
                    </a>
                  ) : (
                    <a href={detail.selfieUrl} target="_blank" rel="noopener noreferrer">
                      <img src={detail.selfieUrl} alt="Selfie" className="w-full h-40 object-cover rounded-xl border border-white/[0.08]" />
                      <p className="text-[0.65rem] text-white/30 mt-1 text-center">Selfie</p>
                    </a>
                  )}
                </div>
                {detail.documentBackUrl && (
                  <a href={detail.selfieUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={detail.selfieUrl} alt="Selfie" className="w-full h-40 object-cover rounded-xl border border-white/[0.08]" />
                    <p className="text-[0.65rem] text-white/30 mt-1 text-center">Selfie</p>
                  </a>
                )}
              </div>

              {showRejectFor === detail.id ? (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection…"
                    maxLength={255}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-red-400/40 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => reject(detail.id)}
                      disabled={acting === detail.id || rejectReason.trim().length < 3}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-30 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      {acting === detail.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Confirm Rejection
                    </button>
                    <button onClick={() => setShowRejectFor(null)} className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.1] transition-all">
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(detail.id)}
                    disabled={acting === detail.id}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold disabled:opacity-30 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    {acting === detail.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectFor(detail.id)}
                    disabled={acting === detail.id}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/70 text-sm font-bold hover:bg-white/[0.1] transition-all"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
