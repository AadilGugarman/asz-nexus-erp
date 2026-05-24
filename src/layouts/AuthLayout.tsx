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
    <div className="min-h-screen bg-[#060d18] flex items-center justify-center p-4">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(var(--primary-rgb) / 0.4) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--primary-rgb) / 0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/12 border border-amber-500/25 mb-4">
            <span className="text-2xl font-bold text-amber-500">A</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            ASZ Nexus ERP
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Smart Billing & Trading Management System
          </p>
        </div>

        {/* Page content injected here */}
        <div className="bg-[#131e30] border border-[#1e3048] rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
