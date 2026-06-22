'use client';
// components/ui/Modal.tsx — Enterprise modal system (Accessibility-enhanced)
import { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@cars-auto/utils';

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
  const panelRef    = useRef<HTMLDivElement>(null);
  const closeRef    = useRef<HTMLButtonElement>(null);
  // Remember what was focused before modal opened so we can restore it on close
  const triggerRef  = useRef<Element | null>(null);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }

    // Trap focus inside the modal panel
    if (e.key === 'Tab' && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (!first) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
      // Move focus into modal on next frame
      requestAnimationFrame(() => {
        closeRef.current?.focus();
      });
    } else {
      // Restore focus to the element that opened the modal
      if (triggerRef.current && (triggerRef.current as HTMLElement).focus) {
        (triggerRef.current as HTMLElement).focus();
      }
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md anim-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
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
        aria-describedby={description ? 'modal-description' : undefined}
      >
        {/* Top accent */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.5)] to-transparent" aria-hidden="true" />

        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-[var(--border-subtle)]">
            <div>
              {title && <h2 id="modal-title" className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>}
              {description && <p id="modal-description" className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl
                         text-[var(--text-muted)] hover:text-[var(--text-primary)]
                         bg-[var(--surface-100)] hover:bg-[var(--surface-200)]
                         transition-all duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {!title && (
          <button
            ref={closeRef}
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-xl
                       text-[var(--text-muted)] hover:text-[var(--text-primary)]
                       bg-[var(--surface-100)] hover:bg-[var(--surface-200)]
                       transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        <div className="overflow-y-auto max-h-[80vh] no-scrollbar">{children}</div>
      </div>
    </div>
  );
}
