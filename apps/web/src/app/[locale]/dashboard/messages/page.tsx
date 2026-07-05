'use client';
// app/[locale]/dashboard/messages/page.tsx
// Conversation list: chatApi.getConversations() (REST, polling is fine for a list).
// Active conversation: ChatWindow (socket.io, real-time, code-split below).

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Skeleton } from '@/components/ui/Skeleton';
import { Search, MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';

// Heavy (socket.io + voice notes), only needed once a conversation is open —
// code-split out of the messages-list bundle.
const ChatWindow = dynamic(
  () => import('@/components/chat/ChatWindow').then((mod) => mod.ChatWindow),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 p-4 space-y-3">
        <Skeleton height="2.5rem" width="60%" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" width="80%" />
        <Skeleton height="3rem" width="70%" />
      </div>
    ),
  }
);

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

function MessagesPageContent() {
  const t      = useTranslations('dashboard');
  const router = useRouter();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');
  const searchParams = useSearchParams();
  const currentUser  = useAuthStore(s => s.user);

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('chatId'));
  const [search,     setSearch]     = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    searchParams.get('chatId') ? 'chat' : 'list'
  );

  // ── Conversations list ────────────────────────────────────────────────────
  const {
    data: convsRaw,
    isLoading: convsLoading,
  } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn:  chatApi.getConversations,
    staleTime: 20_000,
    refetchInterval: 30_000,   // poll every 30 s — fine for a list; the open
                               // conversation itself updates live via ChatWindow's socket.
  });

  const conversations: any[] = Array.isArray(convsRaw) ? convsRaw : (convsRaw as any)?.data ?? [];

  const filtered = search
    ? conversations.filter(c => {
        const other = otherUserOf(c, currentUser?.id);
        return (other?.name ?? '').toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  // Auto-select first conversation if none chosen (and none requested via ?chatId=)
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setMobileView('chat');
    router.replace(`/${locale}/dashboard/messages?chatId=${id}`, { scroll: false });
  }

  const activeConv = conversations.find(c => c.id === selectedId);
  // The API returns `buyer`/`seller`, not a precomputed `otherUser` — derive it
  // from whichever side the current user isn't.
  const otherUser  = activeConv ? otherUserOf(activeConv, currentUser?.id) : null;
  const listingTitle = activeConv?.listing?.title ?? '';

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl
                    border border-gray-100 dark:border-white/[0.07]
                    bg-white dark:bg-[var(--ink-800)]">

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
              const other   = otherUserOf(conv, currentUser?.id);
              const name    = other?.name ?? 'User';
              const unread  = conv.unreadCount ?? 0;
              const lastMsg = conv.lastMessage?.content ?? '';
              const time    = conv.lastMessage?.createdAt
                ? new Date(conv.lastMessage.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-start
                    ${selectedId === conv.id
                      ? 'bg-[rgba(201,168,76,0.08)] border-e-2 border-[var(--gold)]'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gold)] to-[#9e6e1e]
                                    flex items-center justify-center text-white text-xs font-bold">
                      {initials(name)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ms-2">{time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-400 truncate flex-1">{lastMsg || conv.listing?.title}</p>
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
      {selectedId && activeConv && currentUser ? (
        <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-col flex-1`}>
          <div className="flex items-center gap-2 px-3 pt-3 md:hidden">
            <button
              onClick={() => setMobileView('list')}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden />
            </button>
          </div>
          <ChatWindow
            chatId={selectedId}
            currentUser={{ id: currentUser.id, name: currentUser.name, avatar: null }}
            otherUser={{
              id: otherUser?.id ?? '',
              name: otherUser?.name ?? 'User',
              avatar: otherUser?.avatar ?? null,
            }}
            listingTitle={listingTitle}
            className="flex-1 rounded-none border-0"
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          {convsLoading ? (
            <Loader2 className="w-6 h-6 text-gray-300 dark:text-white/20 animate-spin" />
          ) : (
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-200 dark:text-white/10 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t('noConversations')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The API returns `buyer`/`seller`; the "other" party depends on which one
// the current user is.
function otherUserOf(
  conv: any,
  currentUserId?: string
): { id: string; name: string; avatar: string | null } | null {
  if (!conv) return null;
  if (conv.buyerId && currentUserId && conv.buyerId === currentUserId) return conv.seller ?? null;
  if (conv.sellerId && currentUserId && conv.sellerId === currentUserId) return conv.buyer ?? null;
  // Fallback if buyerId/sellerId aren't present on the payload for some reason.
  return conv.seller ?? conv.buyer ?? null;
}

// Suspense boundary required: MessagesPageContent reads searchParams via useSearchParams()
export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesPageContent />
    </Suspense>
  );
}
