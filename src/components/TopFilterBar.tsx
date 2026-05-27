import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/context/AppContext";
import { useToast } from "./ui/Toast";
import { Building2, CalendarRange, Check, ChevronDown } from "lucide-react";


export const TopFilterBar: React.FC = () => {
  const {
    settings,
    activeFY,
    setActiveFY,
    fyOptions,
    companies,
    activeCompanyId,
    switchCompany,
  } = useApp();
  const toast = useToast();

  const activeCompany = companies.find((c) => c.id === activeCompanyId);
  const coName =
    activeCompany?.company?.name || settings.company?.name || "My Company";

  // Derive FY start month label from the active company's config
  const fyStartMonthLabel = useMemo(() => {
    const fyStartMD = activeCompany?.financial?.financialYearStart
      ?? settings.financial?.financialYearStart
      ?? "04-01";
    const [monthStr] = fyStartMD.split("-");
    const month = parseInt(monthStr, 10);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[(month - 1) % 12] ?? "Apr";
  }, [activeCompany, settings.financial?.financialYearStart]);

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
     const newCoName = companies.find(c => c.id === pendingCompanyId)?.company?.name || coName;
    toast.success('Filters Applied', `${newCoName} — FY ${fyLabel(pendingFY)}`);
    setCompanyOpen(false);
    setFyOpen(false);
  };

  const fyLabel = (fy: string) => `FY ${fy.split('-')[0]}-${fy.split('-')[1]}`;
  const pendingCoName = companies.find(c => c.id === pendingCompanyId)?.company?.name || coName;

  return (
    <div className="dark:bg-[var(--card-bg)] bg-white/95 backdrop-blur-xl dark:border-[var(--card-border)] border border-[#dde3ec] rounded-2xl shadow-[0_4px_16px_rgba(10,20,40,0.07)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)] px-4 py-2.5 flex items-center justify-between gap-3 no-print mb-6 relative z-30">
      <div className="flex items-center gap-2.5 flex-wrap">

        {/* ── Company Selector ──────────────────── */}
        <div className="relative">
          <button
            ref={companyBtnRef}
            onClick={() => { setCompanyOpen(!companyOpen); setFyOpen(false); updateRects(); }}
            className={`flex items-center space-x-2 dark:bg-[var(--input-bg)] bg-white dark:border-[var(--input-border)] border rounded-xl px-3 py-[9px] text-xs font-medium dark:text-[var(--text-primary)] text-[#0d1b2e] transition-all cursor-pointer shadow-sm min-w-[180px] ${
              companyOpen ? 'border-[#00c896] ring-2 ring-[#00c896]/20' : pendingCompanyId !== activeCompanyId ? 'border-amber-500' : 'dark:hover:border-[#00c896]/60 hover:border-[#00c896]/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#00c896] shrink-0" />
            <span className="truncate flex-1 text-left">{pendingCoName}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] shrink-0 transition-transform duration-200 ${companyOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Company Dropdown (Portal) */}
          {companyOpen && companyRect && createPortal(
            <div
              id="co-dropdown-portal"
              style={{ position: 'fixed', top: companyRect.bottom + 6, left: companyRect.left, width: Math.max(companyRect.width, 240), zIndex: 999999 }}
              className="dark:bg-[#131e30] bg-white dark:border-[#1e3048] border border-[#dde3ec] rounded-xl shadow-[0_12px_36px_rgba(10,20,40,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] overflow-hidden animate-scale-in"
            >
              <div className="p-1.5 max-h-64 overflow-y-auto">
                {companies.map(c => {
                  const isSelected = c.id === pendingCompanyId;
                  const getCompanyInitials = (name: string) => {
                    const skip = ["and", "&", "of", "the"];
                    return name.split(/\s+/).filter(w => w && !skip.includes(w.toLowerCase())).map(w => w[0]).join('').slice(0, 3).toUpperCase();
                  };
                  const initials = getCompanyInitials(c.company.name);
                  return (
                    <button key={c.id} onClick={() => { setPendingCompanyId(c.id); setCompanyOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected ? 'bg-[rgba(0,200,150,0.12)] font-semibold' : 'dark:hover:bg-[#1a2d45] hover:bg-[#f0f4f8]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 overflow-hidden ${isSelected ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white' : 'dark:bg-[#1e3048] dark:text-[#94b4d4] bg-[#f0f4f8] text-[#5e7490]'}`}
                          style={{
                            fontSize: initials.length <= 1 ? '13px' : initials.length === 2 ? '10px' : '8px',
                            lineHeight: 1,
                            letterSpacing: initials.length >= 3 ? '0.03em' : '0.01em',
                          }}
                        >{initials}</div>
                        <div className="text-left">
                          <div className={`truncate font-semibold ${isSelected ? 'text-[#00c896]' : 'dark:text-[#e8f0fe] text-[#0d1b2e]'}`}>{c.company.name}</div>
                          <div className="text-[10px] dark:text-[#6a8aaa] text-[#5e7490] font-normal truncate">{c.company.phone || c.city || 'Company'}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00c896] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 dark:border-[#1e3048] border-t border-[#dde3ec] text-[10px] dark:text-[#6a8aaa] text-[#5e7490] font-medium">
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
            className={`flex items-center space-x-2 dark:bg-[var(--input-bg)] bg-white dark:border-[var(--input-border)] border rounded-xl px-3 py-[9px] text-xs font-medium dark:text-[var(--text-primary)] text-[#0d1b2e] transition-all cursor-pointer shadow-sm min-w-[140px] ${
              fyOpen ? 'border-[#00aeef] ring-2 ring-[#00aeef]/20' : pendingFY !== activeFY ? 'border-amber-500' : 'dark:hover:border-[#00aeef]/60 hover:border-[#00aeef]/60'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-[#00aeef] shrink-0" />
            <span className="truncate flex-1 text-left font-mono">{fyLabel(pendingFY)}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] shrink-0 transition-transform duration-200 ${fyOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* FY Dropdown (Portal) */}
          {fyOpen && fyRect && createPortal(
            <div
              id="fy-dropdown-portal"
              style={{ position: 'fixed', top: fyRect.bottom + 6, left: fyRect.left, width: Math.max(fyRect.width, 180), zIndex: 999999 }}
              className="dark:bg-[#131e30] bg-white dark:border-[#1e3048] border border-[#dde3ec] rounded-xl shadow-[0_12px_36px_rgba(10,20,40,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] overflow-hidden animate-scale-in"
            >
              <div className="p-1.5 max-h-52 overflow-y-auto">
                {fyOptions.map(fy => {
                  const isSelected = fy === pendingFY;
                  return (
                    <button key={fy} onClick={() => { setPendingFY(fy); setFyOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected ? 'bg-[rgba(0,174,239,0.12)] text-[#00aeef]' : 'dark:text-[#94b4d4] text-[#3d5166] dark:hover:bg-[#1a2d45] hover:bg-[#f0f4f8]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CalendarRange className={`w-3.5 h-3.5 ${isSelected ? 'text-[#00aeef]' : 'dark:text-[#6a8aaa] text-[#5e7490]'}`} />
                        <span className="font-mono">{fyLabel(fy)}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00aeef] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 dark:border-[#1e3048] border-t border-[#dde3ec] text-[10px] dark:text-[#6a8aaa] text-[#5e7490] font-medium">
                FY starts {fyStartMonthLabel} · Company-specific
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* ── Apply Button (only when changes pending) ── */}
        {hasChanges && (
          <button
            onClick={handleApply}
            className="flex items-center space-x-1.5 bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white px-3.5 py-[9px] rounded-xl text-xs font-semibold shadow-[0_8px_20px_rgba(0,174,239,0.22)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,174,239,0.28)] cursor-pointer transition-all animate-scale-in"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Apply</span>
          </button>
        )}
      </div>

      {/* Right: Status */}
      <div className="hidden md:flex items-center space-x-2 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00c896] animate-pulse" />
        <span className="text-[10px] font-semibold dark:text-[#6a8aaa] text-[#5e7490] uppercase tracking-wider font-mono">
          {fyLabel(activeFY)}
        </span>
      </div>
    </div>
  );
};
