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
    <div className="bg-white/90 backdrop-blur-xl border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.05)] px-4 py-2.5 flex items-center justify-between gap-3 no-print mb-6 relative z-30">
      <div className="flex items-center gap-2.5 flex-wrap">

        {/* ── Company Selector ──────────────────── */}
        <div className="relative">
          <button
            ref={companyBtnRef}
            onClick={() => { setCompanyOpen(!companyOpen); setFyOpen(false); updateRects(); }}
            className={`flex items-center space-x-2 bg-white border rounded-xl px-3 py-[9px] text-xs font-medium text-[#0f172a] transition-all cursor-pointer shadow-sm min-w-[180px] ${
              companyOpen ? 'border-[#00c896] ring-2 ring-[#00c896]/20' : pendingCompanyId !== activeCompanyId ? 'border-amber-500' : 'border-[#dbe4ef] hover:border-[#00c896]/60'
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
              className="bg-white border border-[#e2e8f0] rounded-xl shadow-[0_12px_36px_rgba(15,23,42,0.1)] overflow-hidden animate-scale-in"
            >
              <div className="p-1.5 max-h-64 overflow-y-auto">
                {companies.map(c => {
                  const isSelected = c.id === pendingCompanyId;
                  // Utility to generate company initials (max 3, skip common words)
                  const getCompanyInitials = (name: string) => {
                    const skip = ["and", "&", "of", "the"];
                    return name
                      .split(/\s+/)
                      .filter(w => w && !skip.includes(w.toLowerCase()))
                      .map(w => w[0])
                      .join('')
                      .slice(0, 3)
                      .toUpperCase();
                  };
                  const initials = getCompanyInitials(c.company.name);
                  return (
                    <button key={c.id} onClick={() => { setPendingCompanyId(c.id); setCompanyOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected ? 'bg-[rgba(0,200,150,0.12)] font-semibold' : 'hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 ${isSelected ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white' : 'bg-[#f1f5f9] text-[#64748b]'}`}>{initials}</div>
                        <div className="text-left">
                          <div className={`truncate font-semibold ${isSelected ? 'text-[#0f766e]' : 'text-[#0f172a]'}`}>{c.company.name}</div>
                          <div className="text-[10px] text-[#94a3b8] font-normal truncate">{c.company.phone || c.city || 'Company'}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00c896] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 border-t border-[#edf2f7] text-[10px] text-[#94a3b8] font-medium">
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
            className={`flex items-center space-x-2 bg-white border rounded-xl px-3 py-[9px] text-xs font-medium text-[#0f172a] transition-all cursor-pointer shadow-sm min-w-[140px] ${
              fyOpen ? 'border-[#00aeef] ring-2 ring-[#00aeef]/20' : pendingFY !== activeFY ? 'border-amber-500' : 'border-[#dbe4ef] hover:border-[#00aeef]/60'
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
              className="bg-white border border-[#e2e8f0] rounded-xl shadow-[0_12px_36px_rgba(15,23,42,0.1)] overflow-hidden animate-scale-in"
            >
              <div className="p-1.5 max-h-52 overflow-y-auto">
                {fyOptions.map(fy => {
                  const isSelected = fy === pendingFY;
                  return (
                    <button key={fy} onClick={() => { setPendingFY(fy); setFyOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected ? 'bg-[rgba(0,174,239,0.12)] text-[#0369a1] font-semibold' : 'text-[#334155] hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CalendarRange className={`w-3.5 h-3.5 ${isSelected ? 'text-[#00aeef]' : 'text-[#94a3b8]'}`} />
                        <span className="font-mono">{fyLabel(fy)}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00aeef] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 border-t border-[#edf2f7] text-[10px] text-[#94a3b8] font-medium">
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
        <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider font-mono">
          {fyLabel(activeFY)}
        </span>
      </div>
    </div>
  );
};
