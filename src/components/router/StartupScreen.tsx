/**
 * components/router/StartupScreen.tsx
 *
 * Design:
 *  - Background: teal/cyan blobs + dot grid (radial 1px, 28px) + square grid overlay
 *  - Previous style: white rotated card, spinner badge, step dots
 *  - Smooth animated progress bar — driven by internal timer, not just store steps
 *    so it always feels natural and never jumps or cuts off early
 *  - Screen stays until progress reaches 100% AND real startup is done
 *  - Error state with retry
 */

import React, { useMemo, useEffect, useState, useRef } from "react";
import { useStartupStore } from "@/store";

// ── Step map ──────────────────────────────────────────────────────────────────
// Each step has a target progress % — the bar animates toward it smoothly.
const STEP_MAP: { match: string; target: number; label: string }[] = [
  { match: "Preparing", target: 4, label: "Setting Up Your Workspace…" },
  {
    match: "Initializing database",
    target: 18,
    label: "Connecting to Database…",
  },
  { match: "Database connected", target: 32, label: "Database Ready" },
  { match: "Database unavailable", target: 32, label: "Using Local Storage" },
  {
    match: "Restoring preferences",
    target: 48,
    label: "Restoring Your Preferences…",
  },
  { match: "Verifying company", target: 64, label: "Loading Company Data…" },
  { match: "Checking security", target: 85, label: "Verifying Your Session…" },
  { match: "Ready", target: 100, label: "Workspace Ready" },
];
const TOTAL_DOTS = 6;

function resolveStep(msg: string): { target: number; label: string } {
  return (
    STEP_MAP.find((s) => msg.includes(s.match)) ?? {
      target: 4,
      label: "Setting Up Your Workspace…",
    }
  );
}

// ── ERP Icon ──────────────────────────────────────────────────────────────────
const ErpIcon: React.FC<{ error?: boolean }> = ({ error }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-[22px] h-[22px]"
    aria-hidden="true"
  >
    {error ? (
      <>
        <rect x="18" y="10" width="4" height="14" rx="2" fill="white" />
        <rect x="18" y="28" width="4" height="4" rx="2" fill="white" />
      </>
    ) : (
      <>
        <rect
          x="5"
          y="26"
          width="6"
          height="9"
          rx="1.5"
          fill="white"
          opacity="0.9"
          style={{
            transformOrigin: "8px 35px",
            animation: "erpBar1 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.3s  both",
          }}
        />
        <rect
          x="17"
          y="20"
          width="6"
          height="15"
          rx="1.5"
          fill="white"
          opacity="0.9"
          style={{
            transformOrigin: "20px 35px",
            animation: "erpBar2 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.55s both",
          }}
        />
        <rect
          x="29"
          y="13"
          width="6"
          height="22"
          rx="1.5"
          fill="white"
          opacity="0.9"
          style={{
            transformOrigin: "32px 35px",
            animation: "erpBar3 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.8s  both",
          }}
        />
        <polyline
          points="8,26 20,18 32,11"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
          style={{
            strokeDasharray: 32,
            strokeDashoffset: 32,
            animation: "erpLine 0.9s ease-out 1.3s forwards",
          }}
        />
        <circle
          cx="32"
          cy="11"
          r="2.5"
          fill="white"
          style={{
            opacity: 0,
            animation: "erpDot 0.4s ease-out 2.1s forwards",
          }}
        />
      </>
    )}
    <style>{`
      @keyframes erpBar1 { from { transform:scaleY(0); opacity:0 } to { transform:scaleY(1); opacity:0.9 } }
      @keyframes erpBar2 { from { transform:scaleY(0); opacity:0 } to { transform:scaleY(1); opacity:0.9 } }
      @keyframes erpBar3 { from { transform:scaleY(0); opacity:0 } to { transform:scaleY(1); opacity:0.9 } }
      @keyframes erpLine { to { stroke-dashoffset:0 } }
      @keyframes erpDot  { to { opacity:1 } }
    `}</style>
  </svg>
);

