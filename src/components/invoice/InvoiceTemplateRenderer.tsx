import React from 'react';
import { QrCode, Phone, MapPin, Mail, Building2, User, Landmark } from 'lucide-react';
import { CompanySettings, Invoice, InvoiceSettings } from '../../types';
import { normalizeInvoiceTemplate } from '../../utils/invoice-number';
import { fmtDate } from '../../utils/format';

interface InvoiceTemplateRendererProps {
  invoice: Invoice;
  company: CompanySettings;
  invoiceSettings: InvoiceSettings;
  className?: string;
}

const currency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const watermarkStyle = (settings: InvoiceSettings): React.CSSProperties => {
  const opacity = Math.max(0.01, Math.min(0.4, settings.watermarkOpacity ?? 0.08));
  const scale = Math.max(20, Math.min(300, settings.watermarkSize ?? 110));
  const size = `${scale}%`;
  const rotation = settings.watermarkRotation || 0;

  return {
    opacity,
    backgroundRepeat: settings.watermarkRepeat ? 'repeat' : 'no-repeat',
    backgroundSize: settings.watermarkRepeat ? '240px auto' : size,
    backgroundPosition: '50% 50%',
    transform: `rotate(${rotation}deg)`,
  };
};

const InvoiceWatermark: React.FC<{ settings: InvoiceSettings; company: CompanySettings }> = ({ settings, company }) => {
  const type = settings.templateStyle === 'initials' ? 'initials' : (settings.templateStyle === 'watermark' ? 'image' : 'none');
  
  if (type === 'none' && settings.watermarkType === 'none') return null;
  const effectiveType = type !== 'none' ? type : settings.watermarkType;

  if (effectiveType === 'initials' || effectiveType === 'text') {
    const text = effectiveType === 'initials' 
      ? (settings.watermarkText?.trim() || company.name.split(' ').map(w => w[0]).join('').toUpperCase())
      : (settings.watermarkText?.trim() || company.name);
      
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center z-0" aria-hidden>
        <p
          className="select-none whitespace-nowrap font-black uppercase tracking-[0.25em] text-slate-400/20 text-center"
          style={{ 
            fontSize: `${Math.max(40, (settings.watermarkSize || 110) * 1.5)}px`,
            transform: `rotate(${settings.watermarkRotation || -25}deg)`,
            opacity: settings.watermarkOpacity || 0.05
          }}
        >
          {text}
        </p>
      </div>
    );
  }

  const imageSource = effectiveType === 'logo' ? company.logo : settings.watermarkImage;
  if (!imageSource) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 flex items-center justify-center" aria-hidden>
      <div
        className="w-full h-full"
        style={{
          ...watermarkStyle(settings),
          backgroundImage: `url(${imageSource})`,
        }}
      />
    </div>
  );
};

