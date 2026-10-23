"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/** Monotonic counter — `Math.random()` ids could collide under load. */
let toastCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    toastCounter += 1;
    const id = `toast-${toastCounter}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/*
        The container must NOT declare `aria-live` itself: every toast
        already carries `role="alert"` (an assertive live region).
        Declaring both made the polite region dead while the assertive
        announcements still fired, which double-announced on some readers.
      */}
      <div
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2 pointer-events-none max-w-[90vw] w-max"
      >
        {toasts.map((toast) => (
          <SingleToast
            key={toast.id}
            toast={toast}
            onDismiss={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside of ToastProvider
    return {
      showToast: (message: string, type: ToastType = "info") => {
        console.log(`[Toast ${type}]: ${message}`);
      },
    };
  }
  return context;
};

interface SingleToastProps {
  toast: ToastItem;
  /** Stable across renders — a fresh closure here restarted the timer. */
  onDismiss: (id: string) => void;
}

const SingleToast: React.FC<SingleToastProps> = ({ toast, onDismiss }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(3200);

  // `onDismiss` is stable, and the toast id never changes, so the timer
  // effect runs exactly once. Previously `onDismiss` was a new closure on
  // every provider render, which restarted every toast's countdown — so
  // toasts could stay on screen indefinitely.
  const dismiss = useCallback(() => {
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      dismiss();
    }, remainingTimeRef.current);
  }, [dismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const bgStyles: Record<ToastType, string> = {
    success: "bg-success text-white",
    error: "bg-emergency text-white",
    info: "bg-text-primary text-white",
  };

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-[18px] h-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />,
    error: <AlertCircle className="w-[18px] h-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />,
    info: <Info className="w-[18px] h-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />,
  };

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      onTouchStart={pauseTimer}
      onTouchEnd={startTimer}
      className={`pointer-events-auto min-w-[280px] max-w-full px-[18px] py-3.5 rounded-md shadow-lg flex items-center gap-2.5 text-sm font-medium animate-toastRise ${bgStyles[toast.type]}`}
      role="alert"
    >
      {icons[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="w-11 h-11 flex items-center justify-center rounded hover:bg-white/20 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
};
