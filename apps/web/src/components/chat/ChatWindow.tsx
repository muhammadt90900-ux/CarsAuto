'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'offer';
  createdAt: string;
  sender: ChatUser;
  readBy?: { userId: string }[];
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      className="chat-avatar"
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div
      className="chat-avatar chat-avatar--initials"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--color-accent)',
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [online, setOnline] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const otherUser =
    currentUser.id === chat.buyer.id ? chat.seller : chat.buyer;

  // ---------------------------------------------------------------------------
  // Socket connection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const socket = io(`${wsUrl}/chat`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('joinChat', chat.id);

    socket.on('newMessage', (msg: ChatMessage) => {
      if (msg.chatId !== chat.id) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      // Auto mark read since window is open
      socket.emit('markRead', { chatId: chat.id });
    });

    socket.on('userTyping', (data: { userId: string }) => {
      if (data.userId === currentUser.id) return;
      setTypingUsers((prev) => (prev.includes(data.userId) ? prev : [...prev, data.userId]));
    });

    socket.on('userStoppedTyping', (data: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
    });

    socket.on('messagesRead', () => {
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          readBy: m.senderId === currentUser.id
            ? [{ userId: otherUser.id }]
            : m.readBy ?? [],
        })),
      );
    });

    socket.on('userOnline', (data: { userId: string }) => {
      if (data.userId === otherUser.id) setOnline(true);
    });

    socket.on('userOffline', (data: { userId: string }) => {
      if (data.userId === otherUser.id) setOnline(false);
    });

    // Query initial online status
    socket.emit('getOnlineStatus', [otherUser.id], (result: Record<string, boolean>) => {
      setOnline(result[otherUser.id] ?? false);
    });

    // Mark chat read on open
    socket.emit('markRead', { chatId: chat.id });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, token, wsUrl]);

  // ---------------------------------------------------------------------------
  // Scroll to bottom on new messages
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Load older messages
  // ---------------------------------------------------------------------------
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

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
    } finally {
      setLoadingMore(false);
    }
  }, [apiBase, chat.id, hasMore, loadingMore, nextCursor, token]);

  // Scroll-to-top triggers load more
  const handleScroll = useCallback(() => {
    if (containerRef.current && containerRef.current.scrollTop < 80) {
      loadMore();
    }
  }, [loadMore]);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || !socketRef.current) return;
    setInput('');
    socketRef.current.emit('sendMessage', { chatId: chat.id, content });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTyping) {
      socketRef.current.emit('stopTyping', { chatId: chat.id });
      setIsTyping(false);
    }
  }, [chat.id, input, isTyping]);

  // ---------------------------------------------------------------------------
  // Typing indicator
  // ---------------------------------------------------------------------------
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
      }, 2000);
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
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
              {online ? 'Online' : 'Offline'} · {chat.listing.title}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close chat">
            ✕
          </button>
        )}
      </div>

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
          const isRead =
            isMine && msg.readBy?.some((r) => r.userId !== currentUser.id);

          return (
            <div
              key={msg.id}
              className={`chat-message ${isMine ? 'chat-message--mine' : ''}`}
              style={{ ...styles.messageRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}
            >
              {!isMine && (
                <div style={{ width: 32, marginRight: 8 }}>
                  {showAvatar && <Avatar user={msg.sender} size={32} />}
                </div>
              )}
              <div style={{ maxWidth: '70%' }}>
                <div
                  className="chat-bubble"
                  style={{
                    ...styles.bubble,
                    background: isMine ? 'var(--color-accent, #2563eb)' : 'var(--color-surface-2, #f1f5f9)',
                    color: isMine ? '#fff' : 'inherit',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}
                >
                  {msg.content}
                </div>
                <div
                  style={{
                    ...styles.messageTime,
                    textAlign: isMine ? 'right' : 'left',
                  }}
                >
                  {formatTime(msg.createdAt)}
                  {isMine && <span style={{ marginLeft: 4 }}>{isRead ? '✓✓' : '✓'}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
            <div style={{ width: 32, marginRight: 8 }}>
              <Avatar user={otherUser} size={32} />
            </div>
            <div style={{ ...styles.bubble, background: 'var(--color-surface-2, #f1f5f9)', padding: '8px 14px' }}>
              <span style={styles.typingDots}>
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}

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
        />
        <button
          onClick={sendMessage}
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

      {/* Typing indicator CSS */}
      <style>{typingCSS}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    color: 'var(--color-text, #1e293b)',
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
  typingDots: { display: 'inline-flex', gap: 4, alignItems: 'center' },
};

const typingCSS = `
  .chat-bubble { transition: background 0.15s; }
  span[style*="display: inline-flex"] span {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--color-muted, #94a3b8);
    animation: bounce 1.2s infinite;
  }
  span[style*="display: inline-flex"] span:nth-child(2) { animation-delay: 0.2s; }
  span[style*="display: inline-flex"] span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
  }
  .chat-messages::-webkit-scrollbar { width: 4px; }
  .chat-messages::-webkit-scrollbar-track { background: transparent; }
  .chat-messages::-webkit-scrollbar-thumb { background: var(--color-border, #e2e8f0); border-radius: 4px; }
`;
