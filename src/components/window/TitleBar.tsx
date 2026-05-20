/**
 * components/window/TitleBar.tsx
 * Custom application titlebar for the Tauri desktop window.
 *
 * Features:
 *  - Native drag region (double-click to maximise, drag to move)
 *  - App icon + title
 *  - Optional centre slot for breadcrumb / page title
 *  - Right slot: always-on-top pin, fullscreen toggle, window controls
 *  - Adapts to dark / light theme
 *  - Renders a minimal fallback in browser dev mode
 *
 * Usage (in AppShell.tsx):
 *   <TitleBar pageTitle={activeTab} />
 *
 * The component is 32 px tall and sits at the very top of the layout.
 * Set `data-tauri-drag-region` on the drag area so Tauri handles the drag
 * natively without JS overhead.
 */

import React, { useCallback } from 'react';
import { Pin, PinOff, Maximize2, Minimize2 } from 'lucide-react';
import { WindowControls } from './WindowControls';
import { useWindow } from '@/hooks';
import { useApp } from '@/context/AppContext';
import { APP_CONFIG } from '@/config';

// ── Props ─────────────────────────────────────────────────────────────────────

interface TitleBarProps {
  /** Optional page/section title shown in the centre of the bar. */
  pageTitle?: string;
  /** Override the app name shown on the left. Defaults to "TFC ERP". */
  appName?: string;
}

// ── Tab label map ─────────────────────────────────────────────────────────────

const TAB_LABELS: Record<string, string> = {
  dashboard:  'Dashboard',
  arrival:    'Vehicle Arrival',
  purchase:   'Purchase Billing',
  sales:      'Sales Billing',
  inventory:  'Inventory',
  parties:    'Parties',
  payments:   'Payments',
  reports:    'Reports',
  suppliers:  'Suppliers',
  customers:  'Customers',
  settings:   'Settings',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const TitleBar: React.FC<TitleBarProps> = ({
  pageTitle,
  appName = 'TFC ERP',
}) => {
  const { theme } = useApp();
  const {
    startDrag,
    toggleMaximize,
    toggleFullscreen,
    toggleAlwaysOnTop,
    isFullscreen,
    isAlwaysOnTop,
    isFocused,
  } = useWindow();

  const isDark = theme === 'dark';

  // Double-click on drag region → toggle maximise.
  const handleDoubleClick = useCallback(() => {
    toggleMaximize();
  }, [toggleMaximize]);

  // ── Styles ──────────────────────────────────────────────────────────────────

  const barBg = isDark
    ? isFocused
      ? 'bg-slate-900 border-slate-800'
      : 'bg-slate-900/80 border-slate-800/60'
    : isFocused
      ? 'bg-white border-slate-200'
      : 'bg-slate-50 border-slate-200/60';

  const titleColor = isDark
    ? isFocused ? 'text-slate-100' : 'text-slate-400'
    : isFocused ? 'text-slate-800' : 'text-slate-400';

  const subtitleColor = isDark ? 'text-slate-500' : 'text-slate-400';

  const iconBtnBase = [
    'flex items-center justify-center',
    'w-7 h-7 rounded',
    'transition-colors duration-100',
    'focus:outline-none',
    'select-none',
  ].join(' ');

  const iconBtnIdle = isDark
    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100';

  const iconBtnActive = isDark
    ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
    : 'text-indigo-500 bg-indigo-50 hover:bg-indigo-100';

  // ── Browser fallback ─────────────────────────────────────────────────────────
  // In browser dev mode render a simple non-draggable bar so the layout
  // still works without a Tauri runtime.
  if (!APP_CONFIG.isTauri) {
    return (
      <div
        className={`
          fixed top-0 left-0 right-0 z-40 flex items-center h-8 px-3 border-b
          ${barBg}
        `}
      />
    );
  }

  // ── Full titlebar ─────────────────────────────────────────────────────────────

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-40 flex items-center h-8 border-b select-none
        ${barBg}
        transition-colors duration-200
      `}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* ── Drag region (left + centre) ──────────────────────────────────── */}
      <div
        className="flex items-center flex-1 min-w-0 h-full px-3 gap-2"
        data-tauri-drag-region
        onMouseDown={startDrag}
        onDoubleClick={handleDoubleClick}
      >
        {/* App icon */}
        <div className="shrink-0 w-4 h-4 rounded-sm overflow-hidden">
          <img
            src="/icons/icon.png"
            alt=""
            className="w-full h-full object-contain"
            draggable={false}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* ── Right controls (no drag region) ─────────────────────────────── */}
      <div
        className="flex items-center gap-0.5 px-1 h-full shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Always-on-top toggle */}
        <button
          className={`${iconBtnBase} ${isAlwaysOnTop ? iconBtnActive : iconBtnIdle}`}
          onClick={toggleAlwaysOnTop}
          title={isAlwaysOnTop ? 'Unpin window' : 'Pin window on top'}
          aria-label={isAlwaysOnTop ? 'Unpin window' : 'Pin window on top'}
          tabIndex={-1}
        >
          {isAlwaysOnTop
            ? <Pin size={12} strokeWidth={2} />
            : <PinOff size={12} strokeWidth={2} />
          }
        </button>

        {/* Fullscreen toggle */}
        <button
          className={`${iconBtnBase} ${isFullscreen ? iconBtnActive : iconBtnIdle}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          tabIndex={-1}
        >
          {isFullscreen
            ? <Minimize2 size={12} strokeWidth={2} />
            : <Maximize2 size={12} strokeWidth={2} />
          }
        </button>

        {/* Divider */}
        <div className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

        {/* Min / Max / Close */}
        <WindowControls />
      </div>
    </div>
  );
};
