import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, Info, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type DialogVariant = 'confirm' | 'destructive' | 'success' | 'error' | 'info';

interface DialogOptions {
  variant?: DialogVariant;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

interface DialogContextType {
  confirm: (options: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useConfirmDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  return context;
};

interface InternalState extends DialogOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<InternalState>({
    isOpen: false, resolve: null, variant: 'confirm', title: '', description: '', confirmText: 'Confirm', cancelText: 'Cancel',
  });
  const [exiting, setExiting] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        resolve,
        variant: options.variant || 'confirm',
        title: options.title,
        description: options.description,
        confirmText: options.confirmText || (options.variant === 'destructive' ? 'Delete' : 'Confirm'),
        cancelText: options.cancelText || 'Cancel',
        icon: options.icon,
        loading: options.loading,
      });
      setExiting(false);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setExiting(true);
    setTimeout(() => {
      state.resolve?.(result);
      setState(prev => ({ ...prev, isOpen: false, resolve: null }));
      setExiting(false);
    }, 150);
  }, [state.resolve]);

  // Focus confirm button on open
  useEffect(() => {
    if (state.isOpen && !exiting) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [state.isOpen, exiting]);

  // ESC to close
  useEffect(() => {
    if (!state.isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') { e.preventDefault(); close(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.isOpen, close]);

  // Variant styling
  const variantConfig: Record<DialogVariant, { iconBg: string; iconColor: string; btnClass: string; defaultIcon: React.ReactNode }> = {
    destructive: {
      iconBg: 'bg-rose-100 dark:bg-rose-500/15',
      iconColor: 'text-rose-600 dark:text-rose-400',
      btnClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20',
      defaultIcon: <Trash2 className="w-6 h-6" />,
    },
    confirm: {
      iconBg: 'bg-indigo-100 dark:bg-indigo-500/15',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      btnClass: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
      defaultIcon: <Info className="w-6 h-6" />,
    },
    success: {
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
      defaultIcon: <CheckCircle2 className="w-6 h-6" />,
    },
    error: {
      iconBg: 'bg-rose-100 dark:bg-rose-500/15',
      iconColor: 'text-rose-600 dark:text-rose-400',
      btnClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20',
      defaultIcon: <AlertCircle className="w-6 h-6" />,
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-500/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
      btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20',
      defaultIcon: <Info className="w-6 h-6" />,
    },
  };

  const v = variantConfig[state.variant || 'confirm'];

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {state.isOpen && createPortal(
        <div className={`fixed inset-0 z-[999999] flex items-center justify-center p-4 ${exiting ? 'animate-fade-out' : 'animate-fade-in'}`}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />

          {/* Dialog Card */}
          <div className={`relative w-full max-w-[420px] dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl dark:shadow-black/40 overflow-hidden ${exiting ? 'animate-dialog-out' : 'animate-dialog-in'}`}
            role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">

            {/* Close button */}
            <button onClick={() => close(false)} className="absolute top-4 right-4 p-1 dark:text-slate-500 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer z-10" aria-label="Close">
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="p-6 pt-7">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-2xl ${v.iconBg} ${v.iconColor} shrink-0`}>
                  {state.icon || v.defaultIcon}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 id="dialog-title" className="text-[15px] font-bold dark:text-white text-slate-900 leading-snug pr-6">{state.title}</h3>
                  {state.description && (
                    <p id="dialog-desc" className="text-[13px] dark:text-slate-400 text-slate-500 mt-1.5 leading-relaxed">{state.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-2 flex items-center justify-end space-x-3">
              <button onClick={() => close(false)}
                className="px-4 py-2.5 dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-200">
                {state.cancelText}
              </button>
              <button ref={confirmBtnRef} onClick={() => close(true)} disabled={state.loading}
                className={`px-5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-wait ${v.btnClass} flex items-center space-x-2`}>
                {state.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{state.confirmText}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </DialogContext.Provider>
  );
};
