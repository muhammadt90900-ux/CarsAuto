'use client';
// app/[locale]/dashboard/messages/page.tsx — Fully localized

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Send, Paperclip, MoreVertical, Phone, Video, ArrowLeft } from 'lucide-react';

const conversations = [
  { id: '1', name: 'Ahmed Hassan', avatar: 'AH', lastMessage: 'Is the Toyota Camry still available?', time: '2m', unread: 2, listing: 'Toyota Camry 2022', online: true  },
  { id: '2', name: 'Sara Ali',     avatar: 'SA', lastMessage: 'Can you lower the price a bit?',       time: '1h', unread: 0, listing: 'BMW 3 Series 2021',  online: false },
  { id: '3', name: 'Omar Khalid',  avatar: 'OK', lastMessage: 'Thank you, I will visit tomorrow.',    time: '3h', unread: 0, listing: 'Honda CR-V 2023',     online: true  },
  { id: '4', name: 'Lana Mahdi',   avatar: 'LM', lastMessage: 'What is the mileage?',                time: '1d', unread: 1, listing: 'Mercedes C200 2020',  online: false },
];

const mockMessages = [
  { id: 1, from: 'them', text: 'Hello! Is the Toyota Camry 2022 still available?', time: '10:30' },
  { id: 2, from: 'me',   text: 'Yes, it is still available! Are you interested?',  time: '10:32' },
  { id: 3, from: 'them', text: 'Very much so. Can I schedule a viewing this weekend?', time: '10:35' },
  { id: 4, from: 'me',   text: 'Absolutely! Saturday afternoon works great for me.', time: '10:36' },
  { id: 5, from: 'them', text: 'Is the Toyota Camry still available?',              time: '10:38' },
];

export default function MessagesPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  const [selected, setSelected] = useState<string | null>('1');
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState(mockMessages);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const activeConv = conversations.find((c) => c.id === selected);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: 'me', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-[#080f1c]">
      {/* Sidebar — conversation list */}
      <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 border-e border-gray-100 dark:border-white/[0.07]`}>
        {/* Search */}
        <div className="p-3 border-b border-gray-100 dark:border-white/[0.07]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
            <input
              type="search"
              placeholder={t('searchMessages')}
              className="w-full ps-9 pe-4 py-2 text-sm rounded-xl bg-gray-50 dark:bg-white/5
                         border border-transparent focus:border-gray-200 dark:focus:border-white/10
                         text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => { setSelected(conv.id); setMobileView('chat'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-start
                          ${selected === conv.id
                            ? 'bg-[#c9a84c]/[0.08] border-e-2 border-[#c9a84c]'
                            : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                          }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e] flex items-center justify-center text-white text-xs font-bold">
                  {conv.avatar}
                </div>
                {conv.online && (
                  <span className="absolute bottom-0 end-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#080f1c]" aria-label="Online" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{conv.name}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ms-2">{conv.time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-400 truncate flex-1">{conv.lastMessage}</p>
                  {conv.unread > 0 && (
                    <span className="ms-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-[#e94560] text-white flex-shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      {selected && activeConv ? (
        <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-col flex-1`}>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/[0.07]">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label={tc('back')}
            >
              <ArrowLeft className="w-5 h-5" aria-hidden />
            </button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e] flex items-center justify-center text-white text-xs font-bold">
                {activeConv.avatar}
              </div>
              {activeConv.online && (
                <span className="absolute bottom-0 end-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-[#080f1c]" aria-label="Online" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{activeConv.name}</p>
              <p className="text-xs text-gray-400">{activeConv.listing}</p>
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
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.from === 'me'
                    ? 'bg-[#c9a84c] text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-white/[0.07] text-gray-900 dark:text-white rounded-bs-sm'
                }`}>
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-white/60 text-end' : 'text-gray-400'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pt-2 pb-0.5 border-t border-gray-100 dark:border-white/[0.07]">
            {/* Quick reply suggestions */}
            <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
              {[
                'Is it still available?',
                'Can you lower the price?',
                "I'll visit tomorrow",
                'Send me more photos',
              ].map(r => (
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
              <button aria-label="Attach file" className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0">
                <Paperclip className="w-4 h-4" aria-hidden />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={t('typeMessage')}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-white/5
                           border border-transparent focus:border-gray-200 dark:focus:border-white/10
                           text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                aria-label={tc('send')}
                className="p-2.5 rounded-xl bg-[#c9a84c] text-white disabled:opacity-40
                           hover:bg-[#b8943c] transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <p className="text-gray-400 text-sm">{t('noConversations')}</p>
        </div>
      )}
    </div>
  );
}
