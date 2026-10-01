import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

type ToastKind = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextType {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const KIND_STYLES: Record<ToastKind, { bg: string; Icon: typeof Info }> = {
  error: { bg: 'bg-[var(--pastel-coral)]', Icon: AlertTriangle },
  success: { bg: 'bg-[var(--pastel-mint)]', Icon: Check },
  info: { bg: 'bg-[var(--pastel-sky)]', Icon: Info },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, kind: ToastKind = 'error') => {
    const id = nextId.current++;
    setToasts((prev) => {
      // Don't stack the same message repeatedly (e.g. a failing autosave).
      const withoutDuplicate = prev.filter((toast) => toast.message !== message);
      return [...withoutDuplicate, { id, message, kind }].slice(-4);
    });
    setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4000);
  }, [dismiss]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 end-4 z-[200] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
        {toasts.map((toast) => {
          const { bg, Icon } = KIND_STYLES[toast.kind];
          return (
            <div
              key={toast.id}
              role={toast.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-2.5 p-3 border-3 border-[var(--border-ink)] ${bg} text-black shadow-[5px_5px_0px_var(--shadow-ink)] select-text`}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5 stroke-[2.5]" aria-hidden="true" />
              <p className="flex-1 text-xs font-heading font-bold leading-relaxed break-words">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="p-0.5 border-2 border-black bg-white/70 hover:bg-white cursor-pointer shrink-0"
                aria-label={t('dismiss')}
                title={t('dismiss')}
              >
                <X className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/** Readable message from an unknown error value. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
