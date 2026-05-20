import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Search, DollarSign, Printer, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PaymentReceipt } from '../types';
import { useToast } from './ui/Toast';
import { StatementPreview } from './ui/StatementPreview';

export const SupplierModule: React.FC = () => {
  const { suppliers, getSupplierLedger, addPayment } = useApp();
  const toast = useToast();

  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatement, setShowStatement] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('BANK_TRANSFER');
  const [payRefNo, setPayRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  }, [selectedSupplierId, suppliers]);

  const ledgerEntries = useMemo(() => {
    if (!selectedSupplier) return [];
    return getSupplierLedger(selectedSupplier.id);
  }, [selectedSupplier, getSupplierLedger]);

  const outstandingBalance = ledgerEntries.length > 0 ? ledgerEntries[0].runningBalance : (selectedSupplier?.previousBalance || 0);

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || payAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    const newPayment: PaymentReceipt = {
      id: `p-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partyType: 'SUPPLIER',
      partyId: selectedSupplier.id,
      partyName: selectedSupplier.name,
      amount: Number(payAmount),
      paymentMode: payMode,
      referenceNo: payRefNo,
      notes: payNotes
    };

    addPayment(newPayment);
    toast.success('Payment Recorded', `₹${Number(payAmount).toLocaleString('en-IN')} paid to ${selectedSupplier.name}. Supplier ledger updated.`);
    setShowPaymentModal(false);
    setPayAmount(0);
    setPayRefNo('');
    setPayNotes('');
  };

  const handlePrintLedger = () => {
    setShowStatement(true);
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()) || s.city.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [suppliers, searchTerm]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 dark:bg-slate-900 bg-white p-4 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-md">
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>SUPPLIER PURCHASE TRACKING & LEDGER</span>
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-600 mt-0.5">Automated purchase history from incoming fruit loads & payment tracking</p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 dark:bg-slate-950 bg-slate-100 p-1.5 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>Record Payment to Supplier</span>
          </button>
          <button
            onClick={handlePrintLedger}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 dark:bg-slate-800 bg-white hover:bg-slate-700 dark:hover:bg-slate-700 hover:bg-slate-50 dark:text-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-700 dark:border-slate-700 border-slate-300 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save Statement</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN: SUPPLIER LIST */}
        <div className="lg:col-span-1 bg-slate-900 dark:bg-slate-900 bg-white rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl overflow-hidden flex flex-col h-[700px] no-print">
          <div className="p-4 bg-slate-950 dark:bg-slate-950 bg-slate-100 border-b border-slate-800 dark:border-slate-800 border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 dark:text-slate-400 text-slate-600 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 dark:bg-slate-900 bg-white border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800 dark:divide-slate-800 divide-slate-100 scrollbar-thin">
            {filteredSuppliers.map(s => {
              const isSelected = s.id === selectedSupplierId;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSupplierId(s.id)}
                  className={`p-4 cursor-pointer transition-colors font-sans ${
                    isSelected ? 'bg-emerald-500/15 border-l-4 border-emerald-500' : 'hover:bg-slate-800/40 dark:hover:bg-slate-800/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-bold dark:text-white text-slate-900 text-sm">{s.name}</span>
                    <span className="text-[10px] font-mono bg-slate-800 dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 px-1.5 py-0.5 rounded border border-slate-700 dark:border-slate-700 border-slate-200 font-bold">{s.code}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs dark:text-slate-400 text-slate-600 font-sans">
                    <span>{s.city}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">₹ {s.previousBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SUPPLIER LEDGER STATEMENT */}
        <div className="lg:col-span-3 bg-slate-900 dark:bg-slate-900 bg-white rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl p-6 flex flex-col space-y-6 printable-patti font-sans">
          {selectedSupplier ? (
            <>
              {/* Supplier Profile Info Header */}
              <div className="bg-slate-950 dark:bg-slate-950 bg-slate-50 p-6 rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
                <div>
                  <div className="flex items-center space-x-2.5 font-sans">
                    <h2 className="text-2xl font-black dark:text-white text-slate-900">{selectedSupplier.name}</h2>
                    <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold">
                      {selectedSupplier.code}
                    </span>
                  </div>
                  <p className="text-xs dark:text-slate-400 text-slate-600 mt-1 font-sans">Location: {selectedSupplier.city} | Contact: {selectedSupplier.phone}</p>
                </div>

                <div className="bg-slate-900 dark:bg-slate-900 bg-white p-4 rounded-xl border border-slate-700 dark:border-slate-700 border-slate-200 text-right min-w-[220px] shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 block">Total Outstanding Payable</span>
                  <span className={`text-2xl font-black font-mono mt-0.5 block ${outstandingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ₹ {outstandingBalance.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] dark:text-slate-400 text-slate-500 block mt-0.5 font-medium">{outstandingBalance >= 0 ? 'Credit in favor' : 'Advance Paid'}</span>
                </div>
              </div>

              {/* Ledger Statement Table */}
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 font-sans">
                <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
                  <thead>
                    <tr className="bg-slate-950 dark:bg-slate-950 bg-slate-100 dark:text-slate-300 text-slate-900 uppercase font-bold border-b border-slate-800 dark:border-slate-800 border-slate-200 text-[11px]">
                      <th className="py-3.5 px-4 w-28">Date</th>
                      <th className="py-3.5 px-3 w-32">Type</th>
                      <th className="py-3.5 px-3">Reference / Description</th>
                      <th className="py-3.5 px-3 text-right">Weight / Qty</th>
                      <th className="py-3.5 px-3 text-right">Rate</th>
                      <th className="py-3.5 px-3 text-right text-rose-600 dark:text-rose-400">Purchase (Dr)</th>
                      <th className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Payment (Cr)</th>
                      <th className="py-3.5 px-4 text-right font-black text-teal-600 dark:text-teal-400">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 dark:divide-slate-800/80 divide-slate-200 font-mono">
                    {ledgerEntries.map(entry => {
                      const isPurchase = entry.type === 'PURCHASE_VEHICLE' || entry.type === 'PURCHASE_BILL';
                      const isPayment = entry.type === 'PAYMENT';
                      const isOpening = entry.type === 'OPENING';

                      return (
                        <tr key={entry.id} className="hover:bg-slate-800/40 dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors font-sans group">
                          <td className="py-4 px-4 font-mono font-medium dark:text-slate-300 text-slate-800 text-xs">{entry.date}</td>
                          <td className="py-4 px-3 font-sans">
                            {isOpening && <span className="bg-slate-800 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono">OPENING</span>}
                            {isPurchase && <span className="bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center w-max font-mono"><ArrowUpRight className="w-3.5 h-3.5 mr-1" /> {entry.type === 'PURCHASE_VEHICLE' ? 'VEH INWARD' : 'DIRECT BILL'}</span>}
                            {isPayment && <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center w-max font-mono"><ArrowDownRight className="w-3.5 h-3.5 mr-1" /> PAYMENT</span>}
                          </td>
                          <td className="py-4 px-3 max-w-[200px] font-sans">
                            <span className="font-bold dark:text-white text-slate-950 block text-sm">{entry.referenceNo || 'Account Entry'}</span>
                            <span className="text-[11px] dark:text-slate-400 text-slate-600 block truncate font-medium">{entry.variety || entry.note}</span>
                          </td>
                          <td className="py-4 px-3 text-right font-mono dark:text-slate-300 text-slate-800 font-semibold">
                            {entry.weightKg ? `${entry.weightKg} KG` : '-'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono dark:text-slate-300 text-slate-800 font-semibold">
                            {entry.rate ? `₹${entry.rate}` : '-'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                            {isPurchase ? `₹ ${entry.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            {isPayment ? `₹ ${Math.abs(entry.amount).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-black text-teal-600 dark:text-teal-400 bg-teal-950/10 text-sm">
                            ₹ {entry.runningBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-24 text-center dark:text-slate-500 text-slate-400 font-sans text-sm font-medium">
              Select a supplier from the left sidebar to view their complete automated purchase ledger.
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-slate-900 dark:bg-slate-900 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-800 border-slate-200 pb-4 font-sans">
              <h3 className="text-lg font-bold dark:text-white text-slate-900 flex items-center space-x-2">
                <span>Record Payment to Supplier</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4 font-sans text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Paying To:</label>
                <input type="text" readOnly value={selectedSupplier.name} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-3 font-bold" />
              </div>

              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Payment Amount (₹) *</label>
                <input type="number" required value={payAmount === 0 ? '' : payAmount} placeholder="50000" onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-mono font-black rounded-xl p-3 text-lg outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4 font-sans">
                <div>
                  <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Payment Mode</label>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value as any)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-emerald-500 dark:text-white text-slate-900 rounded-xl p-3 outline-none font-bold">
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Reference / Cheque No</label>
                  <input type="text" value={payRefNo} onChange={(e) => setPayRefNo(e.target.value)} placeholder="e.g. NEFT-99120" className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-emerald-500 dark:text-white text-slate-900 rounded-xl p-3 font-mono font-bold outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Payment Note</label>
                <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Advance payment against seasonal load..." className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-emerald-500 dark:text-white text-slate-900 rounded-xl p-3 font-sans outline-none" />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 dark:border-slate-800 border-slate-200">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 bg-slate-800 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl shadow-lg cursor-pointer">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement Preview */}
      <StatementPreview isOpen={showStatement} onClose={() => setShowStatement(false)} title="Supplier Ledger Statement" subtitle={selectedSupplier ? `${selectedSupplier.name} · ${selectedSupplier.code}` : ''} accentColor="#10b981">
        {selectedSupplier && (
          <div className="space-y-6">
            {/* Party Info */}
            <div className="flex justify-between items-start rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex-1 p-4 bg-slate-50/70">
                <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Supplier / Party</div>
                <div className="text-[15px] font-black text-slate-950">{selectedSupplier.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  {selectedSupplier.phone && <div>Phone: {selectedSupplier.phone}</div>}
                  <div>City: {selectedSupplier.city} · Code: {selectedSupplier.code}</div>
                </div>
              </div>
              <div className="p-4 border-l border-slate-200 bg-white text-right min-w-[140px] flex flex-col justify-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-400">Outstanding</div>
                <div className={`text-[16px] font-black font-mono mt-0.5 ${outstandingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{outstandingBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Ledger Table */}
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-emerald-600 text-white">
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px] rounded-tl-md">Date</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Type</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Reference</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Debit</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Credit</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px] rounded-tr-md">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, idx) => {
                  const isPurchase = entry.type === 'PURCHASE_VEHICLE' || entry.type === 'PURCHASE_BILL';
                  return (
                    <tr key={entry.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">{entry.date}</td>
                      <td className="py-2.5 px-3 text-[10px] font-semibold text-slate-700">{isPurchase ? 'Purchase' : entry.type === 'PAYMENT' ? 'Payment' : 'Opening'}</td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-600 truncate max-w-[150px]">{entry.referenceNo || entry.variety || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-rose-700">{entry.amount > 0 ? `₹${entry.amount.toLocaleString('en-IN')}` : ''}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-emerald-700">{entry.amount < 0 ? `₹${Math.abs(entry.amount).toLocaleString('en-IN')}` : ''}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[10.5px] text-slate-900">₹{entry.runningBalance.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </StatementPreview>
    </div>
  );
};
