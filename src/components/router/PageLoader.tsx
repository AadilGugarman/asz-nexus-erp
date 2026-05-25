/**
 * components/router/PageLoader.tsx
 * Full-screen loader shown while lazy route chunks are fetching.
 * Used as the <Suspense> fallback in the router.
 *
 * Intentionally lighter than StartupScreen — this is a brief in-app
 * transition, not the initial boot. Matches the brand gradient.
 */

import React from 'react';

export const PageLoader: React.FC = () => (
  <div
    role="status"
    aria-label="Loading page"
    className="fixed inset-0 z-40 flex flex-col items-center justify-center
      bg-slate-50 dark:bg-[#060d18] overflow-hidden"
  >
    {/* Ambient glow — same as StartupScreen but lighter */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-20 dark:opacity-15"
        style={{ background: 'radial-gradient(circle, #00aeef44 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-20 dark:opacity-15"
        style={{ background: 'radial-gradient(circle, #00c89644 0%, transparent 70%)' }}
      />
    </div>

    <div className="relative z-10 flex flex-col items-center gap-5">
      {/* Spinner ring */}
      <div className="relative h-12 w-12">
        <svg className="animate-spin w-12 h-12" style={{ animationDuration: '1.1s' }} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          {/* Track */}
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3"
            className="text-slate-200 dark:text-slate-800" />
          {/* Arc */}
          <circle cx="24" cy="24" r="20" stroke="url(#loaderGrad)" strokeWidth="3"
            strokeLinecap="round" strokeDasharray="50 76" />
          <defs>
            <linearGradient id="loaderGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00c896" />
              <stop offset="1" stopColor="#00aeef" />
            </linearGradient>
          </defs>
        </svg>

        {/* Centre dot */}
        <div
          className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full"
          style={{ background: 'linear-gradient(135deg, #00c896, #00aeef)' }}
        />
      </div>

      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 animate-pulse-soft">
        Loading…
      </span>
    </div>
  </div>
);
