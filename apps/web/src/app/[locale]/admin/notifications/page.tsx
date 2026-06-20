'use client';
// apps/web/src/app/[locale]/admin/notifications/page.tsx
// Admin: send and manage platform-wide and targeted notifications

import { useState } from 'react';
import {
  Bell, Send, Users, Store, Megaphone, CheckCircle2,
  XCircle, Clock, Search, Plus, Trash2, Eye,
  ChevronLeft, ChevronRight, Globe, AlertCircle,
  ToggleLeft, ToggleRight,
} from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';

type NotifAudience = 'ALL' | 'USERS' | 'DEALERS' | 'PREMIUM';
type NotifType     = 'ANNOUNCEMENT' | 'ALERT' | 'PROMOTION' | 'MAINTENANCE';
type NotifStatus   = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotifType;
  audience: NotifAudience;
  status: NotifStatus;
  sentTo?: number;
  openRate?: number;
  createdAt: string;
  scheduledFor?: string;
}

const NOTIFICATIONS: Notification[] = [
  { id: 'N001', title: 'New Feature: AI Car Valuation', body: 'We\'ve launched AI-powered car valuation...', type: 'ANNOUNCEMENT', audience: 'ALL',     status: 'SENT',      sentTo: 50432, openRate: 34.2, createdAt: '2d ago' },
  { id: 'N002', title: 'Summer Promotion – 50% off listings', body: 'Dealers get 50% off this month...', type: 'PROMOTION',    audience: 'DEALERS',  status: 'SENT',      sentTo: 1243,  openRate: 58.1, createdAt: '5d ago' },
  { id: 'N003', title: 'Scheduled Maintenance Notice',  body: 'Platform will be down for 30 minutes...', type: 'MAINTENANCE',  audience: 'ALL',     status: 'SCHEDULED', createdAt: '1h ago', scheduledFor: 'Tomorrow 2:00 AM' },
  { id: 'N004', title: 'Price Drop Alert Improvement',  body: 'Your saved searches now track price drops...', type: 'ANNOUNCEMENT', audience: 'USERS', status: 'SENT',      sentTo: 48000, openRate: 42.7, createdAt: '1w ago' },
  { id: 'N005', title: 'New Dealer Verification Flow',  body: 'Updated KYC process for faster approval...', type: 'ANNOUNCEMENT', audience: 'DEALERS', status: 'DRAFT',     createdAt: '3h ago' },
  { id: 'N006', title: 'Security Alert: Login Attempt', body: 'Multiple failed logins detected...', type: 'ALERT',        audience: 'ALL',     status: 'SENT',      sentTo: 210,   openRate: 89.3, createdAt: '12h ago' },
  { id: 'N007', title: 'Premium Upgrade Available',     body: 'Unlock unlimited listings and AI tools...', type: 'PROMOTION',    audience: 'USERS',   status: 'FAILED',    createdAt: '6h ago' },
];

