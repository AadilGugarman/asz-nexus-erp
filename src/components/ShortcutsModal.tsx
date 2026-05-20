import React from 'react';
import { Keyboard, X, CornerDownLeft, ClipboardPaste, Plus, Copy, Compass } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 dark:bg-slate-900 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-6 dark:text-white text-slate-900 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-800 border-slate-200 pb-4">
          <h3 className="text-lg font-bold flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Mandi OS Keyboard Shortcuts</span>
          </h3>
          <button onClick={onClose} className="dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm font-sans">
          {/* Module Jumping */}
          <div className="flex items-center justify-between p-3 bg-slate-950 dark:bg-slate-950 bg-slate-100 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
            <div className="flex items-center space-x-3">
              <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="font-bold dark:text-slate-200 text-slate-900 font-sans">Fast Module Switching</span>
            </div>
            <div className="space-x-1.5 font-mono text-xs font-bold">
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded text-cyan-600 dark:text-cyan-400">F1</kbd> Inward | 
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded text-emerald-600 dark:text-emerald-400">F2</kbd> Buy | 
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400">F3</kbd> Sell
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950 dark:bg-slate-950 bg-slate-100 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
            <div className="flex items-center space-x-3">
              <CornerDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold dark:text-slate-200 text-slate-900 font-sans">Fast Enter Navigation</span>
            </div>
            <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2.5 py-1 rounded font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">Enter</kbd>
          </div>
          <p className="text-xs dark:text-slate-400 text-slate-600 pl-2 -mt-2 font-medium">Pressing Enter inside any spreadsheet cell instantly jumps focus to the next cell. On the last cell, it creates a new row automatically!</p>

          <div className="flex items-center justify-between p-3 bg-slate-950 dark:bg-slate-950 bg-slate-100 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
            <div className="flex items-center space-x-3">
              <Plus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="font-bold dark:text-slate-200 text-slate-900 font-sans">Add New Row</span>
            </div>
            <div className="space-x-1">
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded font-mono font-bold text-xs dark:text-white text-slate-900">Alt</kbd>
              <span className="dark:text-white text-slate-900">+</span>
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded font-mono font-bold text-xs dark:text-white text-slate-900">A</kbd>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950 dark:bg-slate-950 bg-slate-100 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
            <div className="flex items-center space-x-3">
              <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold dark:text-slate-200 text-slate-900 font-sans">Duplicate Current Row</span>
            </div>
            <div className="space-x-1">
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded font-mono font-bold text-xs dark:text-white text-slate-900">Alt</kbd>
              <span className="dark:text-white text-slate-900">+</span>
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded font-mono font-bold text-xs dark:text-white text-slate-900">D</kbd>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950 dark:bg-slate-950 bg-slate-100 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
            <div className="flex items-center space-x-3">
              <ClipboardPaste className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold dark:text-slate-200 text-slate-900 font-sans">Paste Excel/Sheets Data</span>
            </div>
            <div className="space-x-1">
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded font-mono font-bold text-xs dark:text-white text-slate-900">Ctrl</kbd>
              <span className="dark:text-white text-slate-900">+</span>
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded font-mono font-bold text-xs dark:text-white text-slate-900">V</kbd>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950 dark:bg-slate-950 bg-slate-100 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
            <div className="flex items-center space-x-3">
              <Keyboard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="font-bold dark:text-slate-200 text-slate-900 font-sans">Toggle Shortcuts Guide</span>
            </div>
            <div className="space-x-1">
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded font-mono font-bold text-xs dark:text-white text-slate-900">Alt</kbd>
              <span className="dark:text-white text-slate-900">+</span>
              <kbd className="bg-slate-800 dark:bg-slate-800 bg-white border border-slate-700 dark:border-slate-700 border-slate-300 px-2 py-1 rounded font-mono font-bold text-xs dark:text-white text-slate-900">K</kbd>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 dark:border-slate-800 border-slate-200 text-center">
          <button onClick={onClose} className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 text-white dark:text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/20">
            Got it, Back to Mandi OS
          </button>
        </div>
      </div>
    </div>
  );
};
