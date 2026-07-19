'use client';
// app/[locale]/admin/notifications/page.tsx
// Compose and send platform-wide notifications.
// The SENT list fetches from GET /admin/notifications (real data).
// When the backend has no sent notifications yet, a clean empty state is shown.

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Bell, Send, Users, Store, Megaphone, CheckCircle2,
  XCircle, Clock, Search, Plus, Trash2, Globe, AlertCircle,
  RefreshCw, Loader2,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';

type NotifAudience = 'ALL' | 'USERS' | 'DEALERS' | 'PREMIUM';
type NotifType     = 'ANNOUNCEMENT' | 'ALERT' | 'PROMOTION' | 'MAINTENANCE';
type NotifStatus   = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';

interface NotifForm {
  title:    string;
  body:     string;
  type:     NotifType;
  audience: NotifAudience;
}

const TYPE_STYLES: Record<NotifType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ANNOUNCEMENT: { label: 'Announcement', icon: Megaphone,   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ALERT:        { label: 'Alert',        icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  PROMOTION:    { label: 'Promotion',    icon: Bell,        color: 'var(--gold)', bg: 'rgba(201,168,76,0.12)' },
  MAINTENANCE:  { label: 'Maintenance',  icon: Clock,       color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

const AUDIENCE_STYLES: Record<NotifAudience, { label: string; icon: React.ElementType; color: string }> = {
  ALL:     { label: 'Everyone',     icon: Globe,  color: '#22c55e' },
  USERS:   { label: 'Users Only',   icon: Users,  color: '#3b82f6' },
  DEALERS: { label: 'Dealers Only', icon: Store,  color: 'var(--gold)' },
  PREMIUM: { label: 'Premium',      icon: Bell,   color: '#8b5cf6' },
};

const STATUS_STYLES: Record<NotifStatus, { label: string; text: string; bg: string; dot: string }> = {
  DRAFT:     { label: 'Draft',     text: 'text-white/40',    bg: 'bg-white/[0.06]',   dot: 'bg-white/20'    },
  SCHEDULED: { label: 'Scheduled', text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
  SENT:      { label: 'Sent',      text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  FAILED:    { label: 'Failed',    text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
};

const INITIAL_FORM: NotifForm = {
  title: '', body: '', type: 'ANNOUNCEMENT', audience: 'ALL',
};

export default function AdminNotificationsPage() {
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatus]      = useState<NotifStatus | 'ALL'>('ALL');
  const [compose,     setCompose]     = useState(false);
  const [form,        setForm]        = useState<NotifForm>(INITIAL_FORM);
  const [sendResult,  setSendResult]  = useState<'ok' | 'err' | null>(null);

  const qc = useQueryClient();

  // Fetch sent notifications — real data only
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn:  () => api.get('/admin/notifications').then(r => r.data),
    staleTime: 30_000,
  });

  const notifications: any[] = data?.data ?? data ?? [];

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: (payload: NotifForm) =>
      api.post('/admin/notifications/send', payload).then(r => r.data),
    onSuccess: () => {
      setSendResult('ok');
      setForm(INITIAL_FORM);
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      setTimeout(() => { setSendResult(null); setCompose(false); }, 2000);
    },
    onError: () => {
      setSendResult('err');
      setTimeout(() => setSendResult(null), 3000);
    },
  });

  const filtered = notifications.filter(n => {
    if (statusFilter !== 'ALL' && n.status !== statusFilter) return false;
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-5 lg:p-7 max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl flex items-center gap-2">
            <Bell className="w-6 h-6 text-[var(--gold)]" />
            Notifications
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Send platform-wide announcements and alerts</p>
        </div>
        <button
          onClick={() => { setCompose(true); setSendResult(null); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                     bg-[var(--gold)] text-[var(--ink-900)] text-sm font-bold
                     hover:bg-[var(--gold-light)] transition-colors"
        >
          <Plus className="w-4 h-4" /> Compose
        </button>
      </div>

      {/* Compose panel */}
      {compose && (
        <div className="rounded-2xl border border-[rgba(201,168,76,0.2)] bg-[#0d1b2e] p-5 space-y-4">
          <h2 className="font-bold text-white text-sm">New Notification</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as NotifType }))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--ink-800)] border border-white/[0.07]
                           text-white text-sm focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
              >
                {(Object.keys(TYPE_STYLES) as NotifType[]).map(t => (
                  <option key={t} value={t}>{TYPE_STYLES[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-1.5">Audience</label>
              <select
                value={form.audience}
                onChange={e => setForm(f => ({ ...f, audience: e.target.value as NotifAudience }))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--ink-800)] border border-white/[0.07]
                           text-white text-sm focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
              >
                {(Object.keys(AUDIENCE_STYLES) as NotifAudience[]).map(a => (
                  <option key={a} value={a}>{AUDIENCE_STYLES[a].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-1.5">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Notification title…"
              maxLength={120}
              className="w-full h-10 px-4 rounded-xl bg-[var(--ink-800)] border border-white/[0.07]
                         text-white text-sm placeholder:text-white/25 focus:outline-none
                         focus:border-[rgba(201,168,76,0.4)] transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-1.5">Message</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Notification body…"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl bg-[var(--ink-800)] border border-white/[0.07]
                         text-white text-sm placeholder:text-white/25 focus:outline-none
                         focus:border-[rgba(201,168,76,0.4)] resize-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCompose(false)}
              className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white
                         border border-white/10 hover:border-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => sendMutation.mutate(form)}
              disabled={!form.title.trim() || !form.body.trim() || sendMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold
                         bg-[var(--gold)] text-[var(--ink-900)] hover:bg-[var(--gold-light)] disabled:opacity-40
                         transition-colors"
            >
              {sendMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : sendResult === 'ok'
                  ? <><CheckCircle2 className="w-4 h-4" /> Sent!</>
                  : sendResult === 'err'
                    ? <><XCircle className="w-4 h-4" /> Failed</>
                    : <><Send className="w-4 h-4" /> Send Now</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notifications…"
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07]
                       text-white text-sm placeholder:text-white/25 focus:outline-none
                       focus:border-[rgba(201,168,76,0.4)]"
          />
        </div>
        {(['ALL','DRAFT','SCHEDULED','SENT','FAILED'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn(
              'px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
              statusFilter === s
                ? 'border-[rgba(201,168,76,0.4)] text-[var(--gold)] bg-[var(--gold-subtle)]'
                : 'border-white/[0.07] text-white/40 hover:text-white hover:border-white/20',
            )}>
            {s === 'ALL' ? 'All' : STATUS_STYLES[s].label}
          </button>
        ))}
        <button onClick={() => refetch()}
          className="h-10 w-10 rounded-xl bg-[#0d1b2e] border border-white/[0.07]
                     text-white/40 hover:text-white hover:border-white/20 transition-all
                     flex items-center justify-center">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({length:4}).map((_,i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.05]" />
          ))
        ) : isError ? (
          <div className="py-10 text-center text-red-400 text-sm">
            Failed to load notifications.{' '}
            <button onClick={() => refetch()} className="underline">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[var(--ink-800)] py-16 text-center">
            <Bell className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white/30">No notifications yet</p>
            <p className="text-xs text-white/20 mt-1">
              Use the Compose button to send your first platform notification.
            </p>
          </div>
        ) : (
          filtered.map((n: any) => {
            const type   = TYPE_STYLES[n.type as NotifType]   ?? TYPE_STYLES.ANNOUNCEMENT;
            const status = STATUS_STYLES[n.status as NotifStatus] ?? STATUS_STYLES.DRAFT;
            const aud    = AUDIENCE_STYLES[n.audience as NotifAudience] ?? AUDIENCE_STYLES.ALL;
            const TypeIcon = type.icon;
            const AudIcon  = aud.icon;
            return (
              <div key={n.id}
                   className="rounded-2xl border border-white/[0.07] bg-[var(--ink-800)] p-4
                              flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: type.bg }}>
                  <TypeIcon className="w-4.5 h-4.5" style={{ color: type.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white text-sm">{n.title}</p>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1', status.text, status.bg)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{n.body}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                    <span className="flex items-center gap-1" style={{ color: aud.color }}>
                      <AudIcon className="w-3 h-3" /> {aud.label}
                    </span>
                    {n.sentTo && <span>→ {n.sentTo.toLocaleString()} recipients</span>}
                    {n.openRate && <span>📬 {n.openRate}% opened</span>}
                    {n.createdAt && <span>{new Date(n.createdAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
