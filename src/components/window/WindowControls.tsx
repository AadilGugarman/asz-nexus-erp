/**
 * components/window/WindowControls.tsx
 * Minimise / Maximise / Close buttons for the custom titlebar.
 *
 * Styled to match the app's dark/light theme.
 * Renders nothing in browser dev mode (no Tauri runtime).
 *
 * Usage:
 *   <WindowControls />
 */

import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { useWindow } from '@/hooks';
import { useApp } from '@/context/AppContext';
import { APP_CONFIG } from '@/config';

export const WindowControls: React.FC = () => {
  const { theme } = useApp();
  const { minimize, toggleMaximize, close, isMaximized } = useWindow();

  // Don't render in browser — no native window to control.
  if (!APP_CONFIG.isTauri) return null;

  const isDark = theme === 'dark';

  const btnBase = [
    'flex items-center justify-center',
    'w-[46px] h-[32px]',
    'transition-colors duration-100',
    'select-none',
    'focus:outline-none',
  ].join(' ');

  const hoverNeutral = isDark
    ? 'hover:bg-slate-700/70'
    : 'hover:bg-slate-200/80';

  const iconColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const iconHover = isDark ? 'group-hover:text-slate-100' : 'group-hover:text-slate-800';

  return (
    <div
      className="flex items-center shrink-0 h-full"
      // Prevent the drag region from capturing clicks on the buttons.
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Minimise */}
      <button
        className={`group ${btnBase} ${hoverNeutral}`}
        onClick={minimize}
        title="Minimise"
        aria-label="Minimise window"
        tabIndex={-1}
      >
        <Minus
          size={12}
          strokeWidth={2}
          className={`${iconColor} ${iconHover} transition-colors`}
        />
      </button>

      {/* Maximise / Restore */}
      <button
        className={`group ${btnBase} ${hoverNeutral}`}
        onClick={toggleMaximize}
        title={isMaximized ? 'Restore' : 'Maximise'}
        aria-label={isMaximized ? 'Restore window' : 'Maximise window'}
        tabIndex={-1}
      >
        {isMaximized ? (
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            className={`${iconColor} ${iconHover} transition-colors`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {/* Restore icon — two overlapping squares */}
            <rect x="2.5" y="0.5" width="8" height="8" rx="0.5" />
            <path d="M0.5 2.5v8h8" />
          </svg>
        ) : (
          <Square
            size={11}
            strokeWidth={1.5}
            className={`${iconColor} ${iconHover} transition-colors`}
          />
        )}
      </button>

      {/* Close */}
      <button
        className={`group ${btnBase} hover:bg-red-500/90`}
        onClick={close}
        title="Close"
        aria-label="Close window"
        tabIndex={-1}
      >
        <X
          size={13}
          strokeWidth={2}
          className={`${iconColor} group-hover:text-white transition-colors`}
        />
      </button>
    </div>
  );
};
