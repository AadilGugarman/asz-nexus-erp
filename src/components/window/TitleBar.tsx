/**
 * components/window/TitleBar.tsx
 * Custom application titlebar â€” 48 px tall, always visible.
 * Shows gradient logo + active company name on the left, controls on the right.
 *
 * Name logic:
 *   - Shows active company name when a company is configured
 *   - Falls back to "ASZ Nexus ERP" on first run / no company
 *   This matches how every serious ERP (Tally, Zoho, QuickBooks) works â€”
 *   the active company is the most critical context to show at all times.
 */

import React, { useCallback } from 'react';
import { Pin, PinOff, Maximize2, Minimize2, Sun, Moon, Keyboard, Calculator as CalculatorIcon, Clock } from 'lucide-react';
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
// Sized for the 16x16 slot that Truck previously occupied.
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

const getCompanyInitials = (name: string) => {
  const skip = ["and", "&", "of", "the"];
  return name
    .split(/\s+/)
    .filter((w) => w && !skip.includes(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
};

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

  // ── Live Clock and Date State ──────────────────────────────────────────────
  const [timeState, setTimeState] = React.useState({
    time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    date: new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeState({
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        date: new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isDark = resolvedTheme === 'dark';
  // Show active company name â€” fall back to app name when no company is set up
  const displayName = companyName || 'ASZ Nexus ERP';

  const handleDoubleClick = useCallback(() => {
    toggleMaximize();
  }, [toggleMaximize]);

  // â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  const initials = getCompanyInitials(companyName || 'ASZ Nexus ERP');

  // ── Logo + name ───────────────────────────────────────────────────────────
  const LeftContent = () => (
    <div className="flex items-center gap-3 min-w-0">
      <style>{`
        @keyframes logoGlowPulse {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 8px 20px rgba(0,174,239,0.15);
          }
          50% {
            transform: translateY(-2px) scale(1.03);
            box-shadow: 0 12px 28px rgba(0,174,239,0.35);
          }
        }
        @keyframes logoGradientShift {
          0%, 100% { filter: hue-rotate(0deg) saturate(1); }
          50% { filter: hue-rotate(15deg) saturate(1.1); }
        }
        @keyframes sheenSwipe {
          0% { left: -150%; }
          100% { left: 150%; }
        }
        .animate-logo-premium {
          position: relative;
          overflow: hidden;
          animation: logoGlowPulse 4s infinite ease-in-out, logoGradientShift 8s infinite ease-in-out;
        }
        .animate-logo-premium::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -150%;
          width: 50%;
          height: 200%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.45) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(25deg);
        }
        .animate-logo-premium:hover::after {
          animation: sheenSwipe 0.85s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-logo-premium:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div
        className="shrink-0 animate-logo-premium hover:shadow-[0_8px_32px_rgba(0,174,239,0.5)] hover:scale-115 hover:rotate-[8deg] active:scale-95 transition-all duration-300 ease-out cursor-pointer flex items-center justify-center w-8 h-8 rounded-xl"
        style={{ background: 'linear-gradient(135deg,#00C896,#00AEEF)' }}
      >
        <ErpLogoIcon className="w-4 h-4 animate-[spinSlow_15s_infinite_linear]" />
      </div>
      <div className="flex flex-col min-w-0 leading-tight gap-0.5">
        {companyName ? (
          <>
            <span
              className="text-[11px] font-black uppercase tracking-wider leading-none select-none"
              style={{
                backgroundImage: 'linear-gradient(135deg,#00C896,#00AEEF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {initials}
            </span>
            <span className={`text-[13px] font-black tracking-tight truncate ${nameColor}`}>
              {companyName}
            </span>
          </>
        ) : (
          <span className={`text-sm font-black tracking-tight truncate ${nameColor}`}>
            ASZ Nexus ERP
          </span>
        )}
      </div>
    </div>
  );

  const DateTimeWidget = () => (
    <div
      className={`absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 ${
        isDark
          ? 'bg-[rgba(19,30,48,0.4)] border-[rgba(30,48,72,0.6)] text-[#94b4d4]'
          : 'bg-slate-50 border-slate-200/80 text-slate-500'
      }`}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-1.5 font-mono">
        <Clock className="w-3.5 h-3.5 stroke-[2] text-indigo-400" />
        <span className={isDark ? 'text-[#e8f0fe]' : 'text-slate-700'}>{timeState.time}</span>
      </div>
      <div className={`w-px h-3.5 ${isDark ? 'bg-[rgba(30,48,72,0.6)]' : 'bg-slate-200'}`} />
      <div className="flex items-center gap-1.5">
        <span className="font-semibold">{timeState.date}</span>
      </div>
    </div>
  );

  // â”€â”€ Browser fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!APP_CONFIG.isTauri) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-12 px-4 border-b transition-colors duration-200 ${barBg}`}>
        <LeftContent />
        <DateTimeWidget />
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

  // â”€â”€ Full Tauri titlebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      <DateTimeWidget />

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

