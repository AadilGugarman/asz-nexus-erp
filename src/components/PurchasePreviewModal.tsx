import React, { useRef } from 'react';
import { PurchaseInvoice } from '../types';
import { X, Printer, FileText, MapPin, Phone, Building2, Mail } from 'lucide-react';
import { useApp } from '@/context/useApp';
import { fmtDate, sumCurrency, roundCurrency, getFruitPricingType } from '@/utils/format';
import { printElement } from '@/utils/print';

/** Generate up to 3 initials, skipping filler words */
const getInitials = (name: string): string => {
  const skip = new Set(['and', '&', 'of', 'the', 'a', 'an', 'co', 'ltd', 'pvt', 'llp']);
  return name
    .split(/\s+/)
    .filter(w => w && !skip.has(w.toLowerCase()))
    .map(w => w[0].toUpperCase())
    .slice(0, 3)
    .join('');
};

const initialsFontSize = (len: number, size: number): number => {
  if (len <= 1) return Math.round(size * 0.48);
  if (len === 2) return Math.round(size * 0.38);
  if (len === 3) return Math.round(size * 0.30);
  return Math.round(size * 0.24);
};

interface PurchasePreviewModalProps {
  invoice: PurchaseInvoice | null;
  onClose: () => void;
}

export const PurchasePreviewModal: React.FC<PurchasePreviewModalProps> = ({ invoice, onClose }) => {
  const { settings, suppliers } = useApp();
  const cs = settings.company;
  const paperRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const supplier = suppliers.find(s => s.id === invoice.supplierId || s.name === invoice.supplierName);

  const freight      = roundCurrency(Number(invoice.freight) || 0);
  const hamali       = roundCurrency(Number(invoice.hamali) || 0);
  const itemsSubtotal = sumCurrency(invoice.items.map(i => Number(i.amount) || 0));
  const netTotal     = roundCurrency(itemsSubtotal + freight + hamali);

  const handlePrint = () => {
    if (paperRef.current) printElement(paperRef.current);
    else window.print();
  };

  const ini = getInitials(cs.name) || cs.name.slice(0, 2).toUpperCase();
  const contacts = [cs.phone, cs.phone2, cs.phone3].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto animate-fade-in custom-scrollbar">
      <div className="min-h-screen dark:bg-slate-950/90 bg-slate-200/90 backdrop-blur-md flex flex-col items-center py-6 sm:py-12 px-3 sm:px-4">

        {/* ── Toolbar ─────────────────────────────── */}
        <div className="w-full max-w-[850px] mb-4 flex items-center justify-between animate-slide-down">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black dark:text-white text-slate-900 tracking-tight uppercase">
                Purchase Bill Preview
              </h3>
              <p className="text-[10px] dark:text-slate-400 text-slate-500 font-mono tracking-wider">
                {invoice.billNo} · {fmtDate(invoice.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" /><span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 dark:bg-slate-800 bg-white rounded-xl cursor-pointer transition-all border dark:border-slate-700 border-slate-200 shadow-sm active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ── Paper ───────────────────────────────── */}
        <div
          ref={paperRef}
          className="w-full max-w-[850px] bg-white rounded-xl shadow-2xl dark:shadow-black/60 shadow-slate-400/20 overflow-hidden border border-slate-200/50 dark:border-slate-700/30 printable-patti animate-slide-up"
        >
          <div className="p-10 max-w-[780px] mx-auto font-[system-ui,sans-serif] text-[13px] leading-relaxed text-slate-900">

            {/* ── HEADER ─────────────────────────── */}
            <div className="pb-6 border-b-2 border-slate-100 mb-6">
              <div className="flex items-start justify-between gap-6">

                {/* Left: Logo / Initials + Company Info */}
                <div className="flex items-start gap-5 flex-1 min-w-0">
                  {/* Logo or Initials badge */}
                  <div className="shrink-0">
                    {cs.logo ? (
                      <img
                        src={cs.logo}
                        alt={cs.name}
                        className="h-16 w-16 object-contain rounded-2xl bg-slate-50 border border-slate-100 p-1.5"
                      />
                    ) : (
                      <div
                        className="shrink-0 rounded-2xl text-white font-black select-none overflow-hidden flex items-center justify-center shadow-md"
                        style={{
                          width: 64,
                          height: 64,
                          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                          fontSize: `${initialsFontSize(ini.length, 64)}px`,
                          lineHeight: 1,
                          letterSpacing: ini.length >= 3 ? '0.04em' : '0.02em',
                        }}
                      >
                        {ini}
                      </div>
                    )}
                  </div>

                  {/* Company text */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                      {cs.name}
                    </h1>
                    {cs.tagline && (
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em] mt-1">
                        {cs.tagline}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-[10.5px] font-semibold text-slate-500">
                      {cs.address && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {cs.address}
                        </span>
                      )}
                      {cs.gstin && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          GSTIN: <span className="font-mono font-black text-slate-700">{cs.gstin}</span>
                        </span>
                      )}
                      {cs.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {cs.email}
                        </span>
                      )}
                    </div>
                    {/* Contact numbers row */}
                    {contacts.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                        {contacts.map((c, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10.5px] font-bold text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Bill Info Badge */}
                <div className="shrink-0 text-right">
                  <div className="inline-block px-5 py-3.5 rounded-2xl border-2 text-right border-teal-700/20 bg-teal-500/5">
                    <p className="text-[9px] font-black text-teal-600 uppercase tracking-[0.2em] mb-0.5">Purchase Bill</p>
                    <p className="text-xl font-black text-slate-900 font-mono tracking-tight">{invoice.billNo}</p>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px]">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Date</span>
                      <span className="font-mono font-black text-slate-700">{fmtDate(invoice.date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SUPPLIER & VEHICLE ──────────────── */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 flex">
              <div className="flex-1 p-3.5 bg-teal-50/50">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Purchased From — Supplier / Orchard
                </div>
                <div className="text-[16px] font-black text-slate-950 mt-1">{invoice.supplierName}</div>
                {supplier && (
                  <div className="text-[12px] font-bold text-slate-600 space-y-2 mt-3.5 border-t border-slate-200/30">
                    {supplier.billingAddress && (
                      <p className="flex items-start gap-2 leading-tight mt-1.5">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-slate-800">{supplier.billingAddress}</span>
                      </p>
                    )}
                    {supplier.phone && (
                      <p className="flex items-center gap-2 leading-tight">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{supplier.phone}</span>
                      </p>
                    )}
                    {supplier.gstin && (
                      <p className="flex items-center gap-2 leading-tight">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>GSTIN: <span className="font-mono font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60">{supplier.gstin}</span></span>
                      </p>
                    )}
                  </div>
                )}
                {invoice.notes && (
                  <div className="text-[10.5px] text-slate-500 mt-1.5 italic font-medium">Note: {invoice.notes}</div>
                )}
              </div>
              <div className="p-3.5 border-l border-slate-300 bg-white text-right shrink-0 min-w-[180px]">
                <div className="text-[9px] font-bold uppercase text-slate-400">Vehicle Info</div>
                <div className="font-mono font-bold text-slate-900 text-[12px] mt-0.5">
                  {invoice.vehicleNo || 'DIRECT'}
                </div>
                {invoice.declaredWeight && (
                  <div className="text-[10px] text-slate-500 mt-0.5 font-bold">Wt: {invoice.declaredWeight} KG</div>
                )}
              </div>
            </div>

            {/* ── ITEMS TABLE ──────────────────────── */}
            <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm mt-8">
              <table className="w-full border-collapse text-[11px] sm:text-[12px] erp-table">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}>
                    <th className="py-4 px-2 col-text text-center text-white font-black uppercase tracking-wider w-16">SR No.</th>
                    <th className="py-4 px-2 col-text text-white font-black uppercase tracking-wider">Description</th>
                    <th className="py-4 px-2 col-text text-white font-black uppercase tracking-wider">Variety</th>
                    <th className="py-4 px-2 col-num w-20 text-white font-black uppercase tracking-wider">Carets</th>
                    <th className="py-4 px-2 col-num w-24 text-white font-black uppercase tracking-wider">Weight</th>
                    <th className="py-4 px-2 col-num w-24 text-white font-black uppercase tracking-wider">Rate</th>
                    <th className="py-4 px-6 col-num w-32 text-white font-black uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoice.items.map((item, idx) => {
                    const pricingType = item.pricingType ?? getFruitPricingType(item.fruitCategory || item.fruit || '');
                    const isByKg = pricingType === 'kg';
                    return (
                      <tr key={item.id} style={idx % 2 === 1 ? { backgroundColor: '#0d948808' } : {}}>
                        <td className="py-4 px-2 col-text text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-4 px-2 col-text font-black text-slate-900">{item.fruit}</td>
                        <td className="py-4 px-2 col-text text-slate-600 font-bold uppercase tracking-tight">{item.variety}</td>
                        <td className="py-4 px-2 col-num font-mono font-black text-slate-700">{item.caret}</td>
                        <td className="py-4 px-2 col-num font-mono font-black text-slate-700">
                          {item.weight} <span className="text-[9px] text-slate-400">KG</span>
                        </td>
                        <td className="py-4 px-2 col-num font-mono text-slate-600 font-bold">
                          ₹{item.rate.toLocaleString('en-IN')}
                          <span className="text-[9px] text-slate-400 ml-0.5">{isByKg ? '/KG' : '/Crt'}</span>
                        </td>
                        <td className="py-4 px-6 col-num font-mono font-black text-slate-900 text-[13px]">
                          ₹{(item.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── TOTALS ───────────────────────────── */}
            <div className="flex justify-end mt-4">
              <div className="w-full max-w-[280px] space-y-2 border-t-[3px] border-slate-900 pt-3">
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span className="text-[10px] uppercase">Subtotal</span>
                  <span className="font-mono">₹{itemsSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span className="text-[10px] uppercase tracking-wider">Freight / Transport</span>
                  <span className="font-mono">₹{freight.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-semibold border-b border-slate-100 pb-2">
                  <span className="text-[10px] uppercase tracking-wider">Hamali / Labor</span>
                  <span className="font-mono">₹{hamali.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] font-black uppercase text-slate-900">Net Payable</span>
                  <span className="text-[20px] font-black font-mono text-teal-700">
                    ₹{netTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* ── FOOTER ───────────────────────────── */}
            <div className="mt-16 pt-3 border-t border-slate-100 text-center text-[9px] text-slate-400 font-mono italic uppercase tracking-widest">
              ASZ Nexus ERP · Purchase Ledger Document
            </div>
          </div>
        </div>

        <div className="h-12 shrink-0" />
      </div>
    </div>
  );
};
