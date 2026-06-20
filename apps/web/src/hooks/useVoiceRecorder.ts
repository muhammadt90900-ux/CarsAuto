'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped' | 'uploading' | 'error';

export interface VoiceRecorderResult {
  state:          RecorderState;
  duration:       number;          // seconds elapsed
  audioBlob:      Blob | null;
  audioUrl:       string | null;   // local object URL for preview playback
  errorMessage:   string | null;
  startRecording: () => Promise<void>;
  stopRecording:  () => void;
  cancelRecording: () => void;
  resetRecorder:  () => void;
  getBase64:      () => Promise<string | null>;
}

const MAX_DURATION_S = 120; // 2 minutes hard limit
const SUPPORTED_MIME  =
  MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
  : MediaRecorder.isTypeSupported('audio/mp4')           ? 'audio/mp4'
  : 'audio/ogg';

export function useVoiceRecorder(): VoiceRecorderResult {
  const [state,        setState]        = useState<RecorderState>('idle');
  const [duration,     setDuration]     = useState(0);
  const [audioBlob,    setAudioBlob]    = useState<Blob | null>(null);
  const [audioUrl,     setAudioUrl]     = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const chunksRef     = useRef<BlobPart[]>([]);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef  = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _stopTimer();
      _releaseStream();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function _stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function _releaseStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const startRecording = useCallback(async () => {
    if (state === 'recording') return;

    setErrorMessage(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: SUPPORTED_MIME });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: SUPPORTED_MIME });
        const url  = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState('stopped');
        _releaseStream();
      };

      recorder.start(250); // collect data every 250 ms
      startTimeRef.current = Date.now();
      setState('recording');

      // Tick timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        // Auto-stop at limit
        if (elapsed >= MAX_DURATION_S) {
          recorder.stop();
          _stopTimer();
        }
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setErrorMessage(msg);
      setState('error');
    }
  }, [state]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    _stopTimer();
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.ondataavailable = null;
      mediaRecorder.current.onstop = null;
      mediaRecorder.current.stop();
    }
    _stopTimer();
    _releaseStream();
    chunksRef.current = [];
    setState('idle');
    setDuration(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  const resetRecorder = useCallback(() => {
    cancelRecording();
  }, [cancelRecording]);

  const getBase64 = useCallback(async (): Promise<string | null> => {
    if (!audioBlob) return null;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip the data-URI prefix: "data:audio/webm;base64,<data>"
        const base64 = result.split(',')[1] ?? null;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsDataURL(audioBlob);
    });
  }, [audioBlob]);

  return {
    state, duration, audioBlob, audioUrl, errorMessage,
    startRecording, stopRecording, cancelRecording, resetRecorder, getBase64,
  };
}
