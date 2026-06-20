'use client';
/**
 * usePWA — Service worker registration + lifecycle management
 *
 * Responsibilities:
 *  • Register /sw.js on mount (production only)
 *  • Detect pending SW updates and expose `updateAvailable` flag
 *  • Apply update immediately when user calls `applyUpdate()`
 *  • Capture the beforeinstallprompt event and expose `promptInstall()`
 *  • Track installed / standalone state
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface PWAState {
  /** SW successfully registered and controlling the page */
  swRegistered: boolean;
  /** A new SW version is waiting — show "Update available" banner */
  updateAvailable: boolean;
  /** Skip waiting on the new SW and reload */
  applyUpdate: () => void;
  /** Platform install prompt is available */
  installable: boolean;
  /** Trigger the native A2HS install sheet */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** App is running as installed PWA (standalone / fullscreen) */
  isInstalled: boolean;
  /** SW is currently offline */
  isOffline: boolean;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePWA(): PWAState {
  const [swRegistered, setSwRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredPromptRef = useRef<any>(null);

  // ── Online / offline ───────────────────────────────────────────────────────
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── Installed state ────────────────────────────────────────────────────────
  useEffect(() => {
    setIsInstalled(isStandalone());
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ── beforeinstallprompt ────────────────────────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setInstallable(false);
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // ── Service worker registration ────────────────────────────────────────────
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) return;

    let refreshing = false;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        setSwRegistered(true);

        // New SW installed but waiting
        const onUpdateFound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = newWorker;
              setUpdateAvailable(true);
            }
          });
        };

        registration.addEventListener('updatefound', onUpdateFound);

        // If a waiting worker already exists on load
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = registration.waiting;
          setUpdateAvailable(true);
        }

        // Poll for updates every 60 s (catches deploys without user interaction)
        const interval = setInterval(() => registration.update(), 60_000);

        // SW controller changed → page was refreshed by new SW
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        return () => {
          clearInterval(interval);
          registration.removeEventListener('updatefound', onUpdateFound);
        };
      } catch (err) {
        console.warn('[PWA] Service worker registration failed:', err);
      }
    };

    registerSW();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const applyUpdate = useCallback(() => {
    const sw = waitingWorkerRef.current;
    if (!sw) {
      window.location.reload();
      return;
    }
    sw.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return 'unavailable';

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPromptRef.current = null;
    setInstallable(false);
    return outcome as 'accepted' | 'dismissed';
  }, []);

  return {
    swRegistered,
    updateAvailable,
    applyUpdate,
    installable,
    promptInstall,
    isInstalled,
    isOffline,
  };
}
