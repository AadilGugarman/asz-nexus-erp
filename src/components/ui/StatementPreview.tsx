import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Download, Share2, FileText } from "lucide-react";

import { useApp } from "@/context/useApp";
import { useAppearance } from "@/hooks";

import { useToast } from "./Toast";
import { printElement } from "@/utils/print";

import { fmtDate } from "@/utils/format";

/** Generate up to 3 initials, skipping filler words */
const getInitials = (name: string): string => {
  const skip = new Set([
    "and",
    "&",
    "of",
    "the",
    "a",
    "an",
    "co",
    "ltd",
    "pvt",
    "llp",
  ]);
  return name
    .split(/\s+/)
    .filter((w) => w && !skip.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .slice(0, 3)
    .join("");
};

/** Dynamic font size for initials badge */
const initialsFontSize = (initials: string, size: number) => {
  const len = initials.length;
  if (len <= 1) return Math.round(size * 0.48);
  if (len === 2) return Math.round(size * 0.38);
  if (len === 3) return Math.round(size * 0.3);
  return Math.round(size * 0.24);
};

interface StatementPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accentColor?: string;
}

export const StatementPreview: React.FC<StatementPreviewProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  accentColor,
}) => {
  const { settings } = useApp();
  const { accentColor: globalAccent } = useAppearance();
  const toast = useToast();
  const cs = settings.company;
  const color =
    accentColor || globalAccent || settings.invoice.brandColor || "#4f46e5";
  const paperRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (paperRef.current) printElement(paperRef.current);
    else window.print();
  };
  const handleDownload = () => {
    if (paperRef.current) printElement(paperRef.current);
    else window.print();
    toast.info(
      "Save as PDF",
      'Select "Save as PDF" as destination in print dialog.',
    );
  };
  const handleShare = () => {
    const contacts = [cs.phone, cs.phone2, cs.phone3]
      .filter(Boolean)
      .join(" / ");
    const msg = encodeURIComponent(
      `${title}\nFrom: ${cs.name}\nPhones: ${contacts}\n${cs.email}`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return createPortal(
    <div className="fixed inset-0 z-99999 overflow-y-auto animate-fade-in custom-scrollbar">
      <div className="min-h-screen dark:bg-slate-950/90 bg-slate-200/90 backdrop-blur-md flex flex-col items-center py-6 sm:py-10 px-4">
        {/* ── Action Bar ────────────────────────────── */}
        <div className="w-full max-w-[850px] mb-4 flex items-center justify-between animate-slide-down">
          <div className="flex items-center space-x-3">
            <div
              className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"
              style={{ color }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold dark:text-white text-slate-900">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] dark:text-slate-400 text-slate-600 font-mono">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg cursor-pointer transition-all"
              style={{ backgroundColor: color }}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 dark:bg-slate-800 bg-white dark:text-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-all border dark:border-slate-700 border-slate-200 dark:hover:bg-slate-700 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 dark:bg-slate-800 bg-white dark:text-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-all border dark:border-slate-700 border-slate-200 dark:hover:bg-slate-700 hover:bg-slate-50"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 dark:bg-slate-800 bg-white rounded-xl cursor-pointer transition-all border dark:border-slate-700 border-slate-200 shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── A4 Paper ──────────────────────────────── */}
        <div
          ref={paperRef}
          className="w-full max-w-[850px] bg-white rounded-xl shadow-2xl dark:shadow-black/40 shadow-slate-400/20 overflow-hidden border border-slate-200/50 dark:border-slate-700/30 printable-patti animate-slide-up"
        >
          <div className="p-8 sm:p-12 max-w-[780px] mx-auto font-[system-ui,-apple-system,sans-serif] text-[13px] leading-relaxed text-slate-900">
            {/* ── Document Header ──────────────────── */}
            <div
              className="flex justify-between items-start pb-5 mb-6"
              style={{ borderBottom: `3px solid ${color}` }}
            >
              <div className="max-w-[55%]">
                <div className="flex items-center space-x-3 mb-1">
                  {cs.logo ? (
                    <img
                      src={cs.logo}
                      alt={cs.name}
                      className="h-9 max-w-[90px] object-contain shrink-0"
                    />
                  ) : (
                    <div
                      className="shrink-0 rounded-xl text-white font-black select-none overflow-hidden flex items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                        fontSize: `${initialsFontSize(getInitials(cs.name) || cs.name.slice(0, 2).toUpperCase(), 36)}px`,
                        lineHeight: 1,
                        letterSpacing:
                          (
                            getInitials(cs.name) ||
                            cs.name.slice(0, 2).toUpperCase()
                          ).length >= 3
                            ? "0.04em"
                            : "0.02em",
                      }}
                    >
                      {getInitials(cs.name) ||
                        cs.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h1 className="text-[22px] font-black tracking-tight text-slate-950 leading-none">
                    {cs.name.toUpperCase()}
                  </h1>
                </div>
                <p className="text-[10px] font-bold text-slate-500 mt-1 tracking-[0.12em] uppercase">
                  {cs.tagline}
                </p>
                <div className="mt-2 text-[10px] text-slate-500 leading-[1.6] space-y-0.5">
                  <p>{cs.address}</p>
                  <p>
                    Phone: {cs.phone} - Email: {cs.email}
                  </p>
                  {cs.gstin && (
                    <p className="font-mono font-semibold text-slate-600">
                      GSTIN: {cs.gstin}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-6">
                <div
                  className="inline-block px-4 py-3 rounded-lg border-2"
                  style={{ borderColor: color, backgroundColor: color + "08" }}
                >
                  <div
                    className="text-[8px] font-black tracking-[0.2em] uppercase"
                    style={{ color }}
                  >
                    {title}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1 font-semibold">
                    {fmtDate(new Date().toISOString().split("T")[0])}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Content (injected) ──────────────── */}
            {children}

            {/* ── Footer ──────────────────────────── */}
            <div className="mt-12 pt-3 border-t border-slate-200 text-center text-[8.5px] text-slate-400 font-mono">
              Computer generated statement - {cs.name}
            </div>
          </div>
        </div>

        <div className="h-8 shrink-0" />
      </div>
    </div>,
    document.body,
  );
};
