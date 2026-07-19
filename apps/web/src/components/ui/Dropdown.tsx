'use client';
/**
 * Dropdown — CarsAuto Design System (Accessibility-enhanced)
 * ARIA: role="combobox"/listbox pattern, full keyboard navigation (↑↓ Enter Esc Home End)
 */

'use client';
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DropdownItem {
  label:     string;
  icon?:     ReactNode;
  onClick?:  () => void;
  danger?:   boolean;
  disabled?: boolean;
  divider?:  boolean;
  href?:     string;
}

type DropdownAlign = 'left' | 'right';

interface DropdownProps {
  trigger:    ReactNode;
  items:      DropdownItem[];
  align?:     DropdownAlign;
  className?: string;
  label?:     string;  // accessible label for the trigger button
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Dropdown({ trigger, items, align = 'left', className, label }: DropdownProps) {
  const [open, setOpen]         = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref                     = useRef<HTMLDivElement>(null);
  const menuRef                 = useRef<HTMLDivElement>(null);
  const triggerId               = useId();
  const menuId                  = useId();

  const close = useCallback(() => {
    setOpen(false);
    setActiveIdx(-1);
  }, []);

  const enabledItems = items.filter(i => !i.disabled && !i.divider);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Focus active item when activeIdx changes
  useEffect(() => {
    if (!open || activeIdx < 0) return;
    const btn = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])');
    btn?.[activeIdx]?.focus();
  }, [open, activeIdx]);

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(v => !v);
      if (!open) setActiveIdx(0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx(0);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const count = enabledItems.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => (i + 1) % count);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i - 1 + count) % count);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIdx(count - 1);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      close();
    }
  };

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <div
        id={triggerId}
        onClick={() => setOpen(v => !v)}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onKeyDown={handleTriggerKeyDown}
      >
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'dropdown',
            align === 'right' ? 'end-0' : 'start-0',
            'top-full mt-2',
          )}
        >
          {items.map((item, i) => {
            if (item.divider && i !== 0) {
              return (
                <div key={`divider-${i}`}>
                  <div className="dropdown-divider" role="separator" aria-hidden="true" />
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
      aria-disabled={item.disabled}
      onClick={handleClick}
      tabIndex={-1}
      className={cn(
        'dropdown-item w-full text-start',
        item.danger   && 'danger',
        item.disabled && 'opacity-40 pointer-events-none',
      )}
    >
      {item.icon && <span className="shrink-0" aria-hidden="true">{item.icon}</span>}
      {item.label}
    </button>
  );
}
