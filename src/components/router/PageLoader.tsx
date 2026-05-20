/**
 * components/router/PageLoader.tsx
 * Full-screen loading spinner shown while lazy route chunks are fetching.
 * Used as the <Suspense> fallback throughout the router.
 */

import React from 'react';

export const PageLoader: React.FC = () => (
  <div
    role="status"
    aria-label="Loading page"
    className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-4"
  >
    <div className="w-10 h-10 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-slate-400 text-sm tracking-wide">Loading…</span>
  </div>
);