const TYPE_STYLES: Record<NotifType, { label: string; icon: any; color: string; bg: string }> = {
  ANNOUNCEMENT: { label: 'Announcement', icon: Megaphone,   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ALERT:        { label: 'Alert',        icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  PROMOTION:    { label: 'Promotion',    icon: Bell,        color: '#c9a84c', bg: 'rgba(201,168,76,0.12)' },
  MAINTENANCE:  { label: 'Maintenance',  icon: Clock,       color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

const AUDIENCE_STYLES: Record<NotifAudience, { label: string; icon: any; color: string }> = {
  ALL:     { label: 'Everyone',     icon: Globe,  color: '#22c55e' },
  USERS:   { label: 'Users Only',   icon: Users,  color: '#3b82f6' },
  DEALERS: { label: 'Dealers Only', icon: Store,  color: '#c9a84c' },
  PREMIUM: { label: 'Premium',      icon: Bell,   color: '#8b5cf6' },
};

const STATUS_STYLES: Record<NotifStatus, { label: string; text: string; bg: string; dot: string }> = {
  DRAFT:     { label: 'Draft',     text: 'text-white/40',    bg: 'bg-white/[0.06]',   dot: 'bg-white/20'    },
  SCHEDULED: { label: 'Scheduled', text: 'text-blue-400',    bg: 'bg-blue-400/10',    dot: 'bg-blue-400'    },
  SENT:      { label: 'Sent',      text: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  FAILED:    { label: 'Failed',    text: 'text-red-400',     bg: 'bg-red-400/10',     dot: 'bg-red-400'     },
};

const PAGE_SIZE = 8;

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatus]         = useState<NotifStatus | 'ALL'>('ALL');
  const [page, setPage]                   = useState(1);
  const [compose, setCompose]             = useState(false);
  const [sending, setSending]             = useState(false);

  // Compose form state
  const [form, setForm] = useState({
    title: '', body: '',
    type: 'ANNOUNCEMENT' as NotifType,
    audience: 'ALL' as NotifAudience,
    scheduled: false,
    scheduledFor: '',
    pushEnabled: true,
    emailEnabled: false,
    inAppEnabled: true,
  });

  const filtered = notifications.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || n.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSend = async () => {
    if (!form.title || !form.body) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    const newNotif: Notification = {
      id: `N${String(notifications.length + 100).padStart(3, '0')}`,
      ...form,
      status: form.scheduled ? 'SCHEDULED' : 'SENT',
      sentTo: form.scheduled ? undefined : Math.floor(Math.random() * 50000),
      openRate: form.scheduled ? undefined : Math.random() * 60 + 10,
      createdAt: 'Just now',
    };
    setNotifications(prev => [newNotif, ...prev]);
    setSending(false);
    setCompose(false);
    setForm({ title: '', body: '', type: 'ANNOUNCEMENT', audience: 'ALL', scheduled: false, scheduledFor: '', pushEnabled: true, emailEnabled: false, inAppEnabled: true });
  };

  const deleteNotif = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const stats = {
    totalSent:   notifications.filter(n => n.status === 'SENT').reduce((s, n) => s + (n.sentTo ?? 0), 0),
    avgOpenRate: (() => {
      const sent = notifications.filter(n => n.openRate);
      return sent.length ? (sent.reduce((s, n) => s + (n.openRate ?? 0), 0) / sent.length).toFixed(1) : '0';
    })(),
    scheduled:   notifications.filter(n => n.status === 'SCHEDULED').length,
    failed:      notifications.filter(n => n.status === 'FAILED').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight flex items-center gap-3">
            <Bell className="w-6 h-6 text-[#c9a84c]" />
            Notifications
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Send and manage platform notifications</p>
        </div>
        <button
          onClick={() => setCompose(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] text-sm font-bold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Notification
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Delivered',    value: stats.totalSent.toLocaleString(), color: '#22c55e', icon: Send         },
          { label: 'Avg. Open Rate',     value: `${stats.avgOpenRate}%`,          color: '#c9a84c', icon: Eye          },
          { label: 'Scheduled',          value: stats.scheduled,                  color: '#3b82f6', icon: Clock        },
          { label: 'Failed',             value: stats.failed,                     color: '#ef4444', icon: AlertCircle  },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${s.color}15`, border: `1px solid ${s.color}22` }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[0.68rem] text-white/35">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search notifications…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07]">
          {(['ALL', 'DRAFT', 'SCHEDULED', 'SENT', 'FAILED'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                statusFilter === s ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                                   : 'text-white/40 hover:text-white/70')}
            >
              {s === 'ALL' ? 'All' : STATUS_STYLES[s as NotifStatus].label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification cards */}
      <div className="space-y-3">
        {paged.map(notif => {
          const typeStyle     = TYPE_STYLES[notif.type];
          const audienceStyle = AUDIENCE_STYLES[notif.audience];
          const statusStyle   = STATUS_STYLES[notif.status];
          const TypeIcon      = typeStyle.icon as any;
          const AudienceIcon  = audienceStyle.icon as any;

          return (
            <div
              key={notif.id}
              className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-5 hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: typeStyle.bg, border: `1px solid ${typeStyle.color}22` }}>
                    <TypeIcon className="w-4.5 h-4.5" style={{ color: typeStyle.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="font-semibold text-white">{notif.title}</h3>
                      <span className={cn('flex items-center gap-1.5 text-[0.68rem] font-semibold px-2 py-0.5 rounded-full', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-sm text-white/40 truncate">{notif.body}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: audienceStyle.color }}>
                        <AudienceIcon className="w-3 h-3" />
                        {audienceStyle.label}
                      </span>
                      <span className="text-xs text-white/30">{notif.createdAt}</span>
                      {notif.scheduledFor && (
                        <span className="flex items-center gap-1 text-xs text-blue-400">
                          <Clock className="w-3 h-3" />
                          {notif.scheduledFor}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: stats + actions */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {notif.sentTo && (
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-white">{notif.sentTo.toLocaleString()}</p>
                      <p className="text-[0.65rem] text-white/30">delivered</p>
                    </div>
                  )}
                  {notif.openRate && (
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-[#c9a84c]">{notif.openRate.toFixed(1)}%</p>
                      <p className="text-[0.65rem] text-white/30">open rate</p>
                    </div>
                  )}
                  <button
                    onClick={() => deleteNotif(notif.id)}
                    className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-white/30">{filtered.length} notifications</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)}
                      className={cn('w-7 h-7 rounded-lg text-xs font-semibold transition-all',
                        page === i + 1 ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                                       : 'text-white/40 hover:text-white hover:bg-white/[0.08]')}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {compose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1b2e] border border-white/[0.12] overflow-auto max-h-[90vh]">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-lg">Compose Notification</h3>
                <button onClick={() => setCompose(false)} className="text-white/30 hover:text-white/70 transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Type */}
              <div>
                <p className="text-xs text-white/40 mb-2">Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_STYLES) as NotifType[]).map(t => {
                    const s = TYPE_STYLES[t];
                    const Icon = s.icon as any;
                    return (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                          form.type === t
                            ? 'border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c]'
                            : 'border-white/[0.07] bg-white/[0.03] text-white/50 hover:text-white/70',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: form.type === t ? s.color : undefined }} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audience */}
              <div>
                <p className="text-xs text-white/40 mb-2">Audience</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(AUDIENCE_STYLES) as NotifAudience[]).map(a => {
                    const s = AUDIENCE_STYLES[a];
                    const Icon = s.icon as any;
                    return (
                      <button
                        key={a}
                        onClick={() => setForm(f => ({ ...f, audience: a }))}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                          form.audience === a
                            ? 'border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c]'
                            : 'border-white/[0.07] bg-white/[0.03] text-white/50 hover:text-white/70',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="text-xs text-white/40 mb-2">Title</p>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Notification title…"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40"
                />
              </div>

              {/* Body */}
              <div>
                <p className="text-xs text-white/40 mb-2">Message</p>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={3}
                  placeholder="Write your notification message…"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40 resize-none"
                />
              </div>

              {/* Channels */}
              <div>
                <p className="text-xs text-white/40 mb-3">Channels</p>
                <div className="space-y-2">
                  {[
                    { key: 'pushEnabled', label: 'Push Notification' },
                    { key: 'emailEnabled', label: 'Email' },
                    { key: 'inAppEnabled', label: 'In-App' },
                  ].map(ch => (
                    <div key={ch.key} className="flex items-center justify-between">
                      <span className="text-sm text-white/60">{ch.label}</span>
                      <button
                        onClick={() => setForm(f => ({ ...f, [ch.key]: !f[ch.key as keyof typeof form] }))}
                        className={cn('transition-colors', form[ch.key as keyof typeof form] ? 'text-[#c9a84c]' : 'text-white/20')}
                      >
                        {form[ch.key as keyof typeof form]
                          ? <ToggleRight className="w-5 h-5" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40">Schedule for later</p>
                  <button
                    onClick={() => setForm(f => ({ ...f, scheduled: !f.scheduled }))}
                    className={cn('transition-colors', form.scheduled ? 'text-[#c9a84c]' : 'text-white/20')}
                  >
                    {form.scheduled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>
                {form.scheduled && (
                  <input
                    type="datetime-local"
                    value={form.scheduledFor}
                    onChange={e => setForm(f => ({ ...f, scheduledFor: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm focus:outline-none focus:border-[#c9a84c]/40"
                  />
                )}
              </div>

              {/* CTA */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCompose(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-sm font-semibold hover:bg-white/[0.08] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!form.title || !form.body || sending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
                >
                  {sending ? (
                    <><CheckCircle2 className="w-4 h-4 animate-spin" />Sending…</>
                  ) : form.scheduled ? (
                    <><Clock className="w-4 h-4" />Schedule</>
                  ) : (
                    <><Send className="w-4 h-4" />Send Now</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
