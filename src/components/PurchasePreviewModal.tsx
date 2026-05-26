import React from 'react';
import { PurchaseInvoice } from '../types';
import { X, Printer, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { fmtDate, sumCurrency, roundCurrency } from '@/utils/format';

interface PurchasePreviewModalProps {
  invoice: PurchaseInvoice | null;
  onClose: () => void;
}

export const PurchasePreviewModal: React.FC<PurchasePreviewModalProps> = ({ invoice, onClose }) => {
  const { settings } = useApp();
  const cs = settings.company;
  if (!invoice) return null;

  const totalCarets = invoice.items.reduce((s, i) => s + (Number(i.caret) || 0), 0);
  const totalWeight = sumCurrency(invoice.items.map(i => Number(i.weight) || 0));
  const freight = roundCurrency(Number(invoice.freight) || 0);
  const hamali = roundCurrency(Number(invoice.hamali) || 0);
  const itemsSubtotal = sumCurrency(invoice.items.map(i => Number(i.amount) || 0));
  const netTotal = roundCurrency(itemsSubtotal + freight + hamali);

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto animate-fade-in custom-scrollbar">
      <div className="min-h-screen dark:bg-slate-950/90 bg-slate-200/90 backdrop-blur-md flex flex-col items-center py-6 sm:py-12 px-3 sm:px-4 no-print">
        {/* Toolbar */}
        <div className="w-full max-w-[850px] mb-4 flex items-center justify-between no-print animate-slide-down">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black dark:text-white text-slate-900 tracking-tight uppercase">Purchase Bill Preview</h3>
              <p className="text-[10px] dark:text-slate-400 text-slate-500 font-mono tracking-wider">{invoice.billNo} · {fmtDate(invoice.date)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => window.print()} className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95">
              <Printer className="w-4 h-4" /><span>Print Bill</span>
            </button>
            <button onClick={onClose} className="p-2.5 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 dark:bg-slate-800 bg-white rounded-xl cursor-pointer transition-all border dark:border-slate-700 border-slate-200 shadow-sm active:scale-95">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* The Actual White Paper Sheet */}
        <div className="w-full max-w-[850px] bg-white rounded-xl shadow-2xl dark:shadow-black/60 shadow-slate-400/20 overflow-hidden border border-slate-200/50 dark:border-slate-700/30 printable-patti animate-slide-up">
          <div className="p-10 max-w-[780px] mx-auto font-[system-ui,sans-serif] text-[13px] leading-relaxed text-slate-900">
            {/* ── HEADER ─────────────────────────── */}
            <div className="flex justify-between items-start border-b-[3px] border-slate-900 pb-5 mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  {cs.logo && <img src={cs.logo} alt={cs.name} className="h-9 max-w-[90px] object-contain shrink-0" />}
                  <h1 className="text-[26px] font-black tracking-tight text-slate-950 leading-none">{cs.name.toUpperCase()}</h1>
                </div>
                <p className="text-[11px] font-bold text-slate-600 mt-1 tracking-[0.15em] uppercase">{cs.tagline}</p>
                <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">{cs.address}<br/>Phone: {cs.phone} &nbsp;|&nbsp; Email: {cs.email}</p>
              </div>
              <div className="text-right shrink-0 ml-6">
                <div className="inline-block border-2 border-teal-700 px-5 py-3 rounded-lg bg-teal-50">
                  <div className="text-[9px] font-black tracking-[0.2em] uppercase text-teal-500">Purchase Bill</div>
                  <div className="text-[22px] font-black font-mono text-teal-900 leading-tight mt-0.5">{invoice.billNo}</div>
                </div>
                <div className="text-[11px] font-mono text-slate-600 mt-2 font-semibold">{fmtDate(invoice.date)}</div>
              </div>
            </div>

            {/* ── SUPPLIER & VEHICLE INFO ──────────── */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 flex">
              <div className="flex-1 p-3.5 bg-teal-50/50">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Purchased From — Supplier / Orchard</div>
                <div className="text-[16px] font-black text-slate-950 mt-1">{invoice.supplierName}</div>
                {invoice.notes && <div className="text-[10.5px] text-slate-500 mt-1 italic">Note: {invoice.notes}</div>}
              </div>
              <div className="p-3.5 border-l border-slate-300 bg-white text-right shrink-0 min-w-[180px]">
                <div className="text-[9px] font-bold uppercase text-slate-400">Vehicle Info</div>
                <div className="font-mono font-bold text-slate-900 text-[12px] mt-0.5">{invoice.vehicleNo || "DIRECT"}</div>
                {invoice.declaredWeight && <div className="text-[10px] text-slate-500 mt-0.5 font-bold">Wt: {invoice.declaredWeight} KG</div>}
              </div>
            </div>

            {/* Rest of the table and content remains same, just wrapped in printable-patti */}
            {/* Using a simplified snippet for search/replace success */}
            <table className="w-full border-collapse text-[11.5px] mb-1 erp-table">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 col-text rounded-tl-lg w-8">#</th>
                  <th className="py-2.5 px-3 col-text">Fruit</th>
                  <th className="py-2.5 px-3 col-text">Variety</th>
                  <th className="py-2.5 px-3 col-num w-24">Carets</th>
                  <th className="py-2.5 px-3 col-num w-24">Weight</th>
                  <th className="py-2.5 px-3 col-num w-24">Rate/KG</th>
                  <th className="py-2.5 px-3 col-num rounded-tr-lg w-32">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-slate-200 ${idx % 2 ? 'bg-slate-50/60' : ''}`}>
                    <td className="py-2 px-3 col-text text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 col-text font-semibold text-slate-900">{item.fruit}</td>
                    <td className="py-2 px-3 col-text font-medium text-slate-700">{item.variety}</td>
                    <td className="py-2 px-3 col-num font-mono font-semibold">{item.caret}</td>
                    <td className="py-2 px-3 col-num font-mono font-semibold">{item.weight}</td>
                    <td className="py-2 px-3 col-num font-mono">{item.rate.toFixed(2)}</td>
                    <td className="py-2 px-3 col-num font-mono font-bold text-slate-900">₹{(item.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mt-4">
              <div className="w-full max-w-[280px] space-y-2 border-t-[3px] border-slate-900 pt-3">
                <div className="flex justify-between text-slate-500 font-semibold"><span className="text-[10px] uppercase">Subtotal</span><span className="font-mono">₹{itemsSubtotal.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-slate-500 font-semibold"><span className="text-[10px] uppercase tracking-wider">Freight / Transport</span><span className="font-mono">₹{freight.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-slate-500 font-semibold border-b border-slate-100 pb-2"><span className="text-[10px] uppercase tracking-wider">Hamali / Labor</span><span className="font-mono">₹{hamali.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between items-center pt-1"><span className="text-[11px] font-black uppercase text-slate-900">Net Payable</span><span className="text-[20px] font-black font-mono text-teal-700">₹{netTotal.toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            {/* Footer */}
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
