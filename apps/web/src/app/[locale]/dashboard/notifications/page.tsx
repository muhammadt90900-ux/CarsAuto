'use client';
// app/[locale]/dashboard/notifications/page.tsx — Fully localized

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, MessageSquare, Eye, Star, CheckCircle2, Trash2, Settings, Check } from 'lucide-react';

const INITIAL_NOTIFICATIONS: Array<{
  id: string; type: string; titleKey: string;
  titleArgs: Record<string, string | number>;
  body: string; time: string; read: boolean;
}> = [
  { id: '1', type: 'message',  titleKey: 'newMessage',   titleArgs: { name: 'Ahmed' },      body: 'Is the Toyota Camry still available?', time: '2m',  read: false },
  { id: '2', type: 'view',     titleKey: 'newViews',     titleArgs: { listing: 'BMW 3 Series', count: 12 }, body: 'Your listing is trending!', time: '1h',  read: false },
  { id: '3', type: 'review',   titleKey: 'newReview',    titleArgs: { stars: 5 },            body: 'Sara Ali left a review on your profile', time: '3h',  read: false },
  { id: '4', type: 'approved', titleKey: 'listingApproved', titleArgs: { listing: 'Honda CR-V' }, body: 'Your listing is now live', time: '5h',  read: true  },
  { id: '5', type: 'message',  titleKey: 'newMessage',   titleArgs: { name: 'Omar' },        body: 'I will come to see the car tomorrow.', time: '1d',  read: true  },
  { id: '6', type: 'view',     titleKey: 'newViews',     titleArgs: { listing: 'Mercedes', count: 50 }, body: 'Getting a lot of attention!', time: '2d',  read: true  },
];

const iconMap = {
  message:  { Icon: MessageSquare, bg: 'bg-blue-50 dark:bg-blue-500/10',    color: 'text-blue-500'    },
  view:     { Icon: Eye,           bg: 'bg-purple-50 dark:bg-purple-500/10', color: 'text-purple-500'  },
  review:   { Icon: Star,          bg: 'bg-amber-50 dark:bg-amber-500/10',  color: 'text-amber-500'   },
  approved: { Icon: CheckCircle2,  bg: 'bg-emerald-50 dark:bg-emerald-500/10', color: 'text-emerald-500' },
} as const;

export default function NotificationsPage() {
  const t  = useTranslations('dashboard');
  const tn = useTranslations('notifications');

  const [items,  setItems]  = useState([...INITIAL_NOTIFICATIONS]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead    = (id: string) => setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  const remove      = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));

  const shown       = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="p-5 lg:p-7 max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t('notifications')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {unreadCount > 0
              ? tn('unreadCount', { count: unreadCount })
              : tn('allCaughtUp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--gold)] hover:text-[#d4b45a] transition-colors"
            >
              <Check className="w-3.5 h-3.5" aria-hidden />
              {t('markAllRead')}
            </button>
          )}
          <button
            aria-label="Notification settings"
            className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              filter === f
                ? 'bg-white dark:bg-[#0f1b2d] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {f === 'all' ? t('allTab') : t('unreadTab')}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ms-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-[#e94560] text-white">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {shown.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" aria-hidden />
          <p className="text-sm text-gray-400">{t('noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((n) => {
            const { Icon, bg, color } = iconMap[n.type as keyof typeof iconMap] ?? iconMap.message;
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer
                            transition-all duration-200 group
                            ${n.read
                              ? 'border-gray-100 dark:border-white/[0.05] bg-white dark:bg-transparent'
                              : 'border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.03)] dark:border-white/[0.08] dark:bg-white/[0.03]'
                            }
                            hover:border-gray-200 dark:hover:border-white/10`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold leading-tight ${n.read ? 'text-gray-700 dark:text-white/60' : 'text-gray-900 dark:text-white'}`}>
                      {tn(n.titleKey as any, n.titleArgs as any)}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--gold)] flex-shrink-0" aria-label="Unread" />
                      )}
                      <span className="text-xs text-gray-400">{n.time}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5 line-clamp-1">
                    {n.body}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                  aria-label="Remove notification"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400
                             hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
                             transition-all duration-200 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
