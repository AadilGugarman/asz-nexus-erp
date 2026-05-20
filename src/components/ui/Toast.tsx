import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  exiting?: boolean;
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const ToastItem: React.FC<{ t: Toast; onRemove: (id: string) => void }> = ({ t, onRemove }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onRemove(t.id);
    }, t.duration || 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, t.duration, onRemove]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
  };

  const borderColors: Record<ToastType, string> = {
    success: 'border-emerald-500/40',
    error: 'border-rose-500/40',
    warning: 'border-amber-500/40',
    info: 'border-blue-500/40',
  };

  const bgGlows: Record<ToastType, string> = {
    success: 'shadow-emerald-500/10',
    error: 'shadow-rose-500/10',
    warning: 'shadow-amber-500/10',
    info: 'shadow-blue-500/10',
  };

  return (
    <div
      className={`flex items-start space-x-3 px-4 py-3.5 rounded-xl border ${borderColors[t.type]} shadow-xl ${bgGlows[t.type]} dark:bg-slate-900/95 bg-white/95 backdrop-blur-xl max-w-sm w-full font-sans ${
        t.exiting ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <div className="mt-0.5">{icons[t.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold dark:text-white text-slate-900 leading-tight">{t.title}</p>
        {t.message && (
          <p className="text-xs dark:text-slate-400 text-slate-600 mt-0.5 leading-relaxed">{t.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(t.id)}
        className="p-1 dark:text-slate-500 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev.slice(-4), { id, type, title, message, duration: duration || 4000 }]);
  }, []);

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (title, message) => addToast('success', title, message),
    error: (title, message) => addToast('error', title, message),
    warning: (title, message) => addToast('warning', title, message),
    info: (title, message) => addToast('info', title, message),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[999999] flex flex-col space-y-2.5 pointer-events-auto">
          {toasts.map(t => (
            <ToastItem key={t.id} t={t} onRemove={removeToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
