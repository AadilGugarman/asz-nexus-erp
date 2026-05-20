import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserCheck, Search, DollarSign, Printer, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PaymentReceipt } from '../types';
import { useToast } from './ui/Toast';
import { StatementPreview } from './ui/StatementPreview';

export const CustomerModule: React.FC = () => {
  const { customers, getCustomerLedger, addPayment } = useApp();
  const toast = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatement, setShowStatement] = useState(false);

  // Payment Receipt Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('UPI');
  const [payRefNo, setPayRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0];
  }, [selectedCustomerId, customers]);

  const ledgerEntries = useMemo(() => {
    if (!selectedCustomer) return [];
    return getCustomerLedger(selectedCustomer.id);
  }, [selectedCustomer, getCustomerLedger]);

  const outstandingBalance = ledgerEntries.length > 0 ? ledgerEntries[0].runningBalance : (selectedCustomer?.previousBalance || 0);

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || payAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    const newPayment: PaymentReceipt = {
      id: `p-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partyType: 'CUSTOMER',
      partyId: selectedCustomer.id,
      partyName: selectedCustomer.name,
      amount: Number(payAmount),
      paymentMode: payMode,
      referenceNo: payRefNo,
      notes: payNotes
    };

    addPayment(newPayment);
    toast.success('Payment Received', `₹${Number(payAmount).toLocaleString('en-IN')} received from ${selectedCustomer.name}. Customer balance updated.`);
    setShowPaymentModal(false);
    setPayAmount(0);
    setPayRefNo('');
    setPayNotes('');
  };

  const handlePrintLedger = () => {
    setShowStatement(true);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.city.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 dark:bg-slate-900 bg-white p-4 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-md">
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5">
            <UserCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>CUSTOMER BALANCE SYSTEM & LEDGER</span>
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-600 mt-0.5">Automated balance tracking from sales billing & payment receipts</p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 dark:bg-slate-950 bg-slate-100 p-1.5 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>Receive Payment from Customer</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
        {/* LEFT COLUMN: CUSTOMERS LIST */}
        <div className="lg:col-span-1 bg-slate-900 dark:bg-slate-900 bg-white rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl overflow-hidden flex flex-col h-[700px] no-print">
          <div className="p-4 bg-slate-950 dark:bg-slate-950 bg-slate-100 border-b border-slate-800 dark:border-slate-800 border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 dark:text-slate-400 text-slate-600 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search buyer/customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 dark:bg-slate-900 bg-white border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800 dark:divide-slate-800 divide-slate-100 scrollbar-thin">
            {filteredCustomers.map(c => {
              const isSelected = c.id === selectedCustomerId;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-4 cursor-pointer transition-colors font-sans ${
                    isSelected ? 'bg-indigo-500/15 border-l-4 border-indigo-500' : 'hover:bg-slate-800/40 dark:hover:bg-slate-800/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-bold dark:text-white text-slate-900 text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs dark:text-slate-400 text-slate-600 font-sans">
                    <span>{c.city}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">₹ {c.previousBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER ACCOUNT LEDGER */}
        <div className="lg:col-span-3 bg-slate-900 dark:bg-slate-900 bg-white rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl p-6 flex flex-col space-y-6 printable-patti font-sans">
          {selectedCustomer ? (
            <>
              {/* Customer Header Info */}
              <div className="bg-slate-950 dark:bg-slate-950 bg-slate-50 p-6 rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
                <div>
                  <h2 className="text-2xl font-black dark:text-white text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-xs dark:text-slate-400 text-slate-600 mt-1 font-sans">Location: {selectedCustomer.city} | Contact: {selectedCustomer.phone}</p>
                </div>

                <div className="bg-slate-900 dark:bg-slate-900 bg-white p-4 rounded-xl border border-slate-700 dark:border-slate-700 border-slate-200 text-right min-w-[220px] shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 block">Total Outstanding Receivable</span>
                  <span className={`text-2xl font-black font-mono mt-0.5 block ${outstandingBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ₹ {outstandingBalance.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] dark:text-slate-400 text-slate-500 block mt-0.5 font-medium">{outstandingBalance >= 0 ? 'Due from Customer' : 'Advance Credit'}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 font-sans">
                <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
                  <thead>
                    <tr className="bg-slate-950 dark:bg-slate-950 bg-slate-100 dark:text-slate-300 text-slate-900 uppercase font-bold border-b border-slate-800 dark:border-slate-800 border-slate-200 text-[11px]">
                      <th className="py-3.5 px-4 w-28">Date</th>
                      <th className="py-3.5 px-3 w-32">Type</th>
                      <th className="py-3.5 px-3">Invoice # / Description</th>
                      <th className="py-3.5 px-3 text-right text-indigo-600 dark:text-indigo-400">Invoice Amount (Dr)</th>
                      <th className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Payment Recd (Cr)</th>
                      <th className="py-3.5 px-4 text-right font-black text-teal-600 dark:text-teal-400">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 dark:divide-slate-800/80 divide-slate-200 font-mono">
                    {ledgerEntries.map(entry => {
                      const isInvoice = entry.type === 'INVOICE';
                      const isPayment = entry.type === 'PAYMENT';
                      const isOpening = entry.type === 'OPENING';

                      return (
                        <tr key={entry.id} className="hover:bg-slate-800/40 dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors font-sans group">
                          <td className="py-4 px-4 font-mono font-medium dark:text-slate-300 text-slate-800 text-xs">{entry.date}</td>
                          <td className="py-4 px-3 font-sans">
                            {isOpening && <span className="bg-slate-800 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono">OPENING</span>}
                            {isInvoice && <span className="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center w-max font-mono"><ArrowUpRight className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" /> BILL INVOICE</span>}
                            {isPayment && <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center w-max font-mono"><ArrowDownRight className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> RECD PAYMENT</span>}
                          </td>
                          <td className="py-4 px-3 max-w-[240px] font-sans">
                            <span className="font-bold dark:text-white text-slate-950 block text-sm">{entry.referenceNo || 'Account Balance'}</span>
                            <span className="text-[11px] dark:text-slate-400 text-slate-600 block truncate font-medium">{entry.note}</span>
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                            {isInvoice ? `₹ ${entry.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            {isPayment ? `₹ ${Math.abs(entry.amount).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-950/10 text-sm">
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
              Select a customer from the left sidebar to view their complete automated balance ledger.
            </div>
          )}
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-slate-900 dark:bg-slate-900 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-800 border-slate-200 pb-4 font-sans">
              <h3 className="text-lg font-bold dark:text-white text-slate-900 flex items-center space-x-2">
                <span>Receive Payment from Customer</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4 font-sans text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Receiving From Buyer:</label>
                <input type="text" readOnly value={selectedCustomer.name} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-3 font-bold" />
              </div>

              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Amount Received (₹) *</label>
                <input type="number" required value={payAmount === 0 ? '' : payAmount} placeholder="100000" onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-mono font-black rounded-xl p-3 text-lg outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4 font-sans">
                <div>
                  <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Payment Mode</label>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value as any)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 dark:text-white text-slate-900 rounded-xl p-3 outline-none font-bold">
                    <option value="UPI">UPI Transfer</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Reference No</label>
                  <input type="text" value={payRefNo} onChange={(e) => setPayRefNo(e.target.value)} placeholder="e.g. UPI-998812" className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 dark:text-white text-slate-900 rounded-xl p-3 font-mono font-bold outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Receipt Note</label>
                <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Payment cleared for previous invoices..." className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 dark:text-white text-slate-900 rounded-xl p-3 font-sans outline-none" />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 dark:border-slate-800 border-slate-200">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 bg-slate-800 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-black rounded-xl shadow-lg cursor-pointer">Save Payment Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement Preview */}
      <StatementPreview isOpen={showStatement} onClose={() => setShowStatement(false)} title="Customer Account Statement" subtitle={selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.city}` : ''} accentColor="#6366f1">
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Party Info */}
            <div className="flex justify-between items-start rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex-1 p-4 bg-slate-50/70">
                <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Customer / Buyer</div>
                <div className="text-[15px] font-black text-slate-950">{selectedCustomer.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  {selectedCustomer.phone && <div>Phone: {selectedCustomer.phone}</div>}
                  <div>City: {selectedCustomer.city}</div>
                </div>
              </div>
              <div className="p-4 border-l border-slate-200 bg-white text-right min-w-[140px] flex flex-col justify-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-400">Outstanding</div>
                <div className={`text-[16px] font-black font-mono mt-0.5 ${outstandingBalance >= 0 ? 'text-indigo-700' : 'text-emerald-700'}`}>₹{outstandingBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Ledger Table */}
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px] rounded-tl-md">Date</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Type</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Reference</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Debit</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Credit</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px] rounded-tr-md">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, idx) => (
                  <tr key={entry.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">{entry.date}</td>
                    <td className="py-2.5 px-3 text-[10px] font-semibold text-slate-700">{entry.type === 'INVOICE' ? 'Invoice' : entry.type === 'PAYMENT' ? 'Payment' : 'Opening'}</td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-600 truncate max-w-[150px]">{entry.referenceNo || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-rose-700">{entry.amount > 0 ? `₹${entry.amount.toLocaleString('en-IN')}` : ''}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-emerald-700">{entry.amount < 0 ? `₹${Math.abs(entry.amount).toLocaleString('en-IN')}` : ''}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[10.5px] text-slate-900">₹{entry.runningBalance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StatementPreview>
    </div>
  );
};
