// ─── Toast Notification System ───────────────────────────────────────────────
// Context-based toast notifications with auto-dismiss, stacking, and types.
// Usage:
//   const { addToast } = useToast();
//   addToast({ type: "success", title: "Saved!", message: "Page updated" });

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000. Set to 0 for persistent toasts.
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  toasts: ToastItem[];
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>): string => {
      counterRef.current += 1;
      const id = `toast_${counterRef.current}_${Date.now()}`;
      const item: ToastItem = { ...toast, id, duration: toast.duration ?? 4000 };

      setToasts((prev) => [...prev, item]);

      // Auto-dismiss (unless duration is 0)
      if (item.duration && item.duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, item.duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast],
  );

  const clearToasts = useCallback(() => {
    for (const [id, timer] of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
    setToasts([]);
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearToasts, toasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    case 'info':
    default:
      return <Info className="h-4 w-4 text-blue-400" />;
  }
}

// ─── Container ───────────────────────────────────────────────────────────────

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-9999 flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto animate-in slide-in-from-right-4 fade-in-0 duration-200',
            'flex items-start gap-3 p-3 rounded-lg border shadow-lg backdrop-blur-xs',
            'bg-card/95 border-border',
            toast.type === 'success' && 'border-emerald-500/30',
            toast.type === 'warning' && 'border-amber-500/30',
            toast.type === 'error' && 'border-red-500/30',
            toast.type === 'info' && 'border-blue-500/30',
          )}
          role="alert"
        >
          <div className="shrink-0 mt-0.5">
            <ToastIcon type={toast.type} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{toast.title}</p>
            {toast.message && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-1 text-[10px] font-medium text-primary hover:underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Global imperative API (for non-React contexts) ──────────────────────────
// Allows showing toasts from event handlers or subscription callbacks without
// React component access. Must call initGlobalToast() first with the addToast
// function from a component that has access to the context.

let globalAddToast: ((toast: Omit<ToastItem, 'id'>) => string) | null = null;

export function initGlobalToast(addToastFn: (toast: Omit<ToastItem, 'id'>) => string) {
  globalAddToast = addToastFn;
}

export function showToast(toast: Omit<ToastItem, 'id'>): string | undefined {
  if (globalAddToast) {
    return globalAddToast(toast);
  }
  console.warn('[Toast] Global toast not initialized. Calling addToast from a component context.');
  return undefined;
}
