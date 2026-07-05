'use client';
// app/[locale]/dashboard/profile/page.tsx

import { useState, useEffect } from 'react';
import { authApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { User, Phone, FileText, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = useState({
    name:  user?.name  ?? '',
    phone: user?.phone ?? '',
    bio:   '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    // FIX: /auth/me پڕ کردنەوەی زانیارییە نوێکانی بەکارهێنەر — URL ی درووست
    authApi.me()
      .then((data) => {
        setForm({
          name:  data.name  ?? '',
          phone: data.phone ?? '',
          bio:   (data as any).bio ?? '',
        });
      })
      .catch(() => {
        // fallback بۆ زانیاری store ئەگەر نیەتووک
        setForm({
          name:  user?.name  ?? '',
          phone: user?.phone ?? '',
          bio:   '',
        });
      });
  }, []);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      // FIX: /users/profile ـە نەک /users/me
      const updated = await usersApi.updateMe(form);
      // FIX: merge updated fields with existing user to preserve role/verified
      if (user) setUser({ ...user, ...updated });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? null;
      setError(
        Array.isArray(msg)
          ? msg.join(' · ')
          : msg ?? 'پاشەکەوتکردن سەرکەوتوو نەبوو. دووبارە هەوڵ بدە.'
      );
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { label: 'ناو',            field: 'name',  icon: User,      placeholder: 'ناوی تەواو',            type: 'text' },
    { label: 'ژمارەی مۆبایل', field: 'phone', icon: Phone,     placeholder: '+964 7XX XXX XXXX',     type: 'tel'  },
    { label: 'درباری خۆم',    field: 'bio',   icon: FileText,  placeholder: 'کورتە درباری خۆت...',   type: 'text' },
  ] as const;

  return (
    <div className="p-5 lg:p-7 max-w-xl space-y-6">

      {/* ── سەردێر ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-white">پرۆفایلم</h1>
        <p className="text-white/40 text-sm mt-1">زانیارییەکانت نوێ بکەرەوە</p>
      </div>

      {/* ── ئاڤاتار ────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.2)] border-2 border-[rgba(201,168,76,0.4)]
                        flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-[var(--gold)]">
            {form.name?.charAt(0)?.toUpperCase() ?? '?'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-medium truncate">{form.name || 'بەکارهێنەر'}</p>
          <p className="text-white/40 text-xs truncate">{user?.email ?? ''}</p>
          {user?.role && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px]
                             font-bold bg-[rgba(201,168,76,0.15)] text-[var(--gold)] border border-[rgba(201,168,76,0.25)]">
              {user.role}
            </span>
          )}
        </div>
      </div>

      {/* ── فۆرمەکان ───────────────────────────────────────────── */}
      <div className="space-y-4">
        {fields.map(({ label, field, icon: Icon, placeholder, type }) => (
          <div key={field}>
            <label className="block text-white/60 text-sm mb-1.5">{label}</label>
            <div className="relative">
              <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30
                               pointer-events-none" />
              <input
                type={type}
                value={form[field]}
                onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl
                           px-4 pr-10 py-2.5 text-white placeholder:text-white/25
                           text-sm focus:outline-none focus:border-[rgba(201,168,76,0.4)]
                           focus:ring-1 focus:ring-[rgba(201,168,76,0.2)] transition-all duration-200"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── هەڵە ───────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm
                        bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── دوگمەی پاشەکەوتکردن ───────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                   bg-[var(--gold)] text-[var(--ink-900)] font-bold text-sm
                   disabled:opacity-60 disabled:cursor-not-allowed
                   hover:bg-[#d4b45a] active:scale-[0.98]
                   shadow-[0_4px_16px_rgba(201,168,76,0.35)]
                   hover:shadow-[0_6px_24px_rgba(201,168,76,0.50)]
                   transition-all duration-200"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {loading ? 'پاشەکەوتکردن...' : success ? 'پاشەکەوتکرا! ✓' : 'پاشەکەوتکردن'}
      </button>

      {/* ── ئیمەیل — تەنها خوێندنەوە ──────────────────────────── */}
      {user?.email && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-white/30 text-xs mb-0.5">ئیمەیل (ناتوانرێت بگۆڕدرێت)</p>
          <p className="text-white/60 text-sm">{user.email}</p>
        </div>
      )}
    </div>
  );
}
