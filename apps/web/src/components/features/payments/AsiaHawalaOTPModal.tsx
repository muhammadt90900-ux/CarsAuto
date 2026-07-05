'use client';
// apps/web/src/components/features/payments/AsiaHawalaOTPModal.tsx
//
// Two-step AsiaHawala OTP modal:
//   Step 1 — enter Iraqi phone → POST /payments/asiahawala/initiate
//   Step 2 — enter 6-digit OTP  → POST /payments/asiahawala/confirm-otp

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { X, Phone, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

interface Props {
  plan: string;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
}

type Step = 'phone' | 'otp' | 'success';
const OTP_LEN = 6;
const RESEND_SEC = 60;

export function AsiaHawalaOTPModal({ plan, onClose, onSuccess }: Props) {
  const locale  = useLocale();
  const isRtl   = locale === 'ku' || locale === 'ar';
  const ku      = locale === 'ku';

  const [step,          setStep]          = useState<Step>('phone');
  const [phone,         setPhone]         = useState('+964');
  const [otp,           setOtp]           = useState<string[]>(Array(OTP_LEN).fill(''));
  const [transactionId, setTransactionId] = useState('');
  const [paymentId,     setPaymentId]     = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [countdown,     setCountdown]     = useState(0);

  const otpRefs     = useRef<Array<HTMLInputElement | null>>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_SEC);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((p) => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  async function handleSend() {
    setError('');
    if (!/^(\+9647|07)\d{9}$/.test(phone.replace(/\s/g, ''))) {
      setError(ku ? 'ژمارەی مۆبایلی درووستی عێراقی بنووسە' : 'Enter a valid Iraqi mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/payments/asiahawala/initiate', { plan, phone });
      setTransactionId(res.data.transactionId);
      setPaymentId(res.data.paymentId);
      setStep('otp');
      startCountdown();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? (ku ? 'هەڵەیەک ڕووی دا' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  async function handleConfirm() {
    const code = otp.join('');
    if (code.length < OTP_LEN) {
      setError(ku ? 'کۆدی OTP تەواو بنووسە' : 'Enter the complete OTP');
      return;
    }
    setLoading(true); setError('');
    try {
      await api.post('/payments/asiahawala/confirm-otp', { transactionId, otp: code });
      setStep('success');
      setTimeout(() => onSuccess(paymentId), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? (ku ? 'کۆدەکە هەڵەیە' : 'Invalid OTP'));
      setOtp(Array(OTP_LEN).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    const next   = Array(OTP_LEN).fill('');
    digits.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, OTP_LEN - 1)]?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-sm bg-white dark:bg-[var(--ink-750)] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
              <Phone className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {ku ? 'ئەسیا حەوالە' : 'AsiaHawala'}
            </span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-gray-500" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Progress dots */}
          {step !== 'success' && (
            <div className="flex items-center gap-2">
              {(['phone', 'otp'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? 'bg-[var(--gold)] text-white' :
                    step === 'otp' && s === 'phone' ? 'bg-emerald-500 text-white' :
                    'bg-gray-200 dark:bg-white/10 text-gray-400'
                  }`}>
                    {step === 'otp' && s === 'phone' ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i === 0 && <div className="w-8 h-px bg-gray-200 dark:bg-white/10" />}
                </div>
              ))}
            </div>
          )}

          {/* STEP 1 — Phone */}
          {step === 'phone' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {ku ? 'ژمارەی مۆبایلەکەت بنووسە' : 'Enter your mobile number'}
              </p>
              <div className="relative">
                <span className="absolute inset-y-0 start-3 flex items-center text-base pointer-events-none select-none">🇮🇶</span>
                <input
                  type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="w-full ps-9 pe-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[var(--gold)] transition-colors"
                  placeholder="+9647700000000" dir="ltr" autoFocus
                />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />{error}
                </div>
              )}
              <button onClick={handleSend} disabled={loading}
                className="w-full py-3 rounded-xl bg-[var(--gold)] text-white text-sm font-bold hover:bg-[#b8943c] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {ku ? 'کۆد بنێرە' : 'Send OTP'}
              </button>
            </div>
          )}

          {/* STEP 2 — OTP */}
          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {ku ? 'کۆدی OTP بنووسە' : 'Enter OTP code'}
              </p>
              <p className="text-xs text-gray-400">{ku ? `کۆد نێردراوە بۆ ${phone}` : `Code sent to ${phone}`}</p>

              <div className="flex gap-2 justify-center" dir="ltr" onPaste={handlePaste}>
                {otp.map((d, i) => (
                  <input key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    autoFocus={i === 0}
                    className={`w-10 h-12 text-center text-lg font-bold rounded-xl border-2 transition-all bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none ${
                      d ? 'border-[var(--gold)]' : 'border-gray-200 dark:border-white/10 focus:border-[var(--gold)]'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />{error}
                </div>
              )}

              <div className="flex justify-center text-xs">
                {countdown > 0 ? (
                  <span className="text-gray-400">
                    {ku ? `دووبارە لە دوای ${countdown}چ` : `Resend in ${countdown}s`}
                  </span>
                ) : (
                  <button onClick={() => { setStep('phone'); setOtp(Array(OTP_LEN).fill('')); setError(''); }}
                    className="flex items-center gap-1 text-[var(--gold)] hover:underline">
                    <RefreshCw className="w-3 h-3" aria-hidden />
                    {ku ? 'دووبارە بنێرە' : 'Resend code'}
                  </button>
                )}
              </div>

              <button onClick={handleConfirm} disabled={loading || otp.join('').length < OTP_LEN}
                className="w-full py-3 rounded-xl bg-[var(--gold)] text-white text-sm font-bold hover:bg-[#b8943c] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {ku ? 'دڵنیاکردنەوە' : 'Confirm Payment'}
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" aria-hidden />
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {ku ? 'پارەدان سەرکەوتوو بوو!' : 'Payment Successful!'}
              </p>
              <p className="text-xs text-gray-400 text-center">
                {ku ? 'بەرپرسیارێتیەکانت چالاک بوون' : 'Your subscription has been activated'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
