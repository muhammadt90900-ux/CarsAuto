'use client';
/**
 * Modal / Drawer — AutoBazaarPro Design System
 *
 * Usage (Modal):
 *   <Modal open={open} onClose={() => setOpen(false)} title="Confirm Delete" size="sm">
 *     <p>Are you sure?</p>
 *     <Modal.Footer>
 *       <Button variant="outline" onClick={onClose}>Cancel</Button>
 *       <Button variant="danger">Delete</Button>
 *     </Modal.Footer>
 *   </Modal>
 *
 * Usage (Drawer — mobile bottom-sheet):
 *   <Drawer open={open} onClose={() => setOpen(false)} title="Filter">
 *     ...
 *   </Drawer>
 */

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalSize = 'sm' | 'default' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open:         boolean;
  onClose:      () => void;
  title?:       ReactNode;
  description?: ReactNode;
  size?:        ModalSize;
  /** Prevent close on overlay click */
  persistent?:  boolean;
  className?:   string;
  children:     ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm:      'modal-sm',
  default: '',
  lg:      'modal-lg',
  xl:      'modal-xl',
  full:    'modal-full',
};

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'default',
  persistent = false,
  className,
  children,
}: ModalProps) {
  // Close on Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !persistent) onClose();
    },
    [onClose, persistent],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-overlay"
      onClick={persistent ? undefined : onClose}
    >
      <div
        className={cn('modal', sizeClasses[size], className)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="modal-header">
            <div>
              {title       && <h2 className="modal-title">{title}</h2>}
              {description && <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
            </div>
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

// ─── Modal.Body ───────────────────────────────────────────────────────────────
Modal.Body = function ModalBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('modal-body', className)}>{children}</div>;
};

// ─── Modal.Footer ─────────────────────────────────────────────────────────────
Modal.Footer = function ModalFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('modal-footer', className)}>{children}</div>;
};

// ─── Drawer (bottom-sheet) ───────────────────────────────────────────────────
interface DrawerProps {
  open:      boolean;
  onClose:   () => void;
  title?:    ReactNode;
  className?: string;
  children:  ReactNode;
}

export function Drawer({ open, onClose, title, className, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="drawer-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn('drawer', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-handle" aria-hidden />
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
