import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';
import { Building2, CalendarRange, Check, ChevronDown } from 'lucide-react';

export const TopFilterBar: React.FC = () => {
  const { settings, activeFY, setActiveFY, fyOptions, companies, activeCompanyId, switchCompany } = useApp();
  const toast = useToast();

  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const coName = activeCompany?.company.name || settings.company.name;

  // Pending selections (not applied yet)
  const [pendingFY, setPendingFY] = useState(activeFY);
  const [pendingCompanyId, setPendingCompanyId] = useState(activeCompanyId);

  // Sync when external values change
  useEffect(() => { setPendingFY(activeFY); }, [activeFY]);
  useEffect(() => { setPendingCompanyId(activeCompanyId); }, [activeCompanyId]);

  const hasChanges = pendingFY !== activeFY || pendingCompanyId !== activeCompanyId;

  // Dropdown state
  const [companyOpen, setCompanyOpen] = useState(false);
  const [fyOpen, setFyOpen] = useState(false);
  const [companyRect, setCompanyRect] = useState<DOMRect | null>(null);
  const [fyRect, setFyRect] = useState<DOMRect | null>(null);
  const companyBtnRef = useRef<HTMLButtonElement>(null);
  const fyBtnRef = useRef<HTMLButtonElement>(null);

  const updateRects = useCallback(() => {
    if (companyBtnRef.current && companyOpen) setCompanyRect(companyBtnRef.current.getBoundingClientRect());
    if (fyBtnRef.current && fyOpen) setFyRect(fyBtnRef.current.getBoundingClientRect());
  }, [companyOpen, fyOpen]);

  useEffect(() => {
    if (companyOpen || fyOpen) {
      updateRects();
      window.addEventListener('scroll', updateRects, true);
      window.addEventListener('resize', updateRects);
      return () => { window.removeEventListener('scroll', updateRects, true); window.removeEventListener('resize', updateRects); };
    }
  }, [companyOpen, fyOpen, updateRects]);

  // Close on outside click
  useEffect(() => {
    if (!companyOpen && !fyOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (companyOpen && companyBtnRef.current && !companyBtnRef.current.contains(t)) {
        const portal = document.getElementById('co-dropdown-portal');
        if (!portal?.contains(t)) setCompanyOpen(false);
      }
      if (fyOpen && fyBtnRef.current && !fyBtnRef.current.contains(t)) {
        const portal = document.getElementById('fy-dropdown-portal');
        if (!portal?.contains(t)) setFyOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [companyOpen, fyOpen]);

  const handleApply = () => {
    if (pendingCompanyId !== activeCompanyId) switchCompany(pendingCompanyId);
    if (pendingFY !== activeFY) setActiveFY(pendingFY);
    const newCoName = companies.find(c => c.id === pendingCompanyId)?.company.name || coName;
    toast.success('Filters Applied', `${newCoName} — FY ${fyLabel(pendingFY)}`);
    setCompanyOpen(false);
    setFyOpen(false);
  };

  const fyLabel = (fy: string) => `FY ${fy.split('-')[0]}-${fy.split('-')[1]}`;
  const pendingCoName = companies.find(c => c.id === pendingCompanyId)?.company.name || coName;

  return (
    <div className="dark:bg-slate-900/80 bg-white/80 backdrop-blur-xl border dark:border-slate-800 border-slate-200 rounded-xl shadow-sm px-4 py-2.5 flex items-center justify-between gap-3 no-print mb-6 relative z-30">
      <div className="flex items-center gap-2.5 flex-wrap">

        {/* ── Company Selector ──────────────────── */}
        <div className="relative">
          <button
            ref={companyBtnRef}
            onClick={() => { setCompanyOpen(!companyOpen); setFyOpen(false); updateRects(); }}
            className={`flex items-center space-x-2 dark:bg-slate-950 bg-slate-50 border rounded-lg px-3 py-[7px] text-xs font-semibold dark:text-white text-slate-900 transition-all cursor-pointer shadow-sm min-w-[160px] ${
              companyOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : pendingCompanyId !== activeCompanyId ? 'border-amber-500 dark:border-amber-500' : 'dark:border-slate-700/80 border-slate-300 dark:hover:border-emerald-500/60 hover:border-emerald-500/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 dark:text-emerald-400 text-emerald-600 shrink-0" />
            <span className="truncate flex-1 text-left">{pendingCoName}</span>
            <ChevronDown className={`w-3.5 h-3.5 dark:text-slate-500 text-slate-400 shrink-0 transition-transform duration-200 ${companyOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Company Dropdown (Portal) */}
          {companyOpen && companyRect && createPortal(
            <div
              id="co-dropdown-portal"
              style={{ position: 'fixed', top: companyRect.bottom + 6, left: companyRect.left, width: Math.max(companyRect.width, 240), zIndex: 999999 }}
              className="dark:bg-slate-950 bg-white border dark:border-slate-800 border-slate-200 rounded-xl shadow-2xl dark:shadow-black/50 overflow-hidden animate-scale-in"
            >
              <div className="p-1.5 max-h-64 overflow-y-auto">
                {companies.map(c => {
                  const isSelected = c.id === pendingCompanyId;
                  const initials = c.company.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <button key={c.id} onClick={() => { setPendingCompanyId(c.id); setCompanyOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected ? 'dark:bg-emerald-500/10 bg-emerald-50 font-bold' : 'dark:hover:bg-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${isSelected ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950' : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600'}`}>{initials}</div>
                        <div className="text-left">
                          <div className={`truncate font-semibold ${isSelected ? 'dark:text-emerald-400 text-emerald-700' : 'dark:text-white text-slate-900'}`}>{c.company.name}</div>
                          <div className="text-[10px] dark:text-slate-500 text-slate-400 font-normal truncate">{c.company.phone || c.city || 'Company'}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 border-t dark:border-slate-800 border-slate-100 text-[10px] dark:text-slate-500 text-slate-400 font-medium">
                {companies.length} company{companies.length > 1 ? 'ies' : ''} · Manage in Settings
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* ── Financial Year Selector ──────────── */}
        <div className="relative">
          <button
            ref={fyBtnRef}
            onClick={() => { setFyOpen(!fyOpen); setCompanyOpen(false); updateRects(); }}
            className={`flex items-center space-x-2 dark:bg-slate-950 bg-slate-50 border rounded-lg px-3 py-[7px] text-xs font-semibold dark:text-white text-slate-900 transition-all cursor-pointer shadow-sm min-w-[130px] ${
              fyOpen ? 'border-cyan-500 ring-2 ring-cyan-500/20' : pendingFY !== activeFY ? 'border-amber-500 dark:border-amber-500' : 'dark:border-slate-700/80 border-slate-300 dark:hover:border-cyan-500/60 hover:border-cyan-500/60'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 dark:text-cyan-400 text-cyan-600 shrink-0" />
            <span className="truncate flex-1 text-left font-mono">{fyLabel(pendingFY)}</span>
            <ChevronDown className={`w-3.5 h-3.5 dark:text-slate-500 text-slate-400 shrink-0 transition-transform duration-200 ${fyOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* FY Dropdown (Portal) */}
          {fyOpen && fyRect && createPortal(
            <div
              id="fy-dropdown-portal"
              style={{ position: 'fixed', top: fyRect.bottom + 6, left: fyRect.left, width: Math.max(fyRect.width, 180), zIndex: 999999 }}
              className="dark:bg-slate-950 bg-white border dark:border-slate-800 border-slate-200 rounded-xl shadow-2xl dark:shadow-black/50 overflow-hidden animate-scale-in"
            >
              <div className="p-1.5 max-h-52 overflow-y-auto">
                {fyOptions.map(fy => {
                  const isSelected = fy === pendingFY;
                  return (
                    <button key={fy} onClick={() => { setPendingFY(fy); setFyOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected ? 'dark:bg-cyan-500/10 bg-cyan-50 text-cyan-700 dark:text-cyan-400 font-bold' : 'dark:text-slate-300 text-slate-700 dark:hover:bg-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CalendarRange className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-500' : 'dark:text-slate-500 text-slate-400'}`} />
                        <span className="font-mono">{fyLabel(fy)}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 border-t dark:border-slate-800 border-slate-100 text-[10px] dark:text-slate-500 text-slate-400 font-medium">
                FY starts {settings.financial.financialYearStart} · Settings → Financial
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* ── Apply Button (only when changes pending) ── */}
        {hasChanges && (
          <button
            onClick={handleApply}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-[7px] rounded-lg text-xs font-bold shadow-sm shadow-emerald-500/15 cursor-pointer transition-all animate-scale-in"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Apply</span>
          </button>
        )}
      </div>

      {/* Right: Status */}
      <div className="hidden md:flex items-center space-x-2 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-bold dark:text-slate-500 text-slate-400 uppercase tracking-wider font-mono">
          {fyLabel(activeFY)}
        </span>
      </div>
    </div>
  );
};
