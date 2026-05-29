'use client';
// components/ui/Modal.tsx — Enterprise modal system
import { useEffect, useCallback, HTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

const SIZES = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[95vw]',
};

export function Modal({ open, onClose, title, description, size = 'md', children, className, closeOnBackdrop = true }: ModalProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md anim-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={cn(
          'relative w-full rounded-3xl overflow-hidden anim-scale-in',
          'bg-white dark:bg-[#0b1525]',
          'border border-[var(--border-default)] dark:border-white/[0.08]',
          'shadow-[var(--shadow-xl)]',
          SIZES[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Top accent */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.5)] to-transparent" />

        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-[var(--border-subtle)]">
            <div>
              {title && <h2 id="modal-title" className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>}
              {description && <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl
                         text-[var(--text-muted)] hover:text-[var(--text-primary)]
                         bg-[var(--surface-100)] hover:bg-[var(--surface-200)]
                         transition-all duration-150"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-xl
                       text-[var(--text-muted)] hover:text-[var(--text-primary)]
                       bg-[var(--surface-100)] hover:bg-[var(--surface-200)]
                       transition-all duration-150"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="overflow-y-auto max-h-[80vh] no-scrollbar">{children}</div>
      </div>
    </div>
  );
}
