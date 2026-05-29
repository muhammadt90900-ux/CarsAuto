'use client';
/**
 * Toast / Alert — AutoBazaarPro Design System
 *
 * Alert (inline):
 *   <Alert variant="success" title="Saved!" message="Your listing has been published." />
 *   <Alert variant="error"   message={error} onClose={() => setError(null)} />
 *
 * Toast (programmatic, via hook):
 *   const { toast } = useToast();
 *   toast.success('Listing published!');
 *   toast.error('Something went wrong.');
 */

import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

interface AlertProps {
  variant:    AlertVariant;
  title?:     string;
  message:    ReactNode;
  onClose?:   () => void;
  className?: string;
}

// ─── Alert (inline) ───────────────────────────────────────────────────────────
const icons: Record<AlertVariant, ReactNode> = {
  success: <CheckCircle2 size={16} aria-hidden />,
  warning: <AlertTriangle size={16} aria-hidden />,
  error:   <XCircle      size={16} aria-hidden />,
  info:    <Info         size={16} aria-hidden />,
};

export function Alert({ variant, title, message, onClose, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('alert', `alert-${variant}`, className)}
    >
      <span className="shrink-0 mt-0.5">{icons[variant]}</span>
      <div className="flex-1 min-w-0">
        {title   && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}

// ─── Toast system ─────────────────────────────────────────────────────────────
interface ToastItem {
  id:       string;
  variant:  AlertVariant;
  title?:   string;
  message:  string;
  duration: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  add:    (item: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...item, id }]);
    setTimeout(() => remove(id), item.duration);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toasts, add, remove }}>
      {children}
      {/* Toast container — fixed top-right */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[60] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <div className={cn('toast', `toast-${t.variant}`)}>
              <span className="shrink-0 mt-0.5">{icons[t.variant]}</span>
              <div className="flex-1 min-w-0">
                {t.title   && <p className="font-semibold text-sm mb-0.5">{t.title}</p>}
                <p className="text-sm text-[var(--text-secondary)]">{t.message}</p>
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** useToast hook — call toast.success / toast.error etc. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');

  const { add } = ctx;

  return {
    toast: {
      success: (message: string, title?: string, duration = 4000) =>
        add({ variant: 'success', message, title, duration }),
      error:   (message: string, title?: string, duration = 5000) =>
        add({ variant: 'error',   message, title, duration }),
      warning: (message: string, title?: string, duration = 4500) =>
        add({ variant: 'warning', message, title, duration }),
      info:    (message: string, title?: string, duration = 4000) =>
        add({ variant: 'info',    message, title, duration }),
    },
  };
}
