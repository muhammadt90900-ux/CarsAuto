'use client';

/**
 * ChatWindow — production-grade realtime chat component
 *
 * Features implemented:
 *  ✓ Typing indicators (debounced, server-side timeout safety net)
 *  ✓ Read receipts (✓ sent / ✓✓ delivered / ✓✓ read, shown in blue)
 *  ✓ Reconnection logic (exponential back-off, catch-up on reconnect)
 *  ✓ Message delivery guarantees (optimistic UI + tempId ACK, retry on failure)
 *  ✓ Presence tracking (online dot + offline timestamp)
 *  ✓ Infinite scroll / pagination
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'offer';
  createdAt: string;
  sender: ChatUser;
  readReceipts?: { userId: string; readAt?: string }[];
  // client-only
  status?: MessageStatus;
  tempId?: string;
}

export interface Chat {
  id: string;
  listing: { id: string; title: string; price: number; images: { url: string }[] };
  buyer: ChatUser;
  seller: ChatUser;
  messages: ChatMessage[];
  unreadCount: number;
}

interface Props {
  chat: Chat;
  currentUser: ChatUser;
  token: string;
  apiBase?: string;
  wsUrl?: string;
  onClose?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPING_DEBOUNCE_MS = 1_500;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_TIMEOUT_MS = 8_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ user, size = 32 }: { user: ChatUser; size?: number }) {
  return user.avatar ? (
    <img
      src={user.avatar}
      alt={user.name}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--color-accent, #2563eb)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

/** Read receipt tick icon */
function ReadTick({ status }: { status: MessageStatus }) {
  if (status === 'pending') return <span style={tickStyle}>🕐</span>;
  if (status === 'failed') return <span style={{ ...tickStyle, color: '#ef4444' }}>✕</span>;
  if (status === 'sent') return <span style={tickStyle}>✓</span>;
  if (status === 'delivered') return <span style={tickStyle}>✓✓</span>;
  if (status === 'read')
    return <span style={{ ...tickStyle, color: '#3b82f6' }}>✓✓</span>;
  return null;
}

const tickStyle: React.CSSProperties = {
  marginLeft: 4,
  fontSize: 11,
  color: '#94a3b8',
};

