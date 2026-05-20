/**
 * pages/NotFoundPage.tsx
 * 404 page — rendered at /404 and for all unmatched routes.
 * No layout wrapper — standalone full-screen page.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
      {/* Error code */}
      <div className="text-8xl font-black text-slate-800 select-none leading-none">
        404
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-100">Page not found</h1>
        <p className="text-slate-500 max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm"
        >
          Go back
        </button>
        <button
          onClick={() => navigate(ROUTES.dashboard, { replace: true })}
          className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm font-medium"
        >
          Dashboard
        </button>
      </div>
    </div>
  );
};
