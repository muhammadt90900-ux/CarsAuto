'use client';
// components/ui/Toast.tsx — Enterprise toast notification system
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: string; type: ToastType; title: string; message?: string; duration?: number; }
interface ToastContextValue { toast: (t: Omit<Toast, 'id'>) => void; dismiss: (id: string) => void; }

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: <CheckCircle2 className="w-4.5 h-4.5 text-[#16a34a]" />,
  error:   <XCircle      className="w-4.5 h-4.5 text-[#dc2626]" />,
  warning: <AlertTriangle className="w-4.5 h-4.5 text-[#d97706]" />,
  info:    <Info          className="w-4.5 h-4.5 text-[#2563eb]" />,
};

const STYLES = {
  success: 'border-[#16a34a]/25 bg-[#16a34a]/08',
  error:   'border-[#dc2626]/25 bg-[#dc2626]/08',
  warning: 'border-[#d97706]/25 bg-[#d97706]/08',
  info:    'border-[#2563eb]/25 bg-[#2563eb]/08',
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, t.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border shadow-[var(--shadow-xl)] max-w-sm w-full
                  backdrop-blur-xl transition-all duration-300
                  ${STYLES[t.type]}
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      style={{ background: 'rgba(8,15,28,0.92)' }}
    >
      <span className="flex-shrink-0 mt-0.5">{ICONS[t.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm leading-snug">{t.title}</p>
        {t.message && <p className="text-white/55 text-xs mt-0.5 leading-relaxed">{t.message}</p>}
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-white/30
                   hover:text-white transition-colors mt-0.5">
        <X className="w-3.5 h-3.5"/>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...t, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-6 end-6 z-[300] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)}/>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
