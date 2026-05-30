/**
 * layouts/AuthLayout.tsx
 * Layout wrapper for public/auth routes (login, setup, forgot-password, etc.)
 *
 * Provides a centred card layout with the app branding.
 * Swap the visual design here without touching individual auth pages.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { BackgroundLayers, ErpIcon } from '@/components/router/StartupTheme';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060d18] flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundLayers />

      <div className="relative w-full max-w-md z-10">
        {/* Brand header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-6 relative">
            <div
              className="absolute -inset-2 rounded-3xl opacity-20 animate-pulse"
              style={{
                background: "linear-gradient(135deg,#00c896,#00aeef)",
              }}
            />
            <div
              className="h-16 w-16 rounded-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center transform rotate-12"
              style={{
                boxShadow: "0 10px 25px rgba(0,174,239,0.15), 0 4px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#00c896 0%,#00aeef 100%)",
                  boxShadow: "0 4px 10px rgba(0,174,239,0.3)",
                }}
              >
                <ErpIcon className="w-[18px] h-[18px]" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            ASZ Nexus ERP
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
            Smart Billing & Trading Management System
          </p>
        </div>

        {/* Page content injected here */}
        <div className="bg-white/80 dark:bg-[#131e30]/90 backdrop-blur-xl border border-slate-200 dark:border-[#1e3048] rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