const ModernHeader: React.FC<{ invoice: Invoice; company: CompanySettings; settings: InvoiceSettings; accent: string }> = ({ invoice, company, settings, accent }) => {
  const effectiveLogo = settings.enableInvoiceLogo && settings.invoiceLogo ? settings.invoiceLogo : company.logo;
  const contacts = [company.phone, company.phone2, company.phone3].filter(Boolean);

  return (
    <div className="pb-8 border-b-2 border-slate-100">
      {/* Top Contact Row */}
      <div className="flex justify-end gap-6 mb-6">
        {contacts.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
            <Phone className="w-3 h-3 text-slate-400" />
            {c}
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Left: Logo */}
        <div className="shrink-0">
          {effectiveLogo ? (
            <img src={effectiveLogo} alt={company.name} className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-3xl bg-slate-50 p-3 shadow-inner" />
          ) : (
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl text-white font-black flex items-center justify-center text-3xl shadow-xl" style={{ backgroundColor: accent }}>
              {company.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* Center: Branding */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase mb-2">
            {company.name}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-[0.15em] mb-4">
            {company.tagline || 'Smart Billing & Trading Management System'}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-1.5 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {company.address}</span>
            {company.gstin && <span className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-slate-400" /> GSTIN: <span className="text-slate-900">{company.gstin}</span></span>}
            {company.email && <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {company.email}</span>}
          </div>
        </div>

        {/* Right: Invoice Info */}
        <div className="shrink-0 flex flex-col items-center md:items-end">
          <div className="px-6 py-4 rounded-3xl border-2 border-slate-100 bg-slate-50/50 text-right shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Invoice</p>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{invoice.invoiceNo}</p>
            <p className="text-[11px] font-black text-slate-900 mt-2 flex items-center justify-end gap-2">
              <span className="text-slate-400 uppercase tracking-widest">Date</span>
              <span className="font-mono">{fmtDate(invoice.date)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModernItemTable: React.FC<{ invoice: Invoice; accent: string }> = ({ invoice, accent }) => {
  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
      <table className="w-full border-collapse text-[11px] sm:text-[12px] erp-table">
        <thead>
          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <th className="py-5 px-6 col-text font-black uppercase tracking-wider w-12">#</th>
            <th className="py-5 px-2 col-text font-black uppercase tracking-wider">Description</th>
            <th className="py-5 px-2 col-text font-black uppercase tracking-wider">Variety</th>
            <th className="py-5 px-2 col-num font-black uppercase tracking-wider w-16">Crt</th>
            <th className="py-5 px-2 col-num font-black uppercase tracking-wider w-24">Weight</th>
            <th className="py-5 px-2 col-num font-black uppercase tracking-wider w-24">Rate</th>
            <th className="py-5 px-6 col-num font-black uppercase tracking-wider w-32">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {invoice.items.map((item, idx) => (
            <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
              <td className="py-4 px-6 col-text text-slate-400 font-mono">{idx + 1}</td>
              <td className="py-4 px-2 col-text font-black text-slate-900">{item.fruit}</td>
              <td className="py-4 px-2 col-text text-slate-600 font-bold uppercase tracking-tight">{item.lotVariety}</td>
              <td className="py-4 px-2 col-num font-mono font-black text-slate-700">{item.caret}</td>
              <td className="py-4 px-2 col-num font-mono font-black text-slate-700">{item.weight} <span className="text-[9px] text-slate-400">KG</span></td>
              <td className="py-4 px-2 col-num font-mono text-slate-600 font-bold">{currency(item.rate)}</td>
              <td className="py-4 px-6 col-num font-mono font-black text-slate-900 text-[13px]">{currency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ModernTotals: React.FC<{ invoice: Invoice; settings: InvoiceSettings; accent: string }> = ({ invoice, settings, accent }) => {
  const subtotal = invoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalCarets = invoice.items.reduce((s, i) => s + (Number(i.caret) || 0), 0);
  const totalWeight = invoice.items.reduce((s, i) => s + (Number(i.weight) || 0), 0);
  const freight = Number(invoice.freight) || 0;
  const hamali = Number(invoice.hamali) || 0;
  
  return (
    <div className="mt-10 flex flex-col md:flex-row justify-between gap-10">
      {/* Ledger Summary */}
      <div className="flex-1 max-w-sm">
        <div className="rounded-3xl bg-slate-50 border-2 border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="w-4 h-4 text-slate-400" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statement Summary</h4>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Previous Balance</span>
            <span className="font-mono font-black text-slate-700">{currency(invoice.previousBalance)}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs text-indigo-600 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
            <span className="font-bold uppercase tracking-wider">+ Current Invoice</span>
            <span className="font-mono font-black">{currency(invoice.todayAmount)}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs text-emerald-600">
            <span className="font-bold uppercase tracking-wider">− Amount Paid</span>
            <span className="font-mono font-black">{currency(invoice.paidAmount)}</span>
          </div>

          <div className="pt-4 border-t-2 border-white flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Final Closing</p>
              <p className="text-[11px] font-black text-slate-900 uppercase">Ledger Balance</p>
            </div>
            <span className="text-xl font-black font-mono text-slate-900" style={{ color: accent }}>{currency(invoice.remainingBalance)}</span>
          </div>
        </div>

        {/* Caret Balance Highlight */}
        <div className="mt-4 px-6 py-4 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">Final Caret Balance</span>
          </div>
          <span className="text-lg font-black font-mono text-amber-700">{(Number(invoice.remainingCaretBalance) || 0)} <span className="text-[10px]">CRT</span></span>
        </div>
      </div>

      {/* Invoice Summary */}
      <div className="w-full md:w-96 space-y-3">
        <div className="space-y-2.5 px-6">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Subtotal ({totalCarets} Crt / {totalWeight}kg)</span>
            <span className="font-mono text-slate-900">{currency(subtotal)}</span>
          </div>
          {freight > 0 && (
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Freight (Bhaada)</span>
              <span className="font-mono text-slate-900">{currency(freight)}</span>
            </div>
          )}
          {hamali > 0 && (
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Labour (Hamali)</span>
              <span className="font-mono text-slate-900">{currency(hamali)}</span>
            </div>
          )}
        </div>
        
        <div className="mt-6 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-500/30 overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-1 opacity-70 font-black text-[11px] uppercase tracking-[0.3em]">
              Net Payable Amount
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-4xl font-black font-mono tracking-tighter">
                {currency(invoice.todayAmount)}
              </span>
              <span className="text-[12px] font-black bg-white/20 px-3 py-1 rounded-xl backdrop-blur-lg">INR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ThermalTemplate: React.FC<{ invoice: Invoice; company: CompanySettings; settings: InvoiceSettings }> = ({ invoice, company, settings }) => {
  const subtotal = invoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const freight = Number(invoice.freight) || 0;
  const hamali = Number(invoice.hamali) || 0;
  const otherCharges = Number(invoice.otherCharges) || 0;
  const totalCarets = invoice.items.reduce((s, i) => s + (Number(i.caret) || 0), 0);
  const contacts = [company.phone, company.phone2, company.phone3].filter(Boolean);
  const accent = settings.brandColor || '#f97316'; // Default orange for thermal strip

  return (
    <div className="mx-auto w-full max-w-[420px] bg-white text-slate-950 font-mono p-0 text-[12px] leading-tight border border-slate-200">
      {/* Mandi Style Header Strip */}
      <div className="p-4 text-white relative overflow-hidden" style={{ background: `linear-gradient(to right, ${accent}, ${accent}dd)` }}>
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img src={company.logo} alt="Logo" className="w-12 h-12 rounded-xl bg-white/20 p-1 object-contain backdrop-blur-md" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl backdrop-blur-md">A</div>
            )}
            <div>
              <p className="text-[16px] font-black tracking-tight leading-none uppercase">{company.name}</p>
              <p className="text-[9px] font-bold opacity-80 mt-1 uppercase tracking-tighter">Smart Billing System</p>
            </div>
          </div>
          <div className="text-right">
            {contacts.map((c, i) => (
              <p key={i} className="text-[10px] font-black leading-tight">{c}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 pt-2">
        <div className="text-center py-2 border-b border-dashed border-slate-300">
          <p className="text-[10px] font-bold uppercase">{company.address}</p>
          {company.gstin && <p className="text-[10px] font-black mt-1">GSTIN: {company.gstin}</p>}
        </div>

        <div className="py-2 border-b border-slate-200 flex justify-between text-[11px] font-bold">
          <div className="space-y-0.5">
            <p>BILL: <span className="font-black">{invoice.invoiceNo}</span></p>
            <p>DATE: {fmtDate(invoice.date)}</p>
          </div>
          <div className="text-right">
            <p className="font-black uppercase">{invoice.customerName}</p>
            {invoice.vehicleNo && <p className="text-[10px]">VEH: {invoice.vehicleNo}</p>}
          </div>
        </div>

        <div className="py-3">
          <div className="flex font-black border-b-2 border-black pb-1 mb-2 text-[10px] uppercase">
            <span className="flex-1">DESCRIPTION</span>
            <span className="w-10 text-right">QTY</span>
            <span className="w-14 text-right">RATE</span>
            <span className="w-18 text-right">AMOUNT</span>
          </div>
          {invoice.items.map((item, idx) => (
            <div key={item.id} className="py-1.5 border-b border-slate-100 last:border-0">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="font-black leading-none">{item.fruit}</p>
                  <p className="text-[9px] text-slate-500 mt-1 uppercase">{item.lotVariety} · {item.caret} CRT</p>
                </div>
                <span className="w-10 text-right font-black">{item.weight}</span>
                <span className="w-14 text-right">{item.rate}</span>
                <span className="w-18 text-right font-black">{item.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="py-3 border-t-2 border-black space-y-1.5">
          <div className="flex justify-between font-bold"><span>SUBTOTAL</span><span>{currency(subtotal)}</span></div>
          {freight > 0 && <div className="flex justify-between text-slate-600"><span>FREIGHT (BHAADA)</span><span>+ {currency(freight)}</span></div>}
          {hamali > 0 && <div className="flex justify-between text-slate-600"><span>LABOUR (HAMALI)</span><span>+ {currency(hamali)}</span></div>}
          {otherCharges > 0 && <div className="flex justify-between text-slate-600"><span>OTHER CHARGES</span><span>+ {currency(otherCharges)}</span></div>}
          
          <div className="flex justify-between text-[16px] font-black bg-slate-900 text-white p-2 rounded-lg mt-2">
            <span>NET BILL TOTAL</span>
            <span>{currency(invoice.todayAmount)}</span>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl border-2 border-slate-200 bg-slate-50 space-y-2">
          <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
            <span>Previous Due</span>
            <span>{currency(invoice.previousBalance)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
            <span>Today's Bill</span>
            <span>+ {currency(invoice.todayAmount)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase">
            <span>Paid Amount</span>
            <span>- {currency(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-[13px] font-black border-t-2 border-slate-200 pt-2 uppercase">
            <span>Running Balance</span>
            <span style={{ color: accent }}>{currency(invoice.remainingBalance)}</span>
          </div>
        </div>

        <div className="mt-4 text-center border-t border-dashed border-slate-300 pt-4">
          {settings.showUPI && company.upiId && (
            <div className="mb-4 inline-block p-2 border-2 border-slate-100 rounded-2xl bg-white shadow-sm">
              <div className="w-24 h-24 bg-slate-50 flex items-center justify-center rounded-xl">
                <QrCode className="w-12 h-12 text-slate-300" />
              </div>
              <p className="text-[10px] font-black mt-2 uppercase tracking-widest">Scan to Pay</p>
            </div>
          )}
          <p className="text-[10px] font-black uppercase tracking-tighter">Thanks for your business!</p>
          <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest italic">Subject to APMC Market Rules</p>
        </div>
      </div>
    </div>
  );
};

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateRendererProps> = ({ invoice, company, invoiceSettings, className = '' }) => {
  const template = normalizeInvoiceTemplate(invoiceSettings.templateStyle);
  const accent = invoiceSettings.brandColor || '#4f46e5';

  if (template === 'thermal') {
    return <ThermalTemplate invoice={invoice} company={company} settings={invoiceSettings} />;
  }

  return (
    <div className={`relative bg-white text-slate-900 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl ${className} group/invoice`}>
      {/* Print Overlay - ensures white background on print */}
      <div className="absolute inset-0 bg-white pointer-events-none z-[-1] print:block hidden" />
      
      <InvoiceWatermark settings={invoiceSettings} company={company} />

      <div className="relative z-10 p-10 sm:p-14">
        <ModernHeader invoice={invoice} company={company} settings={invoiceSettings} accent={accent} />

        <div className="mt-12 flex flex-col sm:flex-row justify-between items-start gap-10">
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Billed To — Customer</p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[1.25rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{invoice.customerName}</h3>
                <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-2">
                  Customer ID: <span className="text-slate-900 font-mono">#{invoice.customerId.slice(-6).toUpperCase()}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right min-w-[200px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Billing Status</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-black text-[11px] uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Credit Account
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider italic">Market Trading Terms Apply</p>
          </div>
        </div>

        <ModernItemTable invoice={invoice} accent={accent} />
        
        <ModernTotals invoice={invoice} settings={invoiceSettings} accent={accent} />

        {/* Footer */}
        <div className="mt-16 pt-10 border-t-2 border-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div className="space-y-6">
              <div>
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Terms & Conditions</h5>
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm italic font-medium">
                  {invoiceSettings.termsText || 'Subject to APMC market yard rules. Goods once sold will not be taken back. Payment expected within 15 days.'}
                </p>
              </div>
              {invoiceSettings.showBankDetails && (
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 inline-block">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Bank Transfer Info</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-bold">
                    <span className="text-slate-400 uppercase">Bank</span>
                    <span className="text-slate-900">{company.bankName}</span>
                    <span className="text-slate-400 uppercase">A/C No</span>
                    <span className="text-slate-900 font-mono">{company.accountNo}</span>
                    <span className="text-slate-400 uppercase">IFSC</span>
                    <span className="text-slate-900 font-mono">{company.ifsc}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <div className="w-56 h-16 border-b-2 border-slate-100 mb-3 flex items-center justify-center text-slate-200 font-black uppercase text-[10px] tracking-widest">
                Digital Signature
              </div>
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Authorized Signatory</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1">For {company.name}</p>
            </div>
          </div>
          <div className="mt-16 text-center">
            <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] select-none">Computer Generated Invoice — {company.name} ERP</p>
          </div>
        </div>
      </div>
    </div>
  );
};
