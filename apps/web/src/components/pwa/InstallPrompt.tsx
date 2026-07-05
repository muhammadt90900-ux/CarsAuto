'use client';
/**
 * InstallPrompt — "Add to Home Screen" banner
 *
 * Shows after:
 *  - User has visited 2+ times (tracked in localStorage)
 *  - Not already installed (standalone mode)
 *  - Browser has fired beforeinstallprompt OR is iOS Safari
 *  - User hasn't permanently dismissed it
 *
 * Design: bottom sheet on mobile, side card on desktop.
 */

import { useEffect, useState, useCallback } from 'react';
import { usePWAContext } from './PWAProvider';

const STORAGE_KEY = 'abp-install-dismissed';
const VISIT_KEY = 'abp-visit-count';
const MIN_VISITS = 2;

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const { installable, promptInstall, isInstalled } = usePWAContext();
  const [show, setShow] = useState(false);
  const [isIOSSafari] = useState(() => isIOS() && isSafari());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Track visits
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    if (isInstalled) return;
    if (visits < MIN_VISITS) return;

    // Show after a short delay so the page settles
    const t = setTimeout(() => {
      if (installable || isIOSSafari) setShow(true);
    }, 3000);

    return () => clearTimeout(t);
  }, [installable, isInstalled, isIOSSafari]);

  // Also react when installable flips to true after mount
  useEffect(() => {
    if (!installable) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed || isInstalled) return;
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10);
    if (visits >= MIN_VISITS) {
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
  }, [installable, isInstalled]);

  const handleInstall = useCallback(async () => {
    if (isIOSSafari) return; // handled by iOS instructions UI only
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === 'accepted') {
      setShow(false);
    }
  }, [promptInstall, isIOSSafari]);

  const handleDismiss = useCallback((permanent = false) => {
    setShow(false);
    if (permanent) localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  if (!show) return null;

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        onClick={() => handleDismiss(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9990,
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
        className="sm:hidden"
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install CarsAuto"
        style={{
          position: 'fixed',
          zIndex: 9991,
          // Mobile: bottom sheet
          bottom: 0,
          left: 0,
          right: 0,
          // Layout
          background: 'linear-gradient(145deg, #0d1b2e 0%, var(--ink-900) 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 32px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: '40px', height: '4px', background: 'rgba(255,255,255,0.15)',
          borderRadius: '2px', margin: '0 auto 20px',
        }} />

        {/* Close */}
        <button
          onClick={() => handleDismiss(false)}
          aria-label="Close"
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            borderRadius: '50%', width: '32px', height: '32px',
            color: 'var(--text-faint)', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-96x96.png"
            alt="CarsAuto"
            width={52}
            height={52}
            style={{ borderRadius: '14px', flexShrink: 0 }}
          />
          <div>
            <div style={{ color: 'var(--surface-200)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }}>
              CarsAuto
            </div>
            <div style={{ color: '#D4AF37', fontSize: '0.75rem', fontWeight: 500, marginTop: '2px' }}>
              Automotive Marketplace
            </div>
          </div>
        </div>

        {/* Benefits */}
        <ul style={{
          listStyle: 'none', padding: 0, margin: '0 0 20px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          {[
            ['⚡', 'Instant loading — no browser chrome'],
            ['📵', 'Browse listings offline'],
            ['🔔', 'Get alerts for new cars & price drops'],
          ].map(([icon, text]) => (
            <li key={text as string} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
              <span style={{ color: 'var(--surface-300)', fontSize: '0.875rem' }}>{text}</span>
            </li>
          ))}
        </ul>

        {/* iOS Safari specific instructions */}
        {isIOSSafari ? (
          <div style={{
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '16px',
          }}>
            <p style={{ color: 'var(--surface-200)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
              Tap the <strong style={{ color: '#D4AF37' }}>Share</strong> button (
              <span style={{ fontSize: '16px' }}>⬆</span>) at the bottom of Safari,
              then select <strong style={{ color: '#D4AF37' }}>"Add to Home Screen"</strong>.
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            disabled={installing}
            style={{
              width: '100%',
              background: installing ? 'rgba(212,175,55,0.5)' : '#D4AF37',
              color: 'var(--ink-900)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: installing ? 'not-allowed' : 'pointer',
              marginBottom: '10px',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {installing ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Installing…
              </>
            ) : (
              <>📲 Install App</>
            )}
          </button>
        )}

        {/* Permanent dismiss */}
        <button
          onClick={() => handleDismiss(true)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: '#475569', fontSize: '0.8rem', cursor: 'pointer',
            padding: '8px',
          }}
        >
          Don't show again
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
