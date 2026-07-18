// apps/web/src/hooks/useStartChat.ts
'use client';

// FIX: the in-app "Chat" button was missing from every listing detail page
// (cars, marketplace/parts, motorcycles) — only WhatsApp + "Show Phone
// Number" existed. The backend chat system was already fully built
// (POST /chats/:listingId → getOrCreateChat) but nothing on the frontend
// called it. This hook wraps that call + navigation so all detail pages
// share one implementation instead of duplicating it three times.
//
// Not usable for a dealer's whole showroom page: the backend endpoint is
// scoped to a single listingId (a chat is always tied to one listing), so
// there's no "message this dealer in general" call to make there yet.

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function useStartChat() {
  const router = useRouter();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'en');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startChat(listingId: string) {
    if (!isAuthenticated) {
      router.push(`/${locale}/login`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const chat = await chatApi.startChat(listingId);
      router.push(`/${locale}/dashboard/messages?chatId=${chat.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? null;
      setError(
        Array.isArray(msg)
          ? msg.join(' · ')
          : msg ?? 'کردنەوەی چات سەرکەوتوو نەبوو. دووبارە هەوڵ بدە.'
      );
    } finally {
      setLoading(false);
    }
  }

  return { startChat, loading, error };
}
