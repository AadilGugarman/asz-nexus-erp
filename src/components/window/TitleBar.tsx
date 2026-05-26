/**
 * components/window/TitleBar.tsx
 * Custom application titlebar — 48 px tall, always visible.
 * Shows gradient logo + active company name on the left, controls on the right.
 *
 * Name logic:
 *   - Shows active company name when a company is configured
 *   - Falls back to "ASZ Nexus ERP" on first run / no company
 *   This matches how every serious ERP (Tally, Zoho, QuickBooks) works —
 *   the active company is the most critical context to show at all times.
 */

import React, { useCallback } from 'react';
import { Pin, PinOff, Maximize2, Minimize2, Sun, Moon, Keyboard, Calculator as CalculatorIcon } from 'lucide-react';
import { WindowControls } from './WindowControls';
import { useWindow } from '@/hooks';
import { useAppearanceStore } from '@/store/appearance.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUIStore } from '@/store/ui.store';
import { APP_CONFIG } from '@/config';
import { Calculator } from '../Calculator';

interface TitleBarProps {
  pageTitle?: string;
  onOpenShortcuts?: () => void;
}

// ── ERP Logo Icon ─────────────────────────────────────────────────────────────
// A compact ledger-with-upward-trend mark — represents billing + analytics.
// Sized for the 16×16 slot that Truck previously occupied.
const ErpLogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Three rising bars */}
    <rect x="1"  y="10" width="3" height="5" rx="0.75" fill="white" opacity="0.95" />
    <rect x="6.5" y="7"  width="3" height="8" rx="0.75" fill="white" opacity="0.95" />
    <rect x="12" y="3.5" width="3" height="11.5" rx="0.75" fill="white" opacity="0.95" />
    {/* Trend line connecting bar tops */}
    <polyline
      points="2.5,10 8,7 13.5,3.5"
      stroke="white"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    {/* Tip dot */}
    <circle cx="13.5" cy="3.5" r="1.2" fill="white" opacity="0.95" />
  </svg>
);

