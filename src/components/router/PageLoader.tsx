/**
 * components/router/PageLoader.tsx
 * Full-screen loading spinner shown while lazy route chunks are fetching.
 * Used as the <Suspense> fallback throughout the router.
 */

import React from "react";

export const PageLoader: React.FC = () => (
  <div
    role="status"
    aria-label="Loading page"
    className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-6"
  >
    {/* Background patterns matching StartupScreen */}
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl" />
    </div>

    <div className="relative z-10 flex flex-col items-center">
      <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 shadow-md flex items-center justify-center mb-4">
        <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest animate-pulse">
        Loading...
      </span>
    </div>
  </div>
);
