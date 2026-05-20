/**
 * layouts/AuthLayout.tsx
 * Layout wrapper for public/auth routes (login, setup, forgot-password, etc.)
 *
 * Provides a centred card layout with the app branding.
 * Swap the visual design here without touching individual auth pages.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(var(--primary-rgb) / 0.35) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--primary-rgb) / 0.35) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <span className="text-2xl font-bold text-emerald-400">T</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            TFC ERP
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Fruit Commission Management
          </p>
        </div>

        {/* Page content injected here */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
