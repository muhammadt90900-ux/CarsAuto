'use client';
/**
 * Dropdown — AutoBazaarPro Design System
 *
 * Usage:
 *   <Dropdown
 *     trigger={<Button variant="outline" rightIcon={<ChevronDown />}>Options</Button>}
 *     items={[
 *       { label: 'Edit',   icon: <Pencil />, onClick: () => {} },
 *       { label: 'Delete', icon: <Trash />,  onClick: () => {}, danger: true },
 *     ]}
 *   />
 */

'use client';
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DropdownItem {
  label:     string;
  icon?:     ReactNode;
  onClick?:  () => void;
  danger?:   boolean;
  disabled?: boolean;
  divider?:  boolean;      // renders a divider BEFORE this item
  href?:     string;
}

type DropdownAlign = 'left' | 'right';

interface DropdownProps {
  trigger:    ReactNode;
  items:      DropdownItem[];
  align?:     DropdownAlign;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Dropdown({ trigger, items, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <div onClick={() => setOpen((v) => !v)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v); }}
      >
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className={cn(
            'dropdown',
            align === 'right' ? 'right-0' : 'left-0',
            'top-full mt-2',
          )}
        >
          {items.map((item, i) => {
            if (item.divider && i !== 0) {
              return (
                <div key={`divider-${i}`}>
                  <div className="dropdown-divider" aria-hidden />
                  <DropdownMenuItem item={item} onClose={close} />
                </div>
              );
            }
            return <DropdownMenuItem key={i} item={item} onClose={close} />;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Item ─────────────────────────────────────────────────────────────────────
function DropdownMenuItem({ item, onClose }: { item: DropdownItem; onClose: () => void }) {
  const handleClick = () => {
    if (item.disabled) return;
    item.onClick?.();
    onClose();
  };

  return (
    <button
      role="menuitem"
      disabled={item.disabled}
      onClick={handleClick}
      className={cn(
        'dropdown-item w-full text-left',
        item.danger   && 'danger',
        item.disabled && 'opacity-40 pointer-events-none',
      )}
    >
      {item.icon && <span className="shrink-0" aria-hidden>{item.icon}</span>}
      {item.label}
    </button>
  );
}
