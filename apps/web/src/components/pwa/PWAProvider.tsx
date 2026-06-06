'use client';
/**
 * PWAProvider — wraps the app and exposes PWA state via React context.
 * Renders update banner and offline indicator automatically.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { usePWA, type PWAState } from '@/hooks/usePWA';

// ── Context ───────────────────────────────────────────────────────────────────

const PWAContext = createContext<PWAState | null>(null);

export function usePWAContext(): PWAState {
  const ctx = useContext(PWAContext);
  if (!ctx) throw new Error('usePWAContext must be used inside <PWAProvider>');
  return ctx;
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
    // Slide in after a short delay to avoid jarring first paint
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
        New version available
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
        Update
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
      You're offline — showing cached content
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PWAProvider({ children }: { children: ReactNode }) {
  const pwa = usePWA();
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const handleDismiss = useCallback(() => setUpdateDismissed(true), []);

  return (
    <PWAContext.Provider value={pwa}>
      {children}

      {/* Offline indicator */}
      {pwa.isOffline && <OfflineBar />}

      {/* SW update banner */}
      {pwa.updateAvailable && !updateDismissed && (
        <UpdateBanner onApply={pwa.applyUpdate} onDismiss={handleDismiss} />
      )}

      {/* pulse keyframe — injected once */}
      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1 }
          50%      { opacity:0.4 }
        }
      `}</style>
    </PWAContext.Provider>
  );
}
