import React from 'react';
import { VehicleArrival } from '../types';
import { X, Printer, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fmtDate } from '@/utils/format';

interface VehiclePreviewModalProps {
  vehicle: VehicleArrival | null;
  onClose: () => void;
}

export const VehiclePreviewModal: React.FC<VehiclePreviewModalProps> = ({ vehicle, onClose }) => {
  const { settings } = useApp();
  const cs = settings.company;
  if (!vehicle) return null;

  const suppliersCount = new Set(vehicle.rows.map(r => r.supplierId)).size;
  const freight = Number(vehicle.freightCharge) || 0;
  const hamali = Number(vehicle.hamaliCharge) || 0;
  const advance = Number(vehicle.advancePaid) || 0;
  const netPayable = vehicle.totalAmount + freight + hamali - advance;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto animate-fade-in custom-scrollbar">
      <div className="min-h-screen dark:bg-slate-950/90 bg-slate-200/90 backdrop-blur-md flex flex-col items-center py-6 sm:py-12 px-3 sm:px-4">
        {/* Toolbar */}
        <div className="w-full max-w-[850px] mb-4 flex items-center justify-between no-print animate-slide-down">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black dark:text-white text-slate-900 tracking-tight uppercase">Vehicle Receipt Preview</h3>
              <p className="text-[10px] dark:text-slate-400 text-slate-500 font-mono tracking-wider">{vehicle.arrivalNo} · {fmtDate(vehicle.date)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => window.print()} className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95">
              <Printer className="w-4 h-4" /><span>Print / PDF</span>
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
                <div className="inline-block border-2 border-slate-900 px-5 py-3 rounded-lg">
                  <div className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-500">VEHICLE INWARD RECEIPT</div>
                  <div className="text-[22px] font-black font-mono text-slate-950 leading-tight mt-0.5">{vehicle.arrivalNo}</div>
                </div>
                <div className="text-[11px] font-mono text-slate-600 mt-2 font-semibold">{fmtDate(vehicle.date)} &nbsp;({vehicle.day})</div>
              </div>
            </div>

            {/* ── VEHICLE META ───────────────────── */}
            <div className="grid grid-cols-4 gap-0 border border-slate-300 rounded-lg overflow-hidden mb-6 text-[11px]">
              {[
                { label: 'Vehicle No.', value: vehicle.vehicleNo, sub: vehicle.vehicleName || '—', mono: true },
                { label: 'Declared Weight', value: `${vehicle.totalVehicleWeight} KG`, sub: `Actual: ${vehicle.totalCalculatedWeight} KG` },
                { label: 'Fruit Category', value: vehicle.fruitType, sub: `${suppliersCount} Supplier(s)`, bold: true },
                { label: 'Driver / Remarks', value: vehicle.driverName || '—', sub: vehicle.notes || '—' },
              ].map((c, i) => (
                <div key={i} className={`p-3 ${i < 3 ? 'border-r border-slate-300' : ''} ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{c.label}</div>
                  <div className={`font-bold text-slate-900 mt-0.5 ${c.mono ? 'font-mono tracking-wider' : ''}`}>{c.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>
                </div>
              ))}
            </div>

            {/* ── ITEMS TABLE ────────────────────── */}
            <table className="w-full border-collapse text-[11.5px] mb-6 erp-table">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 col-text rounded-tl-lg w-8">#</th>
                  <th className="py-2.5 px-3 col-text">Supplier / Party</th>
                  <th className="py-2.5 px-3 col-text">Variety</th>
                  <th className="py-2.5 px-3 col-num w-24">Carets</th>
                  <th className="py-2.5 px-3 col-num w-24">Weight</th>
                  <th className="py-2.5 px-3 col-num w-24">Rate/KG</th>
                  <th className="py-2.5 px-3 col-num rounded-tr-lg w-32">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.rows.map((row, idx) => (
                  <tr key={row.id} className={`border-b border-slate-200 ${idx % 2 ? 'bg-slate-50/60' : ''}`}>
                    <td className="py-2 px-3 col-text text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 col-text font-semibold text-slate-900">{row.supplierName}</td>
                    <td className="py-2 px-3 col-text text-slate-700 font-medium">{row.variety}</td>
                    <td className="py-2 px-3 col-num font-mono font-semibold">{row.caret}</td>
                    <td className="py-2 px-3 col-num font-mono font-semibold">{row.weight}</td>
                    <td className="py-2 px-3 col-num font-mono">{row.rate.toFixed(2)}</td>
                    <td className="py-2 px-3 col-num font-mono font-bold text-slate-900">{row.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                  <td colSpan={3} className="py-2.5 px-3 col-text text-right text-[10px] uppercase tracking-wider text-slate-500">Total Inward</td>
                  <td className="py-2.5 px-3 col-num font-mono text-emerald-800">{vehicle.totalCarets}</td>
                  <td className="py-2.5 px-3 col-num font-mono text-emerald-800">{vehicle.totalCalculatedWeight}</td>
                  <td className="py-2.5 px-3 col-num text-[10px] text-slate-500">Avg ₹{(vehicle.totalCalculatedWeight > 0 ? vehicle.totalAmount / vehicle.totalCalculatedWeight : 0).toFixed(1)}/kg</td>
                  <td className="py-2.5 px-3 col-num font-mono text-[14px] font-black text-slate-950">₹ {vehicle.totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>

            {/* ── CHARGES SETTLEMENT ─────────────── */}
            {(freight > 0 || hamali > 0 || advance > 0) && (
              <div className="grid grid-cols-4 gap-0 border border-slate-300 rounded-lg overflow-hidden mb-6 text-[11px]">
                <div className="p-3 bg-slate-50 border-r border-slate-300">
                  <div className="text-[9px] font-bold uppercase text-slate-400">+ Freight</div>
                  <div className="font-bold font-mono text-slate-900 mt-0.5">₹ {freight.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-white border-r border-slate-300">
                  <div className="text-[9px] font-bold uppercase text-slate-400">+ Hamali</div>
                  <div className="font-bold font-mono text-slate-900 mt-0.5">₹ {hamali.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-50 border-r border-slate-300">
                  <div className="text-[9px] font-bold uppercase text-red-500">− Advance Paid</div>
                  <div className="font-bold font-mono text-red-700 mt-0.5">₹ {advance.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-900 text-white">
                  <div className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Net Payable</div>
                  <div className="font-black font-mono text-[16px] text-white mt-0.5">₹ {netPayable.toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* ── SIGNATURES ─────────────────────── */}
            <div className="mt-16 pt-0 grid grid-cols-3 gap-8 text-[10px] text-slate-600">
              {['Gate Inspector', 'Weighbridge Operator', `For ${cs.name}`].map((label, i) => (
                <div key={i} className={i === 2 ? 'text-right' : i === 1 ? 'text-center' : ''}>
                  <div className={`border-b border-slate-400 mb-2 ${i === 2 ? 'ml-auto w-44' : i === 1 ? 'mx-auto w-44' : 'w-44'}`} style={{height: '1px'}}></div>
                  <div className="font-bold text-slate-800 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>

            {/* ── FOOTER ─────────────────────────── */}
            <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono">
              Computer generated — Recorded in supplier ledger & stock inventory &nbsp;•&nbsp; {cs.name} ERP
            </div>
          </div>
        </div>
        <div className="h-12 shrink-0" />
      </div>
    </div>
  );
};
