'use client';
// components/mobile/StickyAction.tsx
// Context-aware sticky action bars for mobile

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@cars-auto/utils';
import { Heart, Share2, MessageCircle, Phone } from 'lucide-react';

/* ── Haptic shim ──────────────────────────────────────────────── */
const haptic = (ms = 15) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
};

/* ── Press-scale button ───────────────────────────────────────── */
function PressButton({
  children, onClick, className, variant = 'ghost', disabled = false, 'aria-label': ariaLabel
}: {
  children: React.ReactNode; onClick?: () => void;
  className?: string; variant?: 'ghost' | 'gold' | 'outline'; disabled?: boolean;
  'aria-label'?: string;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={() => { setPressed(true); haptic(); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center gap-2',
        'font-semibold tracking-wide select-none',
        'transition-transform duration-100 ease-out',
        'active:scale-95',
        pressed ? 'scale-95' : 'scale-100',
        variant === 'gold' && [
          'bg-gradient-to-br from-[var(--gold)] to-[#9e6e1e] text-[#1a0e00]',
          'shadow-gold',
          'rounded-2xl h-14 px-6 text-[0.92rem]',
        ],
        variant === 'outline' && [
          'border border-[rgba(201,168,76,0.4)] text-[var(--gold)]',
          'rounded-2xl h-14 px-5 text-[0.92rem]',
          'hover:bg-[var(--gold-subtle)]',
        ],
        variant === 'ghost' && [
          'text-white/60 hover:text-white',
          'w-14 h-14 rounded-2xl',
          'hover:bg-white/[0.08]',
        ],
        disabled && 'opacity-40 pointer-events-none',
        className
      )}
    >
      {children}
    </button>
  );
}

/* ── Car listing action bar ───────────────────────────────────── */
export function CarStickyActions({
  price, onContact, onCall, onSave, onShare, saved = false, className
}: {
  price: string; onContact?: () => void; onCall?: () => void;
  onSave?: () => void; onShare?: () => void; saved?: boolean; className?: string;
}) {
  const [isSaved, setIsSaved] = useState(saved);
  const [visible, setVisible] = useState(true);
  const lastScroll = useRef(0);
  const t = useTranslations('listing');

  // Previously only read `saved` as an initial value — if the listing was
  // (un)saved from elsewhere on the page (e.g. the sidebar's own heart
  // button), this bar's icon would silently fall out of sync with it.
  useEffect(() => { setIsSaved(saved); }, [saved]);

  useEffect(() => {
    const fn = () => {
      setVisible(window.scrollY < lastScroll.current || window.scrollY < 100);
      lastScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className={cn(
      'fixed bottom-0 inset-x-0 z-40 md:hidden',
      'bg-[#070d18]/95 backdrop-blur-2xl',
      'border-t border-white/[0.08]',
      'pb-safe-bottom',
      'transition-transform duration-300 ease-out',
      visible ? 'translate-y-0' : 'translate-y-full',
      className
    )}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r
                       from-transparent via-[rgba(201,168,76,0.15)] to-transparent" />
      <div className="flex items-center gap-3 px-4 pt-3 pb-4">
        {/* Price */}
        <div className="flex-1 min-w-0">
          <p className="text-[0.7rem] text-white/40 font-medium uppercase tracking-widest">{t('price')}</p>
          <p className="text-xl font-display font-extrabold text-[var(--gold)] leading-tight">{price}</p>
        </div>

        {/* Save */}
        <PressButton
          onClick={() => { setIsSaved(v => !v); onSave?.(); haptic(isSaved ? 10 : 25); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
        >
          <Heart
            className={cn('w-5 h-5 transition-all duration-200',
              isSaved ? 'fill-[#e94560] stroke-[#e94560]' : 'stroke-white/50'
            )}
          />
        </PressButton>

        {/* Share */}
        <PressButton onClick={onShare} aria-label="Share this listing">
          <Share2 className="w-5 h-5 stroke-white/50" />
        </PressButton>

        {/* Contact */}
        <PressButton variant="gold" onClick={onContact} className="flex-1 max-w-[140px]">
          <MessageCircle className="w-4 h-4" />
          <span>{t('contactSeller')}</span>
        </PressButton>

        {/* Call */}
        <PressButton variant="outline" onClick={onCall} aria-label="Call seller">
          <Phone className="w-5 h-5" />
        </PressButton>
      </div>
    </div>
  );
}

/* ── Dashboard listing action bar ─────────────────────────────── */
export function DashboardStickyAction({
  label = 'Add New Listing', onClick, count
}: {
  label?: string; onClick?: () => void; count?: number;
}) {
  return (
    <div className="fixed bottom-20 inset-x-4 z-30 md:hidden">
      <PressButton
        variant="gold"
        onClick={onClick}
        className="w-full gap-3 shadow-gold-xl"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span>{label}</span>
        {count !== undefined && (
          <span className="ml-auto text-xs opacity-60">{count} active</span>
        )}
      </PressButton>
    </div>
  );
}

/* ── Search results sticky filter pill ────────────────────────── */
export function StickyFilterTrigger({
  activeCount = 0, onOpen, label = 'Filters'
}: {
  activeCount?: number; onOpen?: () => void; label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    const fn = () => {
      setVisible(window.scrollY > 80);
      lastScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className={cn(
      'fixed top-[70px] start-1/2 -translate-x-1/2 z-40 md:hidden',
      'transition-all duration-300 ease-out',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
    )}>
      <button
        onClick={() => { haptic(); onOpen?.(); }}
        className="flex items-center gap-2 px-4 py-2
                   bg-[rgba(8,15,28,0.9)] backdrop-blur-xl
                   border border-[rgba(201,168,76,0.2)]
                   rounded-full text-sm text-white/80
                   shadow-[0_4px_20px_rgba(0,0,0,0.60)]
                   active:scale-95 transition-transform duration-100"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M1 4h12M3 7h8M5 10h4" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold
                           rounded-full bg-[var(--gold)] text-[#1a0e00]">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}
