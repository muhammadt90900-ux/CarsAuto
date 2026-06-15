'use client';

import React, { useCallback } from 'react';
import { Mic, Square, X, Send, Loader2, AlertCircle } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { cn } from '@/lib/utils';

interface VoiceRecorderButtonProps {
  onSend: (params: {
    audioBase64: string;
    duration:    number;
    mimeType:    'audio/webm' | 'audio/mp4' | 'audio/ogg';
  }) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const MIME_BASE: Record<string, 'audio/webm' | 'audio/mp4' | 'audio/ogg'> = {
  'audio/webm': 'audio/webm',
  'audio/mp4':  'audio/mp4',
  'audio/ogg':  'audio/ogg',
};

function getMimeBase(mimeType: string): 'audio/webm' | 'audio/mp4' | 'audio/ogg' {
  for (const key of Object.keys(MIME_BASE)) {
    if (mimeType.startsWith(key)) return MIME_BASE[key]!;
  }
  return 'audio/webm';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VoiceRecorderButton({ onSend, disabled, className }: VoiceRecorderButtonProps) {
  const {
    state, duration, audioBlob, audioUrl, errorMessage,
    startRecording, stopRecording, cancelRecording, resetRecorder, getBase64,
  } = useVoiceRecorder();

  const handleSend = useCallback(async () => {
    if (!audioBlob) return;
    const base64 = await getBase64();
    if (!base64) return;
    const mimeType = getMimeBase(audioBlob.type);
    try {
      await onSend({ audioBase64: base64, duration, mimeType });
      resetRecorder();
    } catch {
      // parent handles error display
    }
  }, [audioBlob, duration, getBase64, onSend, resetRecorder]);

  // ── idle ──────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <button
        onClick={startRecording}
        disabled={disabled}
        title="Record voice note"
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full',
          'bg-champagne-gold/10 hover:bg-champagne-gold/20 text-champagne-gold',
          'transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
          className,
        )}
      >
        <Mic size={20} />
      </button>
    );
  }

  // ── recording ─────────────────────────────────────────────────────────────
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full border border-red-500/30">
        {/* Animated dot */}
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-mono text-red-400 min-w-[44px]">
          {formatDuration(duration)}
        </span>
        <span className="text-xs text-muted-foreground">Recording…</span>

        {/* Cancel */}
        <button
          onClick={cancelRecording}
          className="ml-1 p-1 rounded-full hover:bg-white/10 text-muted-foreground"
          title="Cancel"
        >
          <X size={16} />
        </button>

        {/* Stop */}
        <button
          onClick={stopRecording}
          className="p-1 rounded-full bg-red-500 hover:bg-red-600 text-white"
          title="Stop recording"
        >
          <Square size={16} />
        </button>
      </div>
    );
  }

  // ── stopped — preview & send ──────────────────────────────────────────────
  if (state === 'stopped' && audioUrl) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-midnight-navy/40 rounded-full border border-white/10">
        {/* Discard */}
        <button
          onClick={resetRecorder}
          className="p-1 rounded-full hover:bg-white/10 text-muted-foreground"
          title="Discard"
        >
          <X size={16} />
        </button>

        {/* Native audio preview */}
        <audio
          src={audioUrl}
          controls
          className="h-8 max-w-[140px] [&::-webkit-media-controls-panel]:bg-transparent"
        />

        <span className="text-xs text-muted-foreground font-mono">{formatDuration(duration)}</span>

        {/* Send */}
        <button
          onClick={handleSend}
          className="p-1.5 rounded-full bg-champagne-gold hover:bg-champagne-gold/80 text-midnight-navy"
          title="Send voice note"
        >
          <Send size={16} />
        </button>
      </div>
    );
  }

  // ── uploading ─────────────────────────────────────────────────────────────
  if (state === 'uploading') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Loader2 size={18} className="animate-spin text-champagne-gold" />
        <span className="text-sm text-muted-foreground">Sending…</span>
      </div>
    );
  }

  // ── error ─────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <AlertCircle size={18} className="text-red-500" />
        <span className="text-xs text-red-400 max-w-[160px] truncate">
          {errorMessage ?? 'Microphone error'}
        </span>
        <button
          onClick={resetRecorder}
          className="text-xs text-muted-foreground underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
