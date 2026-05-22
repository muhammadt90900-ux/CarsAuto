// apps/web/src/app/[locale]/dashboard/notifications/page.tsx
'use client';

import { useState } from 'react';
import { Bell, MessageSquare, Eye, Star, CheckCircle2, Trash2, Settings, Check } from 'lucide-react';

const notifications = [
  { id: '1', type: 'message', title: 'New message from Ahmed', body: 'Is the Toyota Camry still available?', time: '2 minutes ago', read: false },
  { id: '2', type: 'view', title: 'BMW 3 Series got 12 new views', body: 'Your listing is trending today!', time: '1 hour ago', read: false },
  { id: '3', type: 'review', title: 'New 5-star review received', body: 'Sara Ali left a review on your profile', time: '3 hours ago', read: false },
  { id: '4', type: 'approved', title: 'Honda CR-V listing approved', body: 'Your listing is now live on Auto Bazaar', time: '5 hours ago', read: true },
  { id: '5', type: 'message', title: 'New message from Omar', body: 'I will come to see the car tomorrow.', time: '1 day ago', read: true },
  { id: '6', type: 'view', title: 'Mercedes got 50 views', body: 'Your Mercedes listing is getting a lot of attention!', time: '2 days ago', read: true },
];

const iconMap = {
  message: { Icon: MessageSquare, bg: 'bg-blue-50 dark:bg-blue-500/10', color: 'text-blue-500' },
  view: { Icon: Eye, bg: 'bg-purple-50 dark:bg-purple-500/10', color: 'text-purple-500' },
  review: { Icon: Star, bg: 'bg-amber-50 dark:bg-amber-500/10', color: 'text-amber-500' },
  approved: { Icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-500/10', color: 'text-emerald-500' },
};

export default function NotificationsPage() {
  const [items, setItems] = useState(notifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  const remove = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));

  const shown = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="p-5 lg:p-7 max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e94560] hover:text-[#d63d57] transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100/70 dark:bg-white/5 rounded-xl w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
              filter === f
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 text-[9px] bg-[#e94560] text-white rounded-full w-4 h-4 inline-flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {shown.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No notifications</p>
          </div>
        )}
        {shown.map((notif) => {
          const meta = iconMap[notif.type as keyof typeof iconMap] ?? iconMap.message;
          return (
            <div
              key={notif.id}
              onClick={() => markRead(notif.id)}
              className={`group relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 ${
                !notif.read
                  ? 'bg-white dark:bg-[#0f0f1a]/80 border-gray-100 dark:border-white/8'
                  : 'bg-gray-50/50 dark:bg-white/2 border-gray-50 dark:border-white/3'
              }`}
            >
              {/* Unread dot */}
              {!notif.read && (
                <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#e94560] flex-shrink-0" />
              )}

              <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <meta.Icon className={`w-4 h-4 ${meta.color}`} />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <p className={`text-sm font-semibold ${notif.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'} mb-0.5`}>
                  {notif.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{notif.body}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1.5">{notif.time}</p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); remove(notif.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 hover:text-red-400 flex-shrink-0 self-start"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