// ── Smooth progress hook ──────────────────────────────────────────────────────
// Single stable rAF loop — never restarts, never resets timing.
// Uses refs for all mutable state so the loop function never needs to change.
//
// Behaviour:
//   • Constant speed of 30% per second — bar always visibly travels left→right
//   • Never goes backward
//   • Caps at 95% until isReady, then releases to 100%
//   • Returns display value (0-100) and completed flag
function useSmoothProgress(
  targetPct: number,
  isReady: boolean,
  isError: boolean,
) {
  const [display, setDisplay] = useState(0);

  // All mutable state in refs so the rAF callback is stable
  const stateRef = useRef({
    display: 0,
    targetPct,
    isReady,
    isError,
    lastTime: null as number | null,
    rafId: null as number | null,
  });

  // Keep refs in sync with latest props every render
  stateRef.current.targetPct = targetPct;
  stateRef.current.isReady = isReady;
  stateRef.current.isError = isError;

  // Start the loop once on mount — never restart it
  useEffect(() => {
    const loop = (now: number) => {
      const s = stateRef.current;

      if (s.isError) {
        s.display = 0;
        s.lastTime = null;
        setDisplay(0);
        s.rafId = requestAnimationFrame(loop);
        return;
      }

      if (s.lastTime === null) s.lastTime = now;
      const dt = Math.min(now - s.lastTime, 100); // clamp for tab-hidden spikes
      s.lastTime = now;

      const cap = s.isReady ? 100 : 95;
      const goal = Math.min(s.targetPct, cap);

      if (s.display < goal) {
        // Constant 40%/s — always visibly moving, never stalls
        const delta = (40 * dt) / 1000;
        s.display = Math.min(s.display + delta, goal);
        setDisplay(s.display);
      }

      s.rafId = requestAnimationFrame(loop);
    };

    stateRef.current.rafId = requestAnimationFrame(loop);
    return () => {
      if (stateRef.current.rafId !== null) {
        cancelAnimationFrame(stateRef.current.rafId);
      }
    };
  }, []); // ← empty deps: loop starts once, reads latest values via ref

  const completed = display >= 99.5;
  return { display, completed };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StartupScreenProps {
  message?: string;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({
  message: msgProp,
}) => {
  const storeMessage = useStartupStore((s) => s.message);
  const phase = useStartupStore((s) => s.phase);
  const storeError = useStartupStore((s) => s.error);
  const retry = useStartupStore((s) => s.retry);
  const signalUiReady = useStartupStore((s) => s.signalUiReady);

  const message = msgProp ?? storeMessage;
  const isError = phase === "error";
  const isReady = phase === "ready";

  const { target, label } = useMemo(() => resolveStep(message), [message]);
  const { display, completed } = useSmoothProgress(target, isReady, isError);

  // Dot step index — derived from display progress
  const dotStep = Math.floor((display / 100) * TOTAL_DOTS);

  // Mount fade-in — start visible immediately to avoid blank flash.
  // The HTML initial-loader fades out as React mounts, so we must be
  // visible from frame 0 to prevent any gap between the two.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    // No-op: kept for future use if a fade-in is ever needed
    setVisible(true);
  }, []);

  // When bar visually reaches 100%, wait 300ms then signal the store.
  // The store flips uiReady → true, which unblocks all route guards.
  useEffect(() => {
    if (completed && isReady) {
      const id = setTimeout(() => {
        // Guard: signalUiReady may not exist on older cached store instances
        if (typeof signalUiReady === "function") signalUiReady();
      }, 300);
      return () => clearTimeout(id);
    }
  }, [completed, isReady, signalUiReady]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden
        bg-slate-50 dark:bg-[#060d18]
        ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {/* ── Background layers ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Layer 1 — teal/cyan blobs */}
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,174,239,0.20) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,200,150,0.20) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,174,239,0.08) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />

        {/* Layer 2 — dot grid (radial 1px dots, 28px spacing, 35% opacity) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(0,174,239,0.22) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.35,
          }}
        />

        {/* Layer 3 — square/line grid (1px lines, 28px spacing, 8% opacity) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            linear-gradient(rgba(0,174,239,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,174,239,0.12) 1px, transparent 1px)
          `,
            backgroundSize: "28px 28px",
            opacity: 0.45,
          }}
        />
      </div>

      {/* ── Content ── */}
      <div
        className={`relative z-10 w-full max-w-[320px] mx-auto flex flex-col items-center
          transition-all duration-500 ease-out
          ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
      >
        {/* Logo tile */}
        <div className="mb-8 relative">
          {!isError && (
            <div
              className="absolute -inset-3 rounded-4xl opacity-0 animate-ping"
              style={{
                background: "linear-gradient(135deg,#00c896,#00aeef)",
                animationDuration: "2.6s",
                animationDelay: "0.8s",
                animationFillMode: "both",
              }}
            />
          )}
          <div
            className={`h-20 w-20 rounded-3xl bg-white border shadow-xl flex items-center justify-center
              transform transition-transform duration-500
              ${isError ? "border-red-200 rotate-0" : "border-slate-200 rotate-12 hover:rotate-0"}`}
            style={
              isError
                ? {}
                : {
                    boxShadow:
                      "0 20px 50px rgba(0,174,239,0.2), 0 8px 20px rgba(0,0,0,0.08)",
                  }
            }
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={
                isError
                  ? {
                      background: "#ef4444",
                      boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                    }
                  : {
                      background:
                        "linear-gradient(135deg,#00c896 0%,#00aeef 100%)",
                      boxShadow: "0 4px 14px rgba(0,174,239,0.4)",
                    }
              }
            >
              <ErpIcon error={isError} />
            </div>
          </div>
          {!isError && (
            <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white border border-slate-100 shadow-md flex items-center justify-center">
              <div
                className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: "#00aeef",
                  borderTopColor: "transparent",
                }}
              />
            </div>
          )}
        </div>

        {/* App name */}
        <div className="text-center space-y-1.5 mb-12">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            ASZ Nexus ERP
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            Smart Billing &amp; Trading Management System
          </p>
        </div>

        {/* Error state */}
        {isError ? (
          <div className="w-full space-y-3">
            <div className="rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">
                Startup failed
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 leading-relaxed">
                {storeError ?? "An unexpected error occurred. Please retry."}
              </p>
            </div>
            <button
              onClick={() => void retry()}
              className="w-full py-2.5 rounded-2xl text-white text-sm font-bold tracking-wide
                transition-all duration-200 hover:brightness-110 active:scale-[0.98]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00aeef]"
              style={{
                background: "linear-gradient(135deg,#00c896 0%,#00aeef 100%)",
                boxShadow: "0 8px 24px rgba(0,174,239,0.3)",
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {/* Label + version */}
            <div className="flex justify-between items-end mb-1 px-0.5">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#00aeef" }}
              >
                {label}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest">
                v1.0.0
              </span>
            </div>

            {/* Smooth progress bar */}
            <div
              role="progressbar"
              aria-valuenow={Math.round(display)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Application loading progress"
              className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner"
            >
              <div
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  width: `${display}%`,
                  background: "linear-gradient(90deg, #00c896, #00aeef)",
                  boxShadow: "0 0 10px rgba(0,174,239,0.6)",
                  // No CSS transition — rAF loop drives it directly
                }}
              >
                {/* Shimmer sweep on the filled bar */}
                <div
                  className="absolute inset-0 animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>
            </div>

            {/* Step dots */}
            <div
              className="flex justify-center gap-1.5 pt-1"
              aria-hidden="true"
            >
              {Array.from({ length: TOTAL_DOTS }, (_, i) => {
                const done = i < dotStep;
                const current = i === dotStep;
                return (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: current ? "18px" : "7px",
                      height: "7px",
                      background:
                        done || current
                          ? "linear-gradient(90deg,#00c896,#00aeef)"
                          : undefined,
                      backgroundColor:
                        done || current ? undefined : "rgb(203 213 225)",
                      opacity: done ? 0.6 : 1,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