export const TitleBar: React.FC<TitleBarProps> = ({ onOpenShortcuts }) => {
  const resolvedTheme = useAppearanceStore((s) => s.resolvedTheme);
  const toggleTheme   = useAppearanceStore((s) => s.toggleTheme);
  const companyName   = useSettingsStore((s) => s.settings.company?.name);
  const { toggleCalculator } = useUIStore();
  const {
    startDrag,
    toggleMaximize,
    toggleFullscreen,
    toggleAlwaysOnTop,
    isFullscreen,
    isAlwaysOnTop,
    isFocused,
  } = useWindow();

  const isDark = resolvedTheme === 'dark';
  // Show active company name — fall back to app name when no company is set up
  const displayName = companyName || 'ASZ Nexus ERP';

  const handleDoubleClick = useCallback(() => {
    toggleMaximize();
  }, [toggleMaximize]);

  // ── Styles ────────────────────────────────────────────────────────────────

  const barBg = isDark
    ? isFocused
      ? 'bg-[#131e30] border-[rgba(30,48,72,0.9)]'
      : 'bg-[#131e30]/90 border-[rgba(30,48,72,0.6)]'
    : isFocused
      ? 'bg-white border-slate-200'
      : 'bg-slate-50 border-slate-200/60';

  const nameColor  = isDark ? 'text-[#e8f0fe]' : 'text-[#0f172a]';

  const iconBtnBase = 'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 focus:outline-none select-none cursor-pointer';
  const iconBtnIdle = isDark
    ? 'text-[#6a8aaa] hover:text-[#e8f0fe] hover:bg-[rgba(59,130,246,0.08)]'
    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100';
  const iconBtnActive = isDark
    ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
    : 'text-indigo-500 bg-indigo-50 hover:bg-indigo-100';

  const primaryBtnBase = 'flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl transition-all duration-150 focus:outline-none select-none cursor-pointer font-semibold text-[11px] border';
  const primaryBtnIdle = isDark
    ? 'text-[#94b4d4] border-[rgba(30,48,72,0.9)] bg-[rgba(19,30,48,0.6)] hover:text-[#e8f0fe] hover:bg-[rgba(59,130,246,0.10)] hover:border-[rgba(59,130,246,0.25)]'
    : 'text-slate-500 border-slate-200 bg-slate-50 hover:text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-sm';

  // ── Logo + name ───────────────────────────────────────────────────────────
  const LeftContent = () => (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="shrink-0 p-2 rounded-xl shadow-[0_8px_20px_rgba(0,174,239,0.18)]"
        style={{ background: 'linear-gradient(135deg,#00C896,#00AEEF)' }}
      >
        <ErpLogoIcon className="w-4 h-4" />
      </div>
      <div className="flex flex-col min-w-0 leading-none gap-0.5">
        <span className={`text-sm font-bold tracking-tight truncate ${nameColor}`}>
          {displayName}
        </span>
        {/* Show "ASZ Nexus ERP" as a subtle sub-label when a company name is active */}
        {companyName && (
          <span className={`text-[10px] font-medium truncate ${isDark ? 'text-[#6a8aaa]' : 'text-slate-400'}`}>
            ASZ Nexus ERP
          </span>
        )}
      </div>
    </div>
  );

  // ── Browser fallback ──────────────────────────────────────────────────────
  if (!APP_CONFIG.isTauri) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-12 px-4 border-b transition-colors duration-200 ${barBg}`}>
        <LeftContent />
        <div className="flex items-center gap-2">
          <button onClick={toggleCalculator} className={`${primaryBtnBase} ${primaryBtnIdle}`} title="Calculator">
            <CalculatorIcon size={16} strokeWidth={2} />
            <span>Calc</span>
          </button>
          <button onClick={onOpenShortcuts} className={`${primaryBtnBase} ${primaryBtnIdle}`} title="Keyboard shortcuts (Alt+K)">
            <Keyboard size={16} strokeWidth={2} />
            <span>Shortcuts</span>
          </button>
          <button onClick={toggleTheme} className={`${primaryBtnBase} ${primaryBtnIdle}`} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark
              ? <><Sun size={16} strokeWidth={2} /><span>Light</span></>
              : <><Moon size={16} strokeWidth={2} /><span>Dark</span></>
            }
          </button>
        </div>
        <Calculator />
      </div>
    );
  }

  // ── Full Tauri titlebar ───────────────────────────────────────────────────
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 flex items-center h-12 border-b select-none transition-colors duration-200 ${barBg}`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div
        className="flex items-center flex-1 min-w-0 h-full px-4"
        data-tauri-drag-region
        onMouseDown={startDrag}
        onDoubleClick={handleDoubleClick}
      >
        <LeftContent />
      </div>

      <div
        className="flex items-center gap-2 px-3 h-full shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button className={`${primaryBtnBase} ${primaryBtnIdle}`} onClick={toggleCalculator} title="Quick Calculator" tabIndex={-1}>
          <CalculatorIcon size={16} strokeWidth={2} />
          <span>Calc</span>
        </button>

        <button className={`${primaryBtnBase} ${primaryBtnIdle}`} onClick={onOpenShortcuts} title="Keyboard shortcuts (Alt+K)" tabIndex={-1}>
          <Keyboard size={16} strokeWidth={2} />
          <span>Shortcuts</span>
        </button>

        <button className={`${primaryBtnBase} ${primaryBtnIdle}`} onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'} tabIndex={-1}>
          {isDark
            ? <><Sun size={16} strokeWidth={2} /><span>Light</span></>
            : <><Moon size={16} strokeWidth={2} /><span>Dark</span></>
          }
        </button>

        <div className={`w-px h-5 ${isDark ? 'bg-[rgba(30,48,72,0.9)]' : 'bg-slate-200'}`} />

        <button className={`${iconBtnBase} ${isAlwaysOnTop ? iconBtnActive : iconBtnIdle}`} onClick={toggleAlwaysOnTop} title={isAlwaysOnTop ? 'Unpin' : 'Pin on top'} tabIndex={-1}>
          {isAlwaysOnTop ? <Pin size={13} strokeWidth={2} /> : <PinOff size={13} strokeWidth={2} />}
        </button>
        <button className={`${iconBtnBase} ${isFullscreen ? iconBtnActive : iconBtnIdle}`} onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} tabIndex={-1}>
          {isFullscreen ? <Minimize2 size={13} strokeWidth={2} /> : <Maximize2 size={13} strokeWidth={2} />}
        </button>

        <div className={`w-px h-5 ${isDark ? 'bg-[rgba(30,48,72,0.9)]' : 'bg-slate-200'}`} />
        <WindowControls />
      </div>
      <Calculator />
    </div>
  );
};

