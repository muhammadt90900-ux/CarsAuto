'use client';
/**
 * PWAProvider — wraps the app and exposes PWA state via React context.
 * Renders update banner and offline indicator automatically.
 *
 * Feature 8: On mount, fetches VAPID public key and subscribes the browser
 * to Web Push, then POSTs the subscription to the backend.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { usePWA, type PWAState } from '@/hooks/usePWA';
import { useAuthStore } from '@/store/auth.store';
import { api as apiClient } from "@/lib/api";

// ── Context ───────────────────────────────────────────────────────────────────

const PWAContext = createContext<PWAState | null>(null);

export function usePWAContext(): PWAState {
  const ctx = useContext(PWAContext);
  if (!ctx) throw new Error('usePWAContext must be used inside <PWAProvider>');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Push subscription hook ────────────────────────────────────────────────────

function usePushSubscription(swRegistered: boolean) {
  const user = useAuthStore((s) => s.user);
  const subscribedRef = useRef(false);

  useEffect(() => {
    // Only run when: SW is ready, user is logged in, Push API supported, not already subscribed
    if (
      !swRegistered ||
      !user ||
      !('PushManager' in window) ||
      !('serviceWorker' in navigator) ||
      subscribedRef.current
    ) return;

    subscribedRef.current = true;

    const subscribe = async () => {
      try {
        // 1. Fetch VAPID public key (public endpoint, no auth needed)
        const keyRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/notifications/push/vapid-key`,
        );
        if (!keyRes.ok) return;
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        // 2. Get the active SW registration
        const registration = await navigator.serviceWorker.ready;

        // 3. Check existing subscription first (don't double-subscribe)
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          // Re-send to backend in case it was lost (idempotent upsert on backend)
          await apiClient.post('/notifications/push/subscribe', { subscription: existing.toJSON() });
          return;
        }

        // 4. Subscribe with VAPID key
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        });

        // 5. POST subscription object to backend
        await apiClient.post('/notifications/push/subscribe', {
          subscription: subscription.toJSON(),
        });
      } catch (err) {
        // Don't log "permission denied" as an error — user choice
        if ((err as Error).name !== 'NotAllowedError') {
          console.warn('[PWA] Push subscription failed:', err);
        }
      }
    };

    subscribe();
  }, [swRegistered, user]);
}

// ── Update Banner ─────────────────────────────────────────────────────────────

function UpdateBanner({
  onApply,
  onDismiss,
}: {
  onApply: () => void;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: visible ? '16px' : '-120px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        transition: 'bottom 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#0f1a2e',
        border: '1px solid rgba(212,175,55,0.35)',
        borderRadius: '14px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <span style={{ fontSize: '18px' }}>🔄</span>
      <span style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 500 }}>
        نوێکردنەوەی نوێ بەردەستە
      </span>
      <button
        onClick={onApply}
        style={{
          background: '#D4AF37',
          color: '#050b14',
          border: 'none',
          borderRadius: '8px',
          padding: '6px 14px',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        نوێکردنەوە
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss update"
        style={{
          background: 'transparent',
          color: '#64748b',
          border: 'none',
          fontSize: '1rem',
          cursor: 'pointer',
          lineHeight: 1,
          flexShrink: 0,
          padding: '4px',
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Offline Bar ───────────────────────────────────────────────────────────────

function OfflineBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: '#1e293b',
        borderBottom: '1px solid rgba(239,68,68,0.4)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '0.8rem',
        color: '#fca5a5',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: '#ef4444',
          flexShrink: 0,
          animation: 'pulse 2s ease infinite',
        }}
      />
      بێ ئینتەرنێتی — ناوەڕۆکی کاشی پیشاندەدرێت
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PWAProvider({ children }: { children: ReactNode }) {
  const pwa = usePWA();
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const handleDismiss = useCallback(() => setUpdateDismissed(true), []);

  // Feature 8: Subscribe to push when SW is ready
  usePushSubscription(pwa.swRegistered);

  return (
    <PWAContext.Provider value={pwa}>
      {children}

      {pwa.isOffline && <OfflineBar />}

      {pwa.updateAvailable && !updateDismissed && (
        <UpdateBanner onApply={pwa.applyUpdate} onDismiss={handleDismiss} />
      )}

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1 }
          50%      { opacity:0.4 }
        }
      `}</style>
    </PWAContext.Provider>
  );
}
