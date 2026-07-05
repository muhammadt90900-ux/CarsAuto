'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Send, X, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { VoiceRecorderButton } from './VoiceRecorderButton';
import { VoiceNotePlayer }     from './VoiceNotePlayer';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatUser {
  id:     string;
  name:   string;
  avatar: string | null;
}

interface Message {
  id:            string;
  chatId:        string;
  senderId:      string;
  content:       string;
  type:          string;
  messageType:   string;       // 'text' | 'image' | 'voice'
  audioUrl?:     string | null;
  audioDuration?: number | null;
  createdAt:     string;
  sender:        ChatUser;
  readReceipts?: { userId: string }[];
  status?:       'sending' | 'sent' | 'delivered' | 'read' | 'error';
  tempId?:       string;
}

interface ChatWindowProps {
  chatId:      string;
  currentUser: ChatUser;
  otherUser:   ChatUser;
  listingTitle?: string;
  onClose?:    () => void;
  className?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────

// NEXT_PUBLIC_API_URL already includes the NestJS '/api' HTTP prefix — correct
// for REST calls, but wrong for the socket.io connection, which needs the raw
// WS host (same convention NotificationsPanel uses).
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  ?? 'http://localhost:3001';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function getToken(): string | null {
  // NOTE: this app keeps the access token in memory (lib/api.ts), never in a
  // readable cookie — the previous implementation always returned null here.
  return getAccessToken();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateTempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── ChatWindow ───────────────────────────────────────────────────────────────

export function ChatWindow({
  chatId, currentUser, otherUser, listingTitle, onClose, className,
}: ChatWindowProps) {
  const t = useTranslations('chat');

  const [messages,     setMessages]     = useState<Message[]>([]);
  const [inputText,    setInputText]    = useState('');
  const [isConnected,  setIsConnected]  = useState(false);
  const [isTyping,     setIsTyping]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [sendingVoice, setSendingVoice] = useState(false);

  const socketRef   = useRef<Socket | null>(null);
  const bottomRef   = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll to bottom whenever messages change ───────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Socket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    const socket = io(`${WS_URL}/chat`, {
      auth:       { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('joinChat', chatId);
    });
    socket.on('disconnect', () => setIsConnected(false));

    // Incoming messages (text OR voice)
    socket.on('newMessage', (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, status: 'delivered' }];
      });
    });

    // Own message ACK
    socket.on('messageSent', (msg: Message) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === msg.tempId ? { ...msg, status: 'sent' } : m,
        ),
      );
    });

    // Voice note ACK ── Feature 6
    socket.on('voiceNoteSent', (msg: Message) => {
      setSendingVoice(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === msg.tempId ? { ...msg, status: 'sent' } : m,
        ),
      );
    });

    socket.on('voiceNoteError', (err: { tempId?: string; error: string }) => {
      setSendingVoice(false);
      setMessages((prev) =>
        err.tempId
          ? prev.map((m) => m.tempId === err.tempId ? { ...m, status: 'error' } : m)
          : prev,
      );
    });

    socket.on('userTyping', (data: { userId: string }) => {
      if (data.userId !== currentUser.id) setIsTyping(true);
    });
    socket.on('userStoppedTyping', (data: { userId: string }) => {
      if (data.userId !== currentUser.id) setIsTyping(false);
    });

    // Load history via REST
    const token2 = getToken();
    fetch(`${API_URL}/chats/${chatId}/messages?limit=50`, {
      credentials: 'include',
      headers: token2 ? { Authorization: `Bearer ${token2}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setLoading(false);
        // Mark read
        socket.emit('markRead', { chatId });
      })
      .catch(() => setLoading(false));

    return () => {
      socket.emit('leaveChat', chatId);
      socket.disconnect();
    };
  }, [chatId, currentUser.id]);

  // ── Send text message ───────────────────────────────────────────────────
  const sendText = useCallback(() => {
    const content = inputText.trim();
    if (!content || !socketRef.current) return;

    const tempId = generateTempId();
    const optimistic: Message = {
      id:          tempId,
      chatId,
      senderId:    currentUser.id,
      sender:      currentUser,
      content,
      type:        'text',
      messageType: 'text',
      createdAt:   new Date().toISOString(),
      status:      'sending',
      tempId,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText('');

    socketRef.current.emit('sendMessage', { chatId, content, type: 'text', tempId });

    // Stop typing
    socketRef.current.emit('stopTyping', { chatId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, [inputText, chatId, currentUser]);

  // ── Send voice note ─────────────────────────────────────────────────────
  const sendVoiceNote = useCallback(
    async (params: { audioBase64: string; duration: number; mimeType: 'audio/webm' | 'audio/mp4' | 'audio/ogg' }) => {
      if (!socketRef.current) return;

      const tempId = generateTempId();

      // Optimistic placeholder for voice message
      const optimistic: Message = {
        id:            tempId,
        chatId,
        senderId:      currentUser.id,
        sender:        currentUser,
        content:       '',
        type:          'voice',
        messageType:   'voice',
        audioDuration: params.duration,
        audioUrl:      null, // will be replaced on ACK
        createdAt:     new Date().toISOString(),
        status:        'sending',
        tempId,
      };

      setSendingVoice(true);
      setMessages((prev) => [...prev, optimistic]);

      socketRef.current.emit('sendVoiceNote', {
        chatId,
        audioBase64: params.audioBase64,
        duration:    params.duration,
        mimeType:    params.mimeType,
        tempId,
      });
    },
    [chatId, currentUser],
  );

  // ── Typing indicator ────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);

      if (!socketRef.current) return;
      socketRef.current.emit('typing', { chatId });

      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit('stopTyping', { chatId });
      }, 3000);
    },
    [chatId],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendText();
      }
    },
    [sendText],
  );

  // ── Render message bubble ───────────────────────────────────────────────
  const renderMessage = (msg: Message) => {
    const isSender = msg.senderId === currentUser.id;

    return (
      <div
        key={msg.id}
        className={cn(
          'flex gap-2 mb-3',
          isSender ? 'justify-end' : 'justify-start',
        )}
      >
        {/* Avatar (recipient only) */}
        {!isSender && (
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold text-white">
            {otherUser.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className={cn('max-w-[70%]', isSender ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
          {/* ── Voice note ── */}
          {(msg.messageType === 'voice' || msg.type === 'voice') ? (
            msg.status === 'sending' || !msg.audioUrl ? (
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-2xl',
                isSender ? 'bg-[rgba(201,168,76,0.6)] text-[#070d18]' : 'bg-white/10 text-white',
              )}>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Sending voice note…</span>
              </div>
            ) : (
              <VoiceNotePlayer
                audioUrl={msg.audioUrl}
                duration={msg.audioDuration ?? 0}
                isSender={isSender}
              />
            )
          ) : (
            /* ── Text bubble ── */
            <div className={cn(
              'px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
              isSender
                ? 'bg-[var(--gold)] text-[#070d18] rounded-br-sm'
                : 'bg-white/10 text-white rounded-bl-sm',
              msg.status === 'error' && 'opacity-50 border border-red-500',
            )}>
              {msg.content}
            </div>
          )}

          {/* Timestamp + status */}
          <div className={cn('flex items-center gap-1', isSender ? 'justify-end' : 'justify-start')}>
            <span className="text-[10px] text-white/40">
              {formatTime(msg.createdAt)}
            </span>
            {isSender && msg.status === 'error' && (
              <span className="text-[10px] text-red-400">Failed</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'flex flex-col h-full bg-[#070d18] text-white rounded-xl overflow-hidden border border-white/10',
      className,
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">
              {otherUser.name.charAt(0).toUpperCase()}
            </div>
            {isConnected && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#070d18]" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{otherUser.name}</p>
            {listingTitle && (
              <p className="text-xs text-white/40 truncate max-w-[160px]">{listingTitle}</p>
            )}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[var(--gold)]" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-8">
            {t('noMessages', { default: 'Start the conversation' })}
          </p>
        ) : (
          messages.map(renderMessage)
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 items-center mb-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {otherUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="bg-white/10 px-3 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 py-3 border-t border-white/10 bg-white/5 flex items-center gap-2">
        {/* Voice recorder */}
        <VoiceRecorderButton
          onSend={sendVoiceNote}
          disabled={sendingVoice || !isConnected}
        />

        {/* Text input */}
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={t('inputPlaceholder', { default: 'Type a message…' })}
          disabled={sendingVoice}
          className={cn(
            'flex-1 bg-white/10 rounded-full px-4 py-2 text-sm outline-none',
            'placeholder:text-white/30 focus:bg-white/15 transition-colors',
            'disabled:opacity-50',
          )}
        />

        {/* Send button */}
        <button
          onClick={sendText}
          disabled={!inputText.trim() || !isConnected}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
            'bg-[var(--gold)] text-[#070d18]',
            'hover:bg-[rgba(201,168,76,0.8)] transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;
