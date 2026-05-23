import React from 'react';
import { Invoice } from '../types';
import { X, Printer, FileText, Download, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';
import { InvoiceTemplateRenderer } from './invoice/InvoiceTemplateRenderer';
import { normalizeInvoiceTemplate } from '../utils/invoice-number';
import { fmtDate } from '@/utils/format';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ invoice, onClose }) => {
  const { settings } = useApp();
  const toast = useToast();
  const cs = settings.company;
  const invSettings = settings.invoice;
  if (!invoice) return null;
  const template = normalizeInvoiceTemplate(invSettings.templateStyle);

  const handlePrint = () => window.print();
  const handleDownload = () => { window.print(); toast.info('Save as PDF', 'Select "Save as PDF" as destination in the print dialog.'); };
  const handleShare = () => {
    const msg = encodeURIComponent(`Invoice ${invoice.invoiceNo}\nAmount: ₹${invoice.todayAmount.toLocaleString('en-IN')}\nFrom: ${cs.name}\nContact: ${cs.phone}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto animate-fade-in">
      <div className="min-h-screen dark:bg-slate-950/95 bg-slate-200/90 backdrop-blur-md flex flex-col items-center py-4 sm:py-8 px-3 sm:px-4">
        <div className="w-full max-w-[900px] mb-4 flex items-center justify-between no-print animate-slide-down">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold dark:text-white text-slate-900">Invoice Preview</h3>
              <p className="text-[11px] dark:text-slate-400 text-slate-500 font-mono">{invoice.invoiceNo} · {fmtDate(invoice.date)} · {template}</p>
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
        <div className="w-full max-w-[900px] bg-white rounded-xl shadow-2xl dark:shadow-black/40 shadow-slate-400/20 overflow-hidden border border-slate-200/50 dark:border-slate-700/30 printable-patti animate-slide-up">
          <div className="p-3 sm:p-5">
            <InvoiceTemplateRenderer invoice={invoice} company={cs} invoiceSettings={invSettings} />
          </div>
        </div>
        <div className="h-8 shrink-0" />
      </div>
    </div>
  );
};