/** Animated typing bubble */
function TypingBubble({ user }: { user: ChatUser }) {
  return (
    <div style={{ ...styles.messageRow, justifyContent: 'flex-start', marginBottom: 4 }}>
      <div style={{ width: 32, marginRight: 8 }}>
        <Avatar user={user} size={32} />
      </div>
      <div
        style={{
          ...styles.bubble,
          background: 'var(--color-surface-2, #f1f5f9)',
          padding: '10px 14px',
          display: 'inline-flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
        <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatWindow({
  chat,
  currentUser,
  token,
  apiBase = '/api',
  wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001',
  onClose,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(chat.messages ?? []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastConnectedAtRef = useRef<string | null>(null);

  const otherUser = currentUser.id === chat.buyer.id ? chat.seller : chat.buyer;

  // ─── Helpers: message state mutations ──────────────────────────────────────

  const upsertMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      // Replace pending optimistic message by tempId, or add if new
      const idx = prev.findIndex(
        (m) => (incoming.tempId && m.tempId === incoming.tempId) || m.id === incoming.id,
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...prev[idx], ...incoming };
        return updated;
      }
      return [...prev, incoming];
    });
  }, []);

  const updateMessageStatus = useCallback((idOrTempId: string, status: MessageStatus) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === idOrTempId || m.tempId === idOrTempId ? { ...m, status } : m,
      ),
    );
  }, []);

  // ─── Socket setup ───────────────────────────────────────────────────────────

  useEffect(() => {
    const socket = io(`${wsUrl}/chat`, {
      auth: { token },
      // Allow polling fallback for restrictive networks
      transports: ['websocket', 'polling'],
      // Built-in reconnection with exponential back-off
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
    });
    socketRef.current = socket;

    // ── Connection lifecycle ────────────────────────────────────────────────

    socket.on('connect', () => {
      setConnectionState('connected');
      socket.emit('joinChat', chat.id);

      // Catch up on missed messages since last disconnect
      if (lastConnectedAtRef.current) {
        socket.emit('catchUp', { chatId: chat.id, since: lastConnectedAtRef.current });
      }

      // Query presence of the other user
      socket.emit('getOnlineStatus', [otherUser.id]);

      // Mark chat as read
      socket.emit('markRead', { chatId: chat.id });
    });

    socket.on('connected', ({ serverTime }: { userId: string; serverTime: number }) => {
      lastConnectedAtRef.current = new Date(serverTime).toISOString();
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
      lastConnectedAtRef.current = new Date().toISOString();
    });

    socket.on('connect_error', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect', () => {
      setConnectionState('connected');
    });

    // ── Messages ───────────────────────────────────────────────────────────

    socket.on('newMessage', (msg: ChatMessage) => {
      if (msg.chatId !== chat.id) return;
      upsertMessage({ ...msg, status: 'delivered' });
      // Auto-read since window is open
      socket.emit('markRead', { chatId: chat.id });
    });

    // ACK back to sender: server persisted the message
    socket.on('messageSent', (msg: ChatMessage & { tempId?: string }) => {
      upsertMessage({ ...msg, status: 'sent' });
    });

    // Recipient was online and event was pushed
    socket.on(
      'messageDelivered',
      ({ messageId }: { messageId: string; chatId: string; deliveredAt: string }) => {
        updateMessageStatus(messageId, 'delivered');
      },
    );

    socket.on('messageError', ({ tempId, error }: { tempId?: string; error: string }) => {
      if (tempId) updateMessageStatus(tempId, 'failed');
      console.error('[chat] message error:', error);
    });

    // Catch-up after reconnect
    socket.on('missedMessages', ({ messages: missed }: { chatId: string; messages: ChatMessage[] }) => {
      missed.forEach((m) => upsertMessage({ ...m, status: 'delivered' }));
    });

    // ── Read receipts ──────────────────────────────────────────────────────

    socket.on(
      'messagesRead',
      ({ readBy }: { chatId: string; readBy: string; readAt: string; messageIds: string[] | null }) => {
        if (readBy === currentUser.id) return;
        // Mark all our sent messages as read
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === currentUser.id && (m.status === 'sent' || m.status === 'delivered')
              ? { ...m, status: 'read' }
              : m,
          ),
        );
      },
    );

    // ── Typing ─────────────────────────────────────────────────────────────

    socket.on('userTyping', ({ userId }: { userId: string }) => {
      if (userId === currentUser.id) return;
      setTypingUsers((prev) => new Set([...prev, userId]));
    });

    socket.on('userStoppedTyping', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // ── Presence ───────────────────────────────────────────────────────────

    socket.on('userOnline', ({ userId }: { userId: string }) => {
      if (userId === otherUser.id) {
        setOnline(true);
        setLastSeen(null);
      }
    });

    socket.on('userOffline', ({ userId, lastSeen: ls }: { userId: string; lastSeen: string }) => {
      if (userId === otherUser.id) {
        setOnline(false);
        setLastSeen(ls);
      }
    });

    socket.on('presenceSync', ({ onlineUsers: ou }: { chatId: string; onlineUsers: string[] }) => {
      if (ou.includes(otherUser.id)) setOnline(true);
    });

    // Legacy getOnlineStatus response (callback style not always supported; listen for presenceSync instead)
    socket.on('onlineStatus', (result: Record<string, boolean>) => {
      setOnline(result[otherUser.id] ?? false);
    });

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, token, wsUrl]);

  // ─── Scroll to bottom ──────────────────────────────────────────────────────

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.size]);

  // ─── Load older messages ───────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const prevScrollHeight = containerRef.current?.scrollHeight ?? 0;

    try {
      const params = new URLSearchParams({ limit: '30' });
      if (nextCursor) params.set('cursor', nextCursor);

      const res = await fetch(`${apiBase}/chats/${chat.id}/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setMessages((prev) => [...json.messages, ...prev]);
      setHasMore(json.hasMore);
      setNextCursor(json.nextCursor);

      // Restore scroll position so older messages appear above
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop =
            containerRef.current.scrollHeight - prevScrollHeight;
        }
      });
    } finally {
      setLoadingMore(false);
    }
  }, [apiBase, chat.id, hasMore, loadingMore, nextCursor, token]);

  const handleScroll = useCallback(() => {
    if (containerRef.current && containerRef.current.scrollTop < 80) {
      loadMore();
    }
  }, [loadMore]);

  // ─── Send message with optimistic UI + retry ───────────────────────────────

  const sendMessage = useCallback(
    (retryTempId?: string, retryContent?: string) => {
      const content = retryContent ?? input.trim();
      if (!content || !socketRef.current) return;

      const tempId = retryTempId ?? nanoid();

      // Optimistic render
      if (!retryTempId) {
        const optimistic: ChatMessage = {
          id: tempId, // will be replaced by real id on ACK
          chatId: chat.id,
          senderId: currentUser.id,
          content,
          type: 'text',
          createdAt: new Date().toISOString(),
          sender: currentUser,
          status: 'pending',
          tempId,
        };
        setMessages((prev) => [...prev, optimistic]);
        setInput('');
      } else {
        updateMessageStatus(tempId, 'pending');
      }

      // Stop typing
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (isTyping) {
        socketRef.current.emit('stopTyping', { chatId: chat.id });
        setIsTyping(false);
      }

      // Emit with tempId for server ACK
      socketRef.current.emit('sendMessage', { chatId: chat.id, content, tempId });

      // Delivery timeout — retry up to MAX_RETRY_ATTEMPTS
      let attempt = 0;
      const scheduleRetry = () => {
        setTimeout(() => {
          setMessages((prev) => {
            const msg = prev.find((m) => m.tempId === tempId);
            if (!msg || msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') {
              return prev; // already ACKed
            }
            attempt++;
            if (attempt >= MAX_RETRY_ATTEMPTS) {
              return prev.map((m) => (m.tempId === tempId ? { ...m, status: 'failed' } : m));
            }
            // Retry
            socketRef.current?.emit('sendMessage', { chatId: chat.id, content, tempId });
            scheduleRetry();
            return prev;
          });
        }, RETRY_TIMEOUT_MS);
      };
      scheduleRetry();
    },
    [chat.id, currentUser, input, isTyping, updateMessageStatus],
  );

  const retrySend = useCallback(
    (msg: ChatMessage) => {
      if (msg.tempId && msg.content) sendMessage(msg.tempId, msg.content);
    },
    [sendMessage],
  );

  // ─── Typing indicator ──────────────────────────────────────────────────────

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
      if (!socketRef.current) return;

      if (!isTyping) {
        setIsTyping(true);
        socketRef.current.emit('typing', { chatId: chat.id });
      }

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setIsTyping(false);
        socketRef.current?.emit('stopTyping', { chatId: chat.id });
      }, TYPING_DEBOUNCE_MS);
    },
    [chat.id, isTyping],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  const connectionBanner =
    connectionState === 'reconnecting'
      ? 'Reconnecting…'
      : connectionState === 'disconnected'
      ? 'Offline — messages will send when reconnected'
      : null;

  const presenceLabel = online
    ? 'Online'
    : lastSeen
    ? `Last seen ${formatTime(lastSeen)}`
    : 'Offline';

  return (
    <div className="chat-window" style={styles.window}>
      {/* Header */}
      <div className="chat-header" style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <Avatar user={otherUser} size={40} />
            {online && <span style={styles.onlineDot} title="Online" />}
          </div>
          <div style={{ marginLeft: 12 }}>
            <div style={styles.headerName}>{otherUser.name}</div>
            <div style={styles.headerSub}>
              {presenceLabel} · {chat.listing.title}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close chat">
            ✕
          </button>
        )}
      </div>

      {/* Connection banner */}
      {connectionBanner && (
        <div style={styles.connectionBanner}>
          <span style={styles.bannerDot} /> {connectionBanner}
        </div>
      )}

      {/* Listing context strip */}
      <div style={styles.listingStrip}>
        {chat.listing.images[0] && (
          <img
            src={chat.listing.images[0].url}
            alt={chat.listing.title}
            style={styles.listingThumb}
          />
        )}
        <span style={styles.listingTitle}>{chat.listing.title}</span>
        <span style={styles.listingPrice}>${chat.listing.price.toLocaleString()}</span>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="chat-messages"
        style={styles.messages}
        onScroll={handleScroll}
      >
        {loadingMore && <div style={styles.loadingMore}>Loading…</div>}
        {hasMore && !loadingMore && (
          <button style={styles.loadMoreBtn} onClick={loadMore}>
            Load older messages
          </button>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.senderId === currentUser.id;
          const showAvatar =
            !isMine && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
          const status: MessageStatus = msg.status ?? 'sent';
          const isFailed = status === 'failed';

          return (
            <div
              key={msg.tempId ?? msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: isMine ? 'flex-end' : 'flex-start',
                opacity: status === 'pending' ? 0.7 : 1,
              }}
            >
              {!isMine && (
                <div style={{ width: 32, marginRight: 8 }}>
                  {showAvatar && <Avatar user={msg.sender} size={32} />}
                </div>
              )}
              <div style={{ maxWidth: '70%' }}>
                <div
                  style={{
                    ...styles.bubble,
                    background: isMine
                      ? isFailed
                        ? '#fee2e2'
                        : 'var(--color-accent, #2563eb)'
                      : 'var(--color-surface-2, #f1f5f9)',
                    color: isMine && !isFailed ? '#fff' : 'inherit',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    border: isFailed ? '1px solid #fca5a5' : 'none',
                  }}
                >
                  {msg.content}
                </div>
                <div
                  style={{
                    ...styles.messageTime,
                    textAlign: isMine ? 'right' : 'left',
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {formatTime(msg.createdAt)}
                  {isMine && <ReadTick status={status} />}
                  {isFailed && (
                    <button
                      onClick={() => retrySend(msg)}
                      style={styles.retryBtn}
                      title="Retry sending"
                    >
                      ↩ Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicators */}
        {typingUsers.size > 0 && <TypingBubble user={otherUser} />}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar" style={styles.inputBar}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          style={styles.input}
          aria-label="Message input"
          disabled={connectionState === 'disconnected'}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim()}
          style={{
            ...styles.sendBtn,
            opacity: input.trim() ? 1 : 0.4,
            cursor: input.trim() ? 'pointer' : 'default',
          }}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>

      {/* Styles */}
      <style>{css}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  window: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--color-surface, #fff)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    fontFamily: 'inherit',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    background: 'var(--color-surface, #fff)',
  },
  headerLeft: { display: 'flex', alignItems: 'center' },
  headerName: { fontWeight: 700, fontSize: 15 },
  headerSub: { fontSize: 12, color: 'var(--color-muted, #64748b)', marginTop: 1 },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: 'var(--color-muted, #64748b)',
    padding: 4,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#22c55e',
    border: '2px solid var(--color-surface, #fff)',
  },
  connectionBanner: {
    background: '#fef3c7',
    color: '#92400e',
    fontSize: 12,
    padding: '5px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderBottom: '1px solid #fde68a',
  },
  bannerDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#f59e0b',
    flexShrink: 0,
  } as React.CSSProperties,
  listingStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    background: 'var(--color-surface-2, #f8fafc)',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    fontSize: 13,
  },
  listingThumb: { width: 36, height: 36, borderRadius: 6, objectFit: 'cover' },
  listingTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  listingPrice: { fontWeight: 700, color: 'var(--color-accent, #2563eb)' },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  messageRow: { display: 'flex', alignItems: 'flex-end' },
  bubble: {
    padding: '10px 14px',
    fontSize: 14,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  messageTime: {
    fontSize: 11,
    color: 'var(--color-muted, #94a3b8)',
    marginTop: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },
  loadingMore: { textAlign: 'center', fontSize: 12, color: '#94a3b8', padding: '8px 0' },
  loadMoreBtn: {
    display: 'block',
    margin: '0 auto 12px',
    background: 'none',
    border: '1px solid var(--color-border, #e2e8f0)',
    borderRadius: 20,
    padding: '4px 16px',
    fontSize: 12,
    cursor: 'pointer',
    color: 'var(--color-muted, #64748b)',
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderTop: '1px solid var(--color-border, #e2e8f0)',
    background: 'var(--color-surface, #fff)',
  },
  input: {
    flex: 1,
    border: '1px solid var(--color-border, #e2e8f0)',
    borderRadius: 24,
    padding: '8px 16px',
    fontSize: 14,
    outline: 'none',
    background: 'var(--color-surface-2, #f8fafc)',
    color: 'var(--color-text, #1e293b)',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'var(--color-accent, #2563eb)',
    color: '#fff',
    border: 'none',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  retryBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: 11,
    cursor: 'pointer',
    padding: '0 2px',
    marginLeft: 4,
  },
};

const css = `
  .chat-messages::-webkit-scrollbar { width: 4px; }
  .chat-messages::-webkit-scrollbar-track { background: transparent; }
  .chat-messages::-webkit-scrollbar-thumb { background: var(--color-border, #e2e8f0); border-radius: 4px; }

  .typing-dot {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--color-muted, #94a3b8);
    animation: typingBounce 1.2s infinite;
  }
  @keyframes typingBounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
  }
`;
