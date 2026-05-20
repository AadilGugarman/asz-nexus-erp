import React from 'react';
import { Invoice } from '../types';
import { X, Printer, FileText, Download, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ invoice, onClose }) => {
  const { settings } = useApp();
  const toast = useToast();
  const cs = settings.company;
  const is = settings.invoice;
  if (!invoice) return null;

  const totalCarets = invoice.items.reduce((s, i) => s + (Number(i.caret) || 0), 0);
  const totalWeight = invoice.items.reduce((s, i) => s + (Number(i.weight) || 0), 0);
  const hamali = Number(invoice.hamali) || 0;
  const discount = Number(invoice.discount) || 0;
  const itemsSubtotal = invoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const brandColor = is.brandColor || '#4f46e5';

  const handlePrint = () => window.print();
  const handleDownload = () => { window.print(); toast.info('Save as PDF', 'Select "Save as PDF" as destination in the print dialog.'); };
  const handleShare = () => {
    const msg = encodeURIComponent(`Invoice ${invoice.invoiceNo}\nAmount: ₹${invoice.todayAmount.toLocaleString('en-IN')}\nFrom: ${cs.name}\nContact: ${cs.phone}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto animate-fade-in">
      {/* ── Backdrop: adapts to theme ────────────── */}
      <div className="min-h-screen dark:bg-slate-950/95 bg-slate-200/90 backdrop-blur-md flex flex-col items-center py-6 sm:py-10 px-4">

        {/* ── Action Bar (above paper) ──────────────── */}
        <div className="w-full max-w-[850px] mb-4 flex items-center justify-between no-print animate-slide-down">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold dark:text-white text-slate-900">Invoice Preview</h3>
              <p className="text-[11px] dark:text-slate-400 text-slate-500 font-mono">{invoice.invoiceNo} · {invoice.date}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handlePrint} className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 cursor-pointer transition-all">
              <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
            </button>
            <button onClick={handleDownload} className="flex items-center space-x-1.5 dark:bg-slate-800 bg-white dark:text-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-all border dark:border-slate-700 border-slate-200 dark:hover:bg-slate-700 hover:bg-slate-50">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={handleShare} className="flex items-center space-x-1.5 dark:bg-slate-800 bg-white dark:text-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-all border dark:border-slate-700 border-slate-200 dark:hover:bg-slate-700 hover:bg-slate-50">
              <Share2 className="w-4 h-4" /><span className="hidden sm:inline">Share</span>
            </button>
            <button onClick={onClose} className="p-2 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 dark:bg-slate-800 bg-white rounded-xl cursor-pointer transition-all border dark:border-slate-700 border-slate-200 shadow-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── A4 Paper ─────────────────────────────── */}
        <div className="w-full max-w-[850px] bg-white rounded-xl shadow-2xl dark:shadow-black/40 shadow-slate-400/20 overflow-hidden border border-slate-200/50 dark:border-slate-700/30 printable-patti animate-slide-up">
          <div className="p-8 sm:p-12 max-w-[780px] mx-auto font-[system-ui,-apple-system,sans-serif] text-[13px] leading-relaxed text-slate-900">

            {/* ── HEADER ──────────────────────────── */}
            <div className="flex justify-between items-start pb-6 mb-7" style={{ borderBottom: `3px solid ${brandColor}` }}>
              <div className="max-w-[55%]">
                <div className="flex items-center space-x-3 mb-1">
                  {cs.logo ? (
                    <img src={cs.logo} alt={cs.name} className="h-10 max-w-[100px] object-contain shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0" style={{ backgroundColor: brandColor }}>
                      {cs.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h1 className="text-[24px] font-black tracking-tight text-slate-950 leading-none">{cs.name.toUpperCase()}</h1>
                </div>
                <p className="text-[10.5px] font-bold text-slate-500 mt-1.5 tracking-[0.12em] uppercase">{cs.tagline}</p>
                <div className="mt-2.5 text-[10.5px] text-slate-500 leading-[1.6] space-y-0.5">
                  <p>{cs.address}</p>
                  <p>Phone: {cs.phone} &nbsp;·&nbsp; Email: {cs.email}</p>
                  {cs.gstin && <p className="font-mono font-semibold text-slate-600">GSTIN: {cs.gstin}</p>}
                </div>
              </div>
              <div className="text-right shrink-0 ml-8">
                <div className="inline-block px-5 py-3.5 rounded-lg border-2" style={{ borderColor: brandColor, backgroundColor: brandColor + '08' }}>
                  <div className="text-[8.5px] font-black tracking-[0.2em] uppercase" style={{ color: brandColor }}>Sales Invoice</div>
                  <div className="text-[20px] font-black font-mono text-slate-950 leading-tight mt-0.5">{invoice.invoiceNo}</div>
                </div>
                <div className="text-[10.5px] font-mono text-slate-500 mt-2.5 font-semibold">Date: {invoice.date}</div>
                {(is.paymentDueDays ?? 0) > 0 && (
                  <div className="text-[10px] text-slate-400 mt-0.5">Due in {is.paymentDueDays} days</div>
                )}
              </div>
            </div>

            {/* ── BUYER ───────────────────────────── */}
            <div className="rounded-lg overflow-hidden mb-7 flex border border-slate-200">
              <div className="flex-1 p-4 bg-slate-50/70">
                <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Billed To</div>
                <div className="text-[15px] font-black text-slate-950">{invoice.customerName}</div>
                {invoice.notes && <div className="text-[10px] text-slate-500 mt-1.5 italic leading-relaxed">Note: {invoice.notes}</div>}
              </div>
              <div className="p-4 border-l border-slate-200 bg-white text-right shrink-0 min-w-[140px] flex flex-col justify-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-400">Customer ID</div>
                <div className="font-mono font-bold text-slate-600 text-[10.5px] mt-0.5">#{invoice.customerId}</div>
              </div>
            </div>

            {/* ── ITEMS TABLE ─────────────────────── */}
            <table className="w-full border-collapse text-[11px] mb-2">
              <thead>
                <tr style={{ backgroundColor: brandColor }} className="text-white">
                  <th className="py-2.5 px-3 text-left font-semibold rounded-tl-md w-8 text-[10px]">#</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Description</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Variety</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Crt</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Wt (KG)</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Rate</th>
                  <th className="py-2.5 px-3 text-right font-semibold rounded-tr-md text-[10px]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-slate-100`}>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{item.fruit}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.lotVariety}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">{item.caret}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">{item.weight}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">₹{item.rate.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{item.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── TOTALS ──────────────────────────── */}
            <div className="flex justify-end mb-7">
              <div className="w-full max-w-[320px] space-y-0">
                <div className="flex justify-between py-2 px-3 text-[11px] border-t-2 border-slate-200 bg-slate-50/70 rounded-t-lg">
                  <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Subtotal ({totalCarets} CRT · {totalWeight} KG)</span>
                  <span className="font-mono font-bold text-slate-900">₹ {itemsSubtotal.toLocaleString('en-IN')}</span>
                </div>
                {hamali > 0 && (
                  <div className="flex justify-between py-1.5 px-3 text-[10.5px] border-t border-slate-100">
                    <span className="text-slate-500">+ Hamali / Loading</span>
                    <span className="font-mono font-bold text-slate-800">₹ {hamali.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between py-1.5 px-3 text-[10.5px] border-t border-slate-100">
                    <span className="text-red-600 font-medium">− Discount</span>
                    <span className="font-mono font-bold text-red-700">₹ {discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {(is.defaultTaxRate ?? 0) > 0 && (
                  <div className="flex justify-between py-1.5 px-3 text-[10.5px] border-t border-slate-100">
                    <span className="text-slate-500">Tax ({is.defaultTaxRate}%)</span>
                    <span className="font-mono font-bold text-slate-800">₹ {Math.round(itemsSubtotal * (is.defaultTaxRate || 0) / 100).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 px-4 text-white rounded-b-lg" style={{ backgroundColor: brandColor }}>
                  <span className="font-black uppercase text-[10.5px] tracking-wider">Net Total</span>
                  <span className="font-mono font-black text-[16px]">₹ {invoice.todayAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* ── BALANCE BOX ─────────────────────── */}
            <div className="grid grid-cols-4 gap-0 rounded-lg overflow-hidden mb-7 text-[10.5px] border border-slate-200">
              <div className="p-3 bg-white border-r border-slate-200">
                <div className="text-[8.5px] font-bold uppercase text-slate-400 tracking-wider">Previous</div>
                <div className="text-[14px] font-black font-mono text-slate-900 mt-0.5">₹{invoice.previousBalance.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 border-r border-slate-200" style={{ backgroundColor: brandColor + '06' }}>
                <div className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: brandColor }}>+ Today</div>
                <div className="text-[14px] font-black font-mono mt-0.5" style={{ color: brandColor }}>₹{invoice.todayAmount.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 bg-emerald-50/60 border-r border-slate-200">
                <div className="text-[8.5px] font-bold uppercase text-emerald-600 tracking-wider">− Paid</div>
                <div className="text-[14px] font-black font-mono text-emerald-800 mt-0.5">₹{invoice.paidAmount.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 text-white" style={{ backgroundColor: brandColor }}>
                <div className="text-[8.5px] font-black uppercase tracking-wider text-white/80">Balance</div>
                <div className="text-[16px] font-black font-mono text-white mt-0.5">₹{invoice.remainingBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* ── PAYMENT INFO ────────────────────── */}
            {(is.showBankDetails || is.showUPI) && cs.bankName && (
              <div className="rounded-lg p-3.5 mb-7 bg-slate-50/80 border border-slate-200 text-[10px]">
                <div className="font-bold text-slate-800 text-[10.5px] mb-0.5">🏦 Payment Details — {cs.name}</div>
                <div className="text-slate-500 leading-relaxed">
                  {is.showBankDetails && <>{cs.bankName} · A/C: {cs.accountNo} · IFSC: {cs.ifsc}</>}
                  {is.showBankDetails && is.showUPI && <> · </>}
                  {is.showUPI && <>UPI: {cs.upiId}</>}
                </div>
              </div>
            )}

            {/* ── TERMS ───────────────────────────── */}
            {is.termsText && (
              <div className="text-[9.5px] text-slate-500 mb-3 leading-relaxed">
                <span className="font-bold text-slate-600">Terms: </span>{is.termsText}
              </div>
            )}

            {/* ── SIGNATURES ──────────────────────── */}
            <div className="mt-14 grid grid-cols-2 gap-16 text-[9.5px] text-slate-500">
              <div>
                <div className="border-b border-slate-300 w-48 mb-2" />
                <div className="font-bold text-slate-700 uppercase tracking-wider">Receiver Signature</div>
              </div>
              <div className="text-right">
                {is.signatureImage ? (
                  <img src={is.signatureImage} alt="Signature" className="h-10 ml-auto object-contain mb-1.5" />
                ) : (
                  <div className="border-b border-slate-300 w-48 ml-auto mb-2" />
                )}
                <div className="font-bold text-slate-700 uppercase tracking-wider">For {cs.name}</div>
              </div>
            </div>

            {/* ── FOOTER ──────────────────────────── */}
            {is.footerNote && (
              <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[8.5px] text-slate-400 font-mono">
                {is.footerNote} &nbsp;·&nbsp; {cs.name}
              </div>
            )}
          </div>
        </div>

        {/* Bottom spacer for scroll */}
        <div className="h-8 shrink-0" />
      </div>
    </div>
  );
};
