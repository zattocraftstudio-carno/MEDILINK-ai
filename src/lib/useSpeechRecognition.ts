"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech-to-text input for the chat composer.
 *
 * ── Why this is a hook and not inline logic ──────────────────────────
 * The browser's SpeechRecognition API has its own lifecycle: you create an
 * instance, call `start()`, and it fires events until it is stopped. The
 * previous implementation created that instance inside a `useEffect` whose
 * dependency list included `value` — the very state the recognition
 * produces. Every transcript therefore tore down the running recognition
 * (`cleanup` -> `stop()` -> `onend` -> `isListening = false`), so the mic
 * died after a single utterance and any keystroke killed it too.
 *
 * The fix follows one rule: **the effect that owns the browser API must
 * not depend on the state that the browser API mutates.** React state is
 * mirrored into refs, and the effect's dependency list contains only
 * stable primitives.
 */

export type SpeechErrorCode =
  | "not-allowed"
  | "service-not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "language-not-supported"
  | "unknown";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: SpeechErrorCode }) => void) | null;
  onend: (() => void) | null;
}

const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Microphone access was blocked. Allow it in your browser's site settings, then try again.",
  "service-not-allowed":
    "Speech recognition is blocked by your browser or an extension. Please use Google Chrome or Microsoft Edge.",
  "audio-capture": "No microphone was found. Connect a microphone and try again.",
  network:
    "Speech recognition lost its network connection. Check your connection and try again.",
  "language-not-supported":
    "Voice input for this language is not supported on your device.",
  unsupported:
    "Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.",
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === "function"
    ? (ctor as new () => SpeechRecognitionLike)
    : null;
}

export interface UseSpeechRecognitionOptions {
  /** Current composer value — read once when the mic starts, never observed. */
  value: string;
  /** Called with the full next transcript. */
  onChange: (value: string) => void;
  /** BCP-47 tag. Changing it rebuilds the recogniser; nothing else may. */
  lang?: string;
}

export interface UseSpeechRecognitionResult {
  isListening: boolean;
  /** False when the browser has no SpeechRecognition implementation. */
  isSupported: boolean;
  /** A user-facing message, or null. */
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  clearError: () => void;
}

export function useSpeechRecognition({
  value,
  onChange,
  lang = "bn-BD",
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // React state mirrored into refs, so the effect below never re-runs.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Transcript bookkeeping for the CURRENT listening session.
  const baseTextRef = useRef(""); // text that existed before the mic was pressed
  const committedRef = useRef(""); // finalised speech accumulated this session
  const wantListeningRef = useRef(false); // user intent; survives Chrome's auto-end

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const RecognitionCtor = getRecognitionCtor();
    if (!RecognitionCtor) {
      setIsSupported(false);
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalText += chunk;
        else interimText += chunk;
      }

      // Only FINAL results are committed to the session transcript. Interim
      // results are shown but never persisted — otherwise the next event
      // re-prefixes an already-committed interim onto the value and the
      // transcript ends up doubled ("I have I have feverand").
      if (finalText.trim()) {
        committedRef.current = `${committedRef.current} ${finalText}`.trim();
      }

      const next = [baseTextRef.current, committedRef.current, interimText.trim()]
        .filter(Boolean)
        .join(" ") // restores the word boundaries lost by raw concatenation
        .replace(/\s+/g, " ")
        .trim();

      onChangeRef.current(next);
    };

    recognition.onerror = (event) => {
      const code = event?.error;
      // "no-speech" and "aborted" are benign — the browser simply stopped.
      if (code === "no-speech" || code === "aborted") return;
      setError(
        SPEECH_ERROR_MESSAGES[code] ??
          "Voice input failed. Please check your microphone and try again."
      );
      wantListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      // Chrome ends the session after a pause. Restart ONLY if the user has
      // never asked to stop — otherwise the mic would stay open forever.
      if (wantListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          /* fall through to the stopped state */
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
    // `value` and `onChange` are DELIBERATELY absent — they live in refs.
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError(SPEECH_ERROR_MESSAGES.unsupported);
      return;
    }
    setError(null);
    baseTextRef.current = valueRef.current.trim();
    committedRef.current = "";
    wantListeningRef.current = true;
    try {
      recognition.start();
    } catch {
      /* InvalidStateError means it is already running — treat as success. */
    }
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback(
    () => (isListening ? stop() : start()),
    [isListening, start, stop]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isListening,
    isSupported,
    error,
    start,
    stop,
    toggle,
    clearError,
  };
}
