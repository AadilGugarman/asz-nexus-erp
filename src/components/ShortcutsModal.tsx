import React from 'react';
import { Keyboard, X, CornerDownLeft, ClipboardPaste, Plus, Copy, Compass } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Reusable kbd style using CSS tokens — works in both light and dark
const Kbd: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'text-[var(--text-primary)]' }) => (
  <kbd className={`bg-[var(--surface-bg)] border border-[var(--card-border)] px-2 py-1 rounded font-mono font-bold text-xs ${color}`}>
    {children}
  </kbd>
);

const ShortcutRow: React.FC<{ icon: React.ReactNode; label: string; keys: React.ReactNode }> = ({ icon, label, keys }) => (
  <div className="flex items-center justify-between p-3 bg-[var(--surface-bg)] rounded-xl border border-[var(--card-border)]">
    <div className="flex items-center space-x-3">
      {icon}
      <span className="font-bold text-[var(--text-primary)] font-sans">{label}</span>
    </div>
    <div className="flex items-center space-x-1 font-mono text-xs font-bold">{keys}</div>
  </div>
);

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="erp-panel rounded-2xl max-w-lg w-full overflow-hidden p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-emerald-500" />
            <span>Mandi OS Keyboard Shortcuts</span>
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--surface-bg)] cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs sm:text-sm font-sans">
          <ShortcutRow
            icon={<Compass className="w-4 h-4 text-sky-500" />}
            label="Fast Module Switching"
            keys={<>
              <Kbd color="text-sky-600 dark:text-sky-400">F1</Kbd>
              <span className="text-[var(--text-muted)] mx-1">Inward</span>
              <Kbd color="text-emerald-600 dark:text-emerald-400">F2</Kbd>
              <span className="text-[var(--text-muted)] mx-1">Buy</span>
              <Kbd color="text-[var(--primary)]">F3</Kbd>
              <span className="text-[var(--text-muted)] ml-1">Sell</span>
            </>}
          />

          <ShortcutRow
            icon={<CornerDownLeft className="w-4 h-4 text-emerald-500" />}
            label="Fast Enter Navigation"
            keys={<Kbd color="text-emerald-600 dark:text-emerald-400">Enter</Kbd>}
          />
          <p className="text-xs text-[var(--text-muted)] pl-2 -mt-1 font-medium">
            Enter inside any spreadsheet cell jumps to the next. On the last cell, it creates a new row automatically.
          </p>

          <ShortcutRow
            icon={<Plus className="w-4 h-4 text-[var(--primary)]" />}
            label="Add New Row"
            keys={<><Kbd>Alt</Kbd><span className="text-[var(--text-muted)] mx-1">+</span><Kbd>A</Kbd></>}
          />

          <ShortcutRow
            icon={<Copy className="w-4 h-4 text-blue-500" />}
            label="Duplicate Current Row"
            keys={<><Kbd>Alt</Kbd><span className="text-[var(--text-muted)] mx-1">+</span><Kbd>D</Kbd></>}
          />

          <ShortcutRow
            icon={<ClipboardPaste className="w-4 h-4 text-[var(--primary)]" />}
            label="Paste Excel / Sheets Data"
            keys={<><Kbd>Ctrl</Kbd><span className="text-[var(--text-muted)] mx-1">+</span><Kbd>V</Kbd></>}
          />

          <ShortcutRow
            icon={<Keyboard className="w-4 h-4 text-violet-500" />}
            label="Toggle Shortcuts Guide"
            keys={<><Kbd>Alt</Kbd><span className="text-[var(--text-muted)] mx-1">+</span><Kbd>K</Kbd></>}
          />

          <ShortcutRow
            icon={<Hash className="w-4 h-4 text-indigo-500" />}
            label="Quick Calculator"
            keys={<><Kbd>Alt</Kbd><span className="text-[var(--text-muted)] mx-1">+</span><Kbd>C</Kbd></>}
          />
        </div>

        <div className="pt-4 border-t border-[var(--card-border)] text-center">
          <button onClick={onClose} className="erp-btn-primary px-8 py-2.5 text-xs">
            Got it, Back to Mandi OS
          </button>
        </div>
      </div>
    </div>
  );
};
