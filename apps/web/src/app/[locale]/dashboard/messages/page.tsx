'use client';
// app/[locale]/dashboard/messages/page.tsx
// All data from real API — chatApi.getConversations() + chatApi.getMessages().
// Zero hardcoded conversations or messages.

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/lib/api';
import {
  Search, Send, Paperclip, MoreVertical, Phone,
  Video, ArrowLeft, MessageSquare, Loader2,
} from 'lucide-react';

function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-2.5 w-1/2 rounded bg-gray-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

function EmptyConversations() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
        <MessageSquare className="w-7 h-7 text-gray-300 dark:text-white/20" />
      </div>
      <p className="text-sm font-semibold text-gray-500 dark:text-white/40">No conversations yet</p>
      <p className="text-xs text-gray-400 dark:text-white/25 mt-1">
        Messages from buyers will appear here.
      </p>
    </div>
  );
}

function initials(name: string): string {
  return name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '??';
}

export default function MessagesPage() {
  const t  = useTranslations('dashboard');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [input,      setInput]        = useState('');
  const [search,     setSearch]       = useState('');
  const [mobileView, setMobileView]   = useState<'list' | 'chat'>('list');
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Conversations list ────────────────────────────────────────────────────
  const {
    data: convsRaw,
    isLoading: convsLoading,
  } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn:  chatApi.getConversations,
    staleTime: 20_000,
    refetchInterval: 30_000,   // poll every 30 s
  });

  const conversations: any[] = (convsRaw as any)?.data ?? convsRaw ?? [];

  const filtered = search
    ? conversations.filter(c =>
        (c.otherUser?.name ?? c.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // ── Messages for selected conversation ───────────────────────────────────
  const {
    data: msgsRaw,
    isLoading: msgsLoading,
  } = useQuery({
    queryKey: ['chat', 'messages', selectedId],
    queryFn:  () => chatApi.getMessages(selectedId!),
    enabled:  !!selectedId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const messages: any[] = (msgsRaw as any)?.data ?? msgsRaw ?? [];

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send message mutation ─────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (text: string) => chatApi.sendMessage(selectedId!, text),
    onSuccess: () => {
      setInput('');
      qc.invalidateQueries({ queryKey: ['chat', 'messages', selectedId] });
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !selectedId || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  const activeConv = conversations.find(c => c.id === selectedId);
  const otherUser  = activeConv?.otherUser ?? activeConv;
  const otherName  = otherUser?.name ?? activeConv?.name ?? 'User';
  const listing    = activeConv?.listing?.titleEn ?? activeConv?.listing?.titleKu ?? activeConv?.listingTitle ?? '';

  // ── Quick replies ─────────────────────────────────────────────────────────
  const quickReplies = [
    'Is it still available?',
    'Can you lower the price?',
    "I'll visit tomorrow",
    'Send me more photos',
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl
                    border border-gray-100 dark:border-white/[0.07]
                    bg-white dark:bg-[#080f1c]">

      {/* ── Conversations sidebar ────────────────────────────── */}
      <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex flex-col
                       w-full md:w-80 border-e border-gray-100 dark:border-white/[0.07]`}>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 dark:border-white/[0.07]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchMessages')}
              className="w-full ps-9 pe-4 py-2 text-sm rounded-xl bg-gray-50 dark:bg-white/5
                         border border-transparent focus:border-gray-200 dark:focus:border-white/10
                         text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            Array.from({length: 4}).map((_, i) => <ConvSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyConversations />
          ) : (
            filtered.map((conv: any) => {
              const name    = conv.otherUser?.name ?? conv.name ?? 'User';
              const unread  = conv.unreadCount ?? conv.unread ?? 0;
              const online  = conv.otherUser?.isOnline ?? conv.online ?? false;
              const lastMsg = conv.lastMessage?.content ?? conv.lastMessage ?? '';
              const time    = conv.lastMessage?.createdAt
                ? new Date(conv.lastMessage.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
                : conv.time ?? '';

              return (
                <button
                  key={conv.id}
                  onClick={() => { setSelectedId(conv.id); setMobileView('chat'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-start
                    ${selectedId === conv.id
                      ? 'bg-[#c9a84c]/[0.08] border-e-2 border-[#c9a84c]'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e]
                                    flex items-center justify-center text-white text-xs font-bold">
                      {initials(name)}
                    </div>
                    {online && (
                      <span className="absolute bottom-0 end-0 w-2.5 h-2.5 bg-emerald-500 rounded-full
                                       border-2 border-white dark:border-[#080f1c]" aria-label="Online" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ms-2">{time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-400 truncate flex-1">{lastMsg || listing}</p>
                      {unread > 0 && (
                        <span className="ms-2 inline-flex items-center justify-center w-4 h-4 text-[10px]
                                         font-bold rounded-full bg-[#e94560] text-white flex-shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat panel ──────────────────────────────────────────── */}
      {selectedId && activeConv ? (
        <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-col flex-1`}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/[0.07]">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100
                         dark:hover:bg-white/5 transition-colors"
              aria-label={tc('back')}
            >
              <ArrowLeft className="w-5 h-5" aria-hidden />
            </button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e]
                              flex items-center justify-center text-white text-xs font-bold">
                {initials(otherName)}
              </div>
              {(otherUser?.isOnline || activeConv?.online) && (
                <span className="absolute bottom-0 end-0 w-2 h-2 bg-emerald-500 rounded-full
                                 border-2 border-white dark:border-[#080f1c]" aria-label="Online" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{otherName}</p>
              {listing && <p className="text-xs text-gray-400 truncate">{listing}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button aria-label="Voice call" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500">
                <Phone className="w-4 h-4" aria-hidden />
              </button>
              <button aria-label="Video call" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500">
                <Video className="w-4 h-4" aria-hidden />
              </button>
              <button aria-label="More options" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500">
                <MoreVertical className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-300 dark:text-white/20 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-10 h-10 text-gray-200 dark:text-white/10 mb-3" />
                <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map((msg: any) => {
                const fromMe = msg.senderId === undefined
                  ? msg.from === 'me'
                  : msg.isOwn ?? msg.fromMe ?? false;
                const text = msg.content ?? msg.text ?? '';
                const ts   = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
                  : msg.time ?? '';
                return (
                  <div key={msg.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      fromMe
                        ? 'bg-[#c9a84c] text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-white/[0.07] text-gray-900 dark:text-white rounded-bs-sm'
                    }`}>
                      <p>{text}</p>
                      <p className={`text-[10px] mt-1 ${fromMe ? 'text-white/60 text-end' : 'text-gray-400'}`}>
                        {ts}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pt-2 pb-0.5 border-t border-gray-100 dark:border-white/[0.07]">
            {/* Quick replies */}
            <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
              {quickReplies.map(r => (
                <button
                  key={r}
                  onClick={() => setInput(r)}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium
                             border border-gray-200 dark:border-white/10
                             text-gray-600 dark:text-white/50
                             hover:border-[#c9a84c]/50 hover:text-[#c9a84c]
                             transition-all duration-150"
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Attach file"
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                                 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0">
                <Paperclip className="w-4 h-4" aria-hidden />
              </button>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={t('typeMessage')}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-white/5
                           border border-transparent focus:border-gray-200 dark:focus:border-white/10
                           text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sendMutation.isPending}
                aria-label={tc('send')}
                className="p-2.5 rounded-xl bg-[#c9a84c] text-white disabled:opacity-40
                           hover:bg-[#b8943c] transition-colors flex-shrink-0"
              >
                {sendMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" aria-hidden />
                }
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-gray-200 dark:text-white/10 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{t('noConversations')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
