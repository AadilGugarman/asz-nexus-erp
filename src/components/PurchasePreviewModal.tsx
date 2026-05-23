import React from 'react';
import { PurchaseInvoice } from '../types';
import { X, Printer, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fmtDate } from '@/utils/format';

interface PurchasePreviewModalProps {
  invoice: PurchaseInvoice | null;
  onClose: () => void;
}

export const PurchasePreviewModal: React.FC<PurchasePreviewModalProps> = ({ invoice, onClose }) => {
  const { settings } = useApp();
  const cs = settings.company;
  if (!invoice) return null;

  const totalCarets = invoice.items.reduce((s, i) => s + (Number(i.caret) || 0), 0);
  const totalWeight = invoice.items.reduce((s, i) => s + (Number(i.weight) || 0), 0);
  const freight = Number(invoice.freight) || 0;
  const hamali = Number(invoice.hamali) || 0;
  const itemsSubtotal = invoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const netTotal = itemsSubtotal + freight + hamali;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-8 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 border-slate-200 rounded-2xl max-w-[820px] w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slide-up">
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-lg"><FileText className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold dark:text-white text-slate-900">Purchase Bill — <span className="font-mono">{invoice.billNo}</span></h3>
              <p className="text-[11px] dark:text-slate-400 text-slate-500">Print or save as PDF</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => window.print()} className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow cursor-pointer transition-colors">
              <Printer className="w-4 h-4" /><span>Print / PDF</span>
            </button>
            <button onClick={onClose} className="p-2 dark:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white text-slate-900 printable-patti">
          <div className="p-10 max-w-[780px] mx-auto font-[system-ui,sans-serif] text-[13px] leading-relaxed">

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
                  <div className="text-[9px] font-black tracking-[0.2em] uppercase text-teal-500">Direct Purchase Bill</div>
                  <div className="text-[22px] font-black font-mono text-teal-900 leading-tight mt-0.5">{invoice.billNo}</div>
                </div>
                <div className="text-[11px] font-mono text-slate-600 mt-2 font-semibold">{fmtDate(invoice.date)}</div>
              </div>
            </div>

            {/* ── SUPPLIER INFO ──────────────────── */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 flex">
              <div className="flex-1 p-3.5 bg-teal-50/50">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Purchased From — Supplier / Orchard</div>
                <div className="text-[16px] font-black text-slate-950 mt-1">{invoice.supplierName}</div>
                {invoice.notes && <div className="text-[10.5px] text-slate-500 mt-1 italic">Note: {invoice.notes}</div>}
              </div>
              <div className="p-3.5 border-l border-slate-300 bg-white text-right shrink-0 min-w-[150px]">
                <div className="text-[9px] font-bold uppercase text-slate-400">Supplier ID</div>
                <div className="font-mono font-bold text-slate-700 text-[11px] mt-0.5">#{invoice.supplierId}</div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold">Ledger: Creditor</div>
              </div>
            </div>

            {/* ── ITEMS TABLE ────────────────────── */}
            <table className="w-full border-collapse text-[11.5px] mb-1">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 text-left font-bold rounded-tl-lg w-8">#</th>
                  <th className="py-2.5 px-3 text-left font-bold">Fruit</th>
                  <th className="py-2.5 px-3 text-left font-bold">Variety</th>
                  <th className="py-2.5 px-3 text-right font-bold">Carets</th>
                  <th className="py-2.5 px-3 text-right font-bold">Weight</th>
                  <th className="py-2.5 px-3 text-right font-bold">Rate/KG</th>
                  <th className="py-2.5 px-3 text-right font-bold rounded-tr-lg">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-slate-200 ${idx % 2 ? 'bg-slate-50/60' : ''}`}>
                    <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{item.fruit}</td>
                    <td className="py-2 px-3 font-medium text-slate-700">{item.variety}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">{item.caret}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">{item.weight}</td>
                    <td className="py-2 px-3 text-right font-mono">{item.rate.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{item.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-[11px]">
                  <td colSpan={3} className="py-2.5 px-3 text-right text-[10px] uppercase tracking-wider text-slate-500">Items Subtotal</td>
                  <td className="py-2.5 px-3 text-right font-mono">{totalCarets}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{totalWeight}</td>
                  <td className="py-2.5 px-3"></td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">₹ {itemsSubtotal.toLocaleString('en-IN')}</td>
                </tr>
                {freight > 0 && (
                  <tr className="text-[10.5px] border-t border-slate-200">
                    <td colSpan={6} className="py-1.5 px-3 text-right text-slate-500 font-semibold">+ Freight (Bhaada)</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">₹ {freight.toLocaleString()}</td>
                  </tr>
                )}
                {hamali > 0 && (
                  <tr className="text-[10.5px] border-t border-slate-200">
                    <td colSpan={6} className="py-1.5 px-3 text-right text-slate-500 font-semibold">+ Hamali (Unloading)</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">₹ {hamali.toLocaleString()}</td>
                  </tr>
                )}
                {(freight > 0 || hamali > 0) && (
                  <tr className="border-t-2 border-slate-900 bg-slate-900 text-white">
                    <td colSpan={6} className="py-2.5 px-3 text-right text-[10px] uppercase tracking-wider font-bold">Net Purchase Bill Total</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[15px] font-black">₹ {netTotal.toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tfoot>
            </table>

            {/* ── BALANCE BOX ────────────────────── */}
            <div className="grid grid-cols-4 gap-0 border-2 border-slate-900 rounded-lg overflow-hidden mt-6 mb-6 text-[11px]">
              <div className="p-3 bg-white border-r border-slate-300">
                <div className="text-[9px] font-bold uppercase text-slate-400">Previous Balance</div>
                <div className="text-[15px] font-black font-mono text-slate-900 mt-0.5">₹ {invoice.previousBalance.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 bg-teal-50 border-r border-slate-300">
                <div className="text-[9px] font-bold uppercase text-teal-600">+ Today Bill</div>
                <div className="text-[15px] font-black font-mono text-teal-900 mt-0.5">₹ {netTotal.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 bg-emerald-50 border-r border-slate-300">
                <div className="text-[9px] font-bold uppercase text-emerald-600">− Cash Paid</div>
                <div className="text-[15px] font-black font-mono text-emerald-800 mt-0.5">₹ {invoice.paidAmount.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 bg-slate-900 text-white">
                <div className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Final Payable</div>
                <div className="text-[18px] font-black font-mono text-white mt-0.5">₹ {invoice.remainingBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* ── SIGNATURES ─────────────────────── */}
            <div className="mt-12 grid grid-cols-2 gap-12 text-[10px] text-slate-600">
              {['Supplier / Driver Signature', `For ${cs.name}`].map((label, i) => (
                <div key={i} className={i === 1 ? 'text-right' : ''}>
                  <div className={`border-b border-slate-400 mb-2 ${i === 1 ? 'ml-auto w-52' : 'w-52'}`} style={{height:'1px'}}></div>
                  <div className="font-bold text-slate-800 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono">
              Computer generated — Recorded in supplier ledger & stock inventory &nbsp;•&nbsp; {cs.name} ERP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
