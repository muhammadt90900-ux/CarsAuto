'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceNotePlayerProps {
  audioUrl:     string;
  duration:     number;   // seconds (from DB)
  isSender:     boolean;
  className?:   string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VoiceNotePlayer({ audioUrl, duration, isSender, className }: VoiceNotePlayerProps) {
  const audioRef   = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [current,  setCurrent]  = useState(0); // seconds
  const [loaded,   setLoaded]   = useState(false);
  const [error,    setError]    = useState(false);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => setError(true));
    }
  }, [playing]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !loaded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * (audio.duration || duration);
  }, [duration, loaded]);

  const displayDuration = current > 0 ? current : duration;

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-2xl min-w-[180px] max-w-[260px]',
        isSender
          ? 'bg-champagne-gold text-midnight-navy'
          : 'bg-white/10 text-white',
        className,
      )}
    >
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onCanPlay={() => setLoaded(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio) return;
          setCurrent(Math.floor(audio.currentTime));
          setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
        }}
        onError={() => setError(true)}
      />

      {/* Mic icon */}
      <Mic size={14} className="shrink-0 opacity-70" />

      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        disabled={error}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isSender
            ? 'bg-midnight-navy text-champagne-gold hover:bg-midnight-navy/80'
            : 'bg-champagne-gold text-midnight-navy hover:bg-champagne-gold/80',
          'transition-colors disabled:opacity-40',
        )}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {/* Waveform progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          onClick={handleSeek}
          className="relative h-1.5 rounded-full bg-current/20 cursor-pointer"
        >
          <div
            className="absolute inset-y-0 start-0 rounded-full bg-current transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Duration */}
        <span className="text-[10px] opacity-60 font-mono">
          {error ? 'Error' : formatDuration(displayDuration)}
        </span>
      </div>
    </div>
  );
}
