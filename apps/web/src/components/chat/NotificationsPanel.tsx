'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: {
    chatId?: string;
    listingId?: string;
    senderId?: string;
    eventType?: string;
    savedSearchId?: string;
  };
}

interface Props {
  userId: string;
  token: string;
  apiBase?: string;
  wsUrl?: string;
  onNavigate?: (path: string) => void;
}

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const TYPE_ICON: Record<string, string> = {
  new_message: '💬',
  listing_sold: '🏷️',
  price_drop: '📉',
  favorite_alert: '❤️',
  saved_search_alert: '🔔',
  offer_received: '💰',
  offer_accepted: '✅',
  offer_declined: '❌',
  system: 'ℹ️',
};

function typeIcon(type: string) {
  return TYPE_ICON[type] ?? '🔔';
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsPanel({
  userId,
  token,
  apiBase = '/api',
  wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001',
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const panelRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // ---------------------------------------------------------------------------
  // Load notifications
  // ---------------------------------------------------------------------------

  const fetchNotifications = useCallback(async () => {
    // Skip entirely until a real token exists — DashboardLayoutClient passes
    // `getAccessToken() ?? ''` so this can run once with an empty token
    // during the auth-hydration race on first page load. useEffect below
    // re-runs this once `token` changes to a real value.
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // BUG FIX: this used to call res.json() and immediately do
      // data.filter(...) with no check first. Any non-200 response (401
      // when `token` is empty/stale during the auth-hydration race on page
      // load, 404 if apiBase/NEXT_PUBLIC_API_URL is misconfigured, 500,
      // etc.) still returns valid JSON — just an error object like
      // { statusCode: 401, message: 'Unauthorized' } instead of an array —
      // which crashed the whole panel with "data.filter is not a function".
      // Now: skip silently on !res.ok or a non-array body, and keep
      // whatever notifications were already showing instead of blowing up.
      if (!res.ok) {
        console.error(`Failed to load notifications: ${res.status}`);
        return;
      }
      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        console.error('Notifications response was not an array:', data);
        return;
      }
      setNotifications(data as AppNotification[]);
      setUnread(data.filter((n: AppNotification) => !n.read).length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ---------------------------------------------------------------------------
  // Real-time via socket
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const socket = io(`${wsUrl}/chat`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('notification', (notification: AppNotification) => {
      setNotifications((prev) =>
        prev.some((n) => n.id === notification.id) ? prev : [notification, ...prev],
      );
      setUnread((c) => c + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, wsUrl]);

  // ---------------------------------------------------------------------------
  // Click-outside to close
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const markAllRead = useCallback(async () => {
    await fetch(`${apiBase}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }, [apiBase, token]);

  const markOneRead = useCallback(
    async (id: string) => {
      await fetch(`${apiBase}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnread((c) => Math.max(0, c - 1));
    },
    [apiBase, token],
  );

  const dismiss = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await fetch(`${apiBase}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.read) setUnread((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.id !== id);
      });
    },
    [apiBase, token],
  );

  const handleClick = useCallback(
    async (n: AppNotification) => {
      if (!n.read) await markOneRead(n.id);
      setOpen(false);

      if (!onNavigate) return;
      if (n.data?.chatId) onNavigate(`/messages/${n.data.chatId}`);
      else if (n.data?.listingId) onNavigate(`/listings/${n.data.listingId}`);
    },
    [markOneRead, onNavigate],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const displayed =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div ref={panelRef} style={styles.wrapper}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={styles.bell}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        🔔
        {unread > 0 && (
          <span style={styles.badge} aria-live="polite">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="notifications-panel"
          role="dialog"
          aria-label="Notifications"
          style={styles.panel}
        >
          {/* Panel header */}
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Notifications</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={styles.textBtn}>
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={styles.iconBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={styles.tabs}>
            {(['all', 'unread'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  ...styles.tab,
                  borderBottom: filter === tab ? '2px solid var(--color-accent, var(--status-info))' : '2px solid transparent',
                  color: filter === tab ? 'var(--color-accent, var(--status-info))' : 'var(--color-muted, #64748b)',
                  fontWeight: filter === tab ? 700 : 400,
                }}
              >
                {tab === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={styles.list} role="list">
            {loading && <div style={styles.empty}>Loading…</div>}
            {!loading && displayed.length === 0 && (
              <div style={styles.empty}>
                {filter === 'unread' ? 'No unread notifications 🎉' : 'No notifications yet'}
              </div>
            )}
            {displayed.map((n) => (
              <div
                key={n.id}
                role="listitem"
                onClick={() => handleClick(n)}
                style={{
                  ...styles.item,
                  background: n.read
                    ? 'transparent'
                    : 'var(--color-accent-muted, rgba(37,99,235,0.06))',
                  cursor: 'pointer',
                }}
              >
                <div style={styles.itemIcon}>{typeIcon(n.type)}</div>
                <div style={styles.itemBody}>
                  <div style={styles.itemTitle}>{n.title}</div>
                  <div style={styles.itemText}>{n.body}</div>
                  <div style={styles.itemTime}>{relativeTime(n.createdAt)}</div>
                </div>
                <button
                  onClick={(e) => dismiss(n.id, e)}
                  style={styles.dismissBtn}
                  aria-label="Dismiss notification"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{panelCSS}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative', display: 'inline-block' },
  bell: {
    position: 'relative',
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    padding: '6px',
    borderRadius: 8,
    lineHeight: 1,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    padding: '0 4px',
    borderRadius: 9,
    background: '#ef4444',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    pointerEvents: 'none',
  },
  panel: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 360,
    maxHeight: 520,
    background: 'var(--color-surface, #fff)',
    borderRadius: 14,
    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
    border: '1px solid var(--color-border, var(--surface-200))',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 10px',
    borderBottom: '1px solid var(--color-border, var(--surface-200))',
  },
  panelTitle: { fontWeight: 800, fontSize: 16 },
  textBtn: {
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: 'var(--color-accent, var(--status-info))',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 4,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted, #64748b)',
    fontSize: 14,
    padding: 4,
    borderRadius: 4,
  },
  tabs: {
    display: 'flex',
    padding: '0 16px',
    borderBottom: '1px solid var(--color-border, var(--surface-200))',
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '8px 12px 7px',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'color 0.15s',
  },
  list: { overflowY: 'auto', flex: 1 },
  empty: {
    padding: '32px 16px',
    textAlign: 'center',
    color: 'var(--color-muted, var(--text-faint))',
    fontSize: 14,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 14px',
    borderBottom: '1px solid var(--color-border, var(--surface-100))',
    transition: 'background 0.1s',
  },
  itemIcon: { fontSize: 20, flexShrink: 0, marginTop: 2 },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: {
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--color-text, #1e293b)',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 12,
    color: 'var(--color-muted, #64748b)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemTime: { fontSize: 11, color: 'var(--color-muted, var(--text-faint))', marginTop: 4 },
  dismissBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted, var(--surface-300))',
    fontSize: 12,
    padding: 4,
    flexShrink: 0,
    opacity: 0,
    transition: 'opacity 0.15s',
    borderRadius: 4,
  },
};

const panelCSS = `
  .notifications-panel .notifications-item:hover .dismiss-btn,
  .notifications-panel div[role="listitem"]:hover button:last-child {
    opacity: 1 !important;
  }
  .notifications-panel div[role="listitem"]:hover {
    background: var(--color-surface-2, var(--surface-50)) !important;
  }
  .notifications-panel div[style*="overflow-y"]::-webkit-scrollbar { width: 4px; }
  .notifications-panel div[style*="overflow-y"]::-webkit-scrollbar-thumb {
    background: var(--color-border, var(--surface-200)); border-radius: 4px;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .notifications-panel { animation: slideDown 0.18s ease; }
`;
