import React from 'react';
import { QrCode } from 'lucide-react';
import { CompanySettings, Invoice, InvoiceSettings } from '../../types';
import { normalizeInvoiceTemplate } from '../../utils/invoice-number';

interface InvoiceTemplateRendererProps {
  invoice: Invoice;
  company: CompanySettings;
  invoiceSettings: InvoiceSettings;
  className?: string;
}

const currency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const watermarkStyle = (settings: InvoiceSettings): React.CSSProperties => {
  const opacity = Math.max(0.04, Math.min(0.35, settings.watermarkOpacity ?? 0.08));
  const scale = Math.max(40, Math.min(220, settings.watermarkSize ?? 110));
  const size = `${scale}%`;

  const positionMap: Record<InvoiceSettings['watermarkPosition'], string> = {
    center: '50% 50%',
    'top-left': '8% 10%',
    'top-right': '92% 10%',
    'bottom-left': '8% 88%',
    'bottom-right': '92% 88%',
  };

  return {
    opacity,
    backgroundRepeat: settings.watermarkRepeat ? 'repeat' : 'no-repeat',
    backgroundSize: settings.watermarkRepeat ? '240px auto' : size,
    backgroundPosition: positionMap[settings.watermarkPosition || 'center'],
  };
};

const InvoiceWatermark: React.FC<{ settings: InvoiceSettings; company: CompanySettings }> = ({ settings, company }) => {
  if (settings.watermarkType === 'none') return null;

  if (settings.watermarkType === 'text') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 flex items-center justify-center" style={watermarkStyle(settings)}>
          <p
            className="select-none whitespace-nowrap font-black uppercase tracking-[0.25em] text-slate-300"
            style={{ fontSize: `${Math.max(22, Math.min(72, (settings.watermarkSize || 110) * 0.45))}px` }}
          >
            {settings.watermarkText?.trim() || company.name}
          </p>
        </div>
      </div>
    );
  }

  const imageSource = settings.watermarkType === 'logo' ? company.logo : settings.watermarkImage;
  if (!imageSource) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{
        ...watermarkStyle(settings),
        backgroundImage: `url(${imageSource})`,
      }}
    />
  );
};

const SharedHeader: React.FC<{ invoice: Invoice; company: CompanySettings; settings: InvoiceSettings; accent: string; compact?: boolean }> = ({ invoice, company, settings, accent, compact }) => {
  const effectiveLogo = settings.enableInvoiceLogo && settings.invoiceLogo ? settings.invoiceLogo : company.logo;
  return (
    <div className={`flex ${compact ? 'items-start' : 'items-start justify-between'} gap-3 ${compact ? 'pb-3 border-b border-dashed border-slate-300' : 'pb-5 border-b-2'}`} style={!compact ? { borderColor: `${accent}66` } : undefined}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {effectiveLogo ? (
            <img src={effectiveLogo} alt={company.name} className={`${compact ? 'h-8 max-w-[80px]' : 'h-11 max-w-[120px]'} object-contain shrink-0`} />
          ) : (
            <div className={`${compact ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-sm'} rounded-lg text-white font-black flex items-center justify-center shrink-0`} style={{ backgroundColor: accent }}>
              {company.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className={`${compact ? 'text-[15px]' : 'text-[24px]'} font-black uppercase tracking-tight leading-none`}>{company.name}</h1>
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-slate-500 mt-1`}>{company.tagline}</p>
          </div>
        </div>
        {settings.showCompanyDetails !== false && (
          <div className={`${compact ? 'text-[9px]' : 'text-[10.5px]'} text-slate-500 mt-2 leading-relaxed`}>
            <p>{company.address}</p>
            <p>{company.phone} | {company.email}</p>
            {company.gstin && <p className="font-mono font-semibold">GSTIN: {company.gstin}</p>}
          </div>
        )}
      </div>
      <div className={`shrink-0 ${compact ? 'text-right' : 'text-right'}`}>
        <div className={`${compact ? 'px-2.5 py-1.5' : 'px-4 py-2.5'} rounded-lg border font-mono`} style={{ borderColor: accent, color: accent }}>
          <p className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-bold uppercase tracking-[0.18em]`}>Invoice</p>
          <p className={`${compact ? 'text-[12px]' : 'text-[18px]'} font-black mt-0.5 text-slate-900`}>{invoice.invoiceNo}</p>
        </div>
        <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-semibold text-slate-500 mt-1.5`}>Date: {invoice.date}</p>
      </div>
    </div>
  );
};

const ItemTable: React.FC<{ invoice: Invoice; mode: ReturnType<typeof normalizeInvoiceTemplate>; accent: string }> = ({ invoice, mode, accent }) => {
  const headClass = mode === 'classic'
    ? 'bg-slate-800 text-white'
    : mode === 'minimal'
    ? 'bg-slate-100 text-slate-700 border-y border-slate-300'
    : mode === 'professional'
    ? 'bg-slate-900 text-white uppercase tracking-wide'
    : 'text-white';

  return (
    <table className={`w-full border-collapse ${mode === 'thermal' ? 'text-[10px]' : 'text-[11px]'} mt-5`}>
      <thead>
        <tr className={headClass} style={mode === 'modern' ? { backgroundColor: accent } : undefined}>
          <th className="py-2 px-2.5 text-left font-bold">#</th>
          <th className="py-2 px-2.5 text-left font-bold">Item</th>
          <th className="py-2 px-2.5 text-left font-bold">Variety</th>
          <th className="py-2 px-2.5 text-right font-bold">Crt</th>
          <th className="py-2 px-2.5 text-right font-bold">Wt</th>
          <th className="py-2 px-2.5 text-right font-bold">Rate</th>
          <th className="py-2 px-2.5 text-right font-bold">Amount</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item, idx) => (
          <tr
            key={item.id}
            className={
              mode === 'minimal'
                ? 'border-b border-slate-200'
                : idx % 2 === 0
                ? 'bg-white border-b border-slate-100'
                : 'bg-slate-50/70 border-b border-slate-100'
            }
          >
            <td className="py-2 px-2.5 text-slate-500 font-mono">{idx + 1}</td>
            <td className="py-2 px-2.5 font-semibold">{item.fruit}</td>
            <td className="py-2 px-2.5 text-slate-600">{item.lotVariety}</td>
            <td className="py-2 px-2.5 text-right font-mono">{item.caret}</td>
            <td className="py-2 px-2.5 text-right font-mono">{item.weight}</td>
            <td className="py-2 px-2.5 text-right font-mono">{currency(item.rate)}</td>
            <td className="py-2 px-2.5 text-right font-mono font-bold">{currency(item.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const ThermalTemplate: React.FC<{ invoice: Invoice; company: CompanySettings; settings: InvoiceSettings }> = ({ invoice, company, settings }) => {
  const subtotal = invoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const hamali = Number(invoice.hamali) || 0;
  const discount = Number(invoice.discount) || 0;

  return (
    <div className="mx-auto w-full max-w-[420px] border border-slate-300 bg-white text-slate-900 font-mono p-4 text-[11px] leading-relaxed">
      <InvoiceWatermark settings={settings} company={company} />
      <div className="relative z-10">
        <div className="text-center pb-2 border-b border-dashed border-slate-400">
          <p className="text-[16px] font-black tracking-wide">{company.name.toUpperCase()}</p>
          <p className="text-[10px]">{company.address}</p>
          <p className="text-[10px]">{company.phone}</p>
        </div>

        <div className="py-2 border-b border-dashed border-slate-400">
          <div className="flex justify-between"><span>Invoice</span><span>{invoice.invoiceNo}</span></div>
          <div className="flex justify-between"><span>Date</span><span>{invoice.date}</span></div>
          <div className="flex justify-between"><span>Customer</span><span className="truncate max-w-[180px] text-right">{invoice.customerName}</span></div>
        </div>

        <div className="py-1 border-b border-dashed border-slate-400">
          {invoice.items.map((item) => (
            <div key={item.id} className="py-1">
              <div className="flex justify-between gap-2"><span className="truncate">{item.fruit} ({item.lotVariety})</span><span>{currency(item.amount)}</span></div>
              <div className="text-[10px] text-slate-600">{item.weight}kg x {currency(item.rate)}</div>
            </div>
          ))}
        </div>

        <div className="py-2 border-b border-dashed border-slate-400">
          <div className="flex justify-between"><span>Subtotal</span><span>{currency(subtotal)}</span></div>
          {hamali > 0 && <div className="flex justify-between"><span>Hamali</span><span>{currency(hamali)}</span></div>}
          {discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{currency(discount)}</span></div>}
          <div className="flex justify-between text-[12px] font-black mt-1"><span>TOTAL</span><span>{currency(invoice.todayAmount)}</span></div>
        </div>

        <div className="pt-2 flex justify-between text-[10px]">
          <div className="w-16 h-16 border border-dashed border-slate-500 flex items-center justify-center text-center">QR</div>
          <div className="w-24 h-16 border border-dashed border-slate-500 flex items-center justify-center text-center">BARCODE</div>
        </div>

        <p className="text-center text-[10px] pt-3 border-t border-dashed border-slate-400 mt-3">Thank you. Visit again.</p>
      </div>
    </div>
  );
};

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateRendererProps> = ({ invoice, company, invoiceSettings, className = '' }) => {
  const template = normalizeInvoiceTemplate(invoiceSettings.templateStyle);
  if (template === 'thermal') {
    return <ThermalTemplate invoice={invoice} company={company} settings={invoiceSettings} />;
  }

  const accent = invoiceSettings.brandColor || '#4f46e5';
  const subtotal = invoice.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const hamali = Number(invoice.hamali) || 0;
  const discount = Number(invoice.discount) || 0;
  const totalCarets = invoice.items.reduce((s, i) => s + (Number(i.caret) || 0), 0);
  const totalWeight = invoice.items.reduce((s, i) => s + (Number(i.weight) || 0), 0);
  const tax = (invoiceSettings.defaultTaxRate ?? 0) > 0 ? Math.round((subtotal * (invoiceSettings.defaultTaxRate || 0)) / 100) : 0;

  const panelClass = template === 'minimal'
    ? 'border border-slate-200 rounded-none'
    : template === 'professional'
    ? 'border border-slate-300 rounded-sm'
    : template === 'classic'
    ? 'border-2 border-slate-300 rounded-lg'
    : 'border border-slate-200 rounded-xl';

  return (
    <div className={`relative bg-white text-slate-900 ${panelClass} ${className}`}>
      <InvoiceWatermark settings={invoiceSettings} company={company} />

      <div className={`relative z-10 ${template === 'professional' ? 'p-9' : 'p-8'} sm:p-10`}>
        <SharedHeader invoice={invoice} company={company} settings={invoiceSettings} accent={accent} />

        <div className={`mt-5 p-3 border ${template === 'classic' ? 'border-double border-slate-300 bg-amber-50/20' : 'border-slate-200 bg-slate-50/70'} rounded-lg`}>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">Billed To</p>
          <p className="text-[16px] font-black mt-1">{invoice.customerName}</p>
          {invoice.notes && <p className="text-[10px] text-slate-500 mt-1">Note: {invoice.notes}</p>}
        </div>

        <ItemTable invoice={invoice} mode={template} accent={accent} />

        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-[350px] border border-slate-200 rounded-lg overflow-hidden text-[11px]">
            <div className="flex justify-between px-3 py-2 bg-slate-50">
              <span>Subtotal ({totalCarets} crt, {totalWeight}kg)</span>
              <span className="font-mono font-bold">{currency(subtotal)}</span>
            </div>
            {hamali > 0 && <div className="flex justify-between px-3 py-2 border-t border-slate-100"><span>Hamali</span><span className="font-mono">{currency(hamali)}</span></div>}
            {discount > 0 && <div className="flex justify-between px-3 py-2 border-t border-slate-100"><span>Discount</span><span className="font-mono">-{currency(discount)}</span></div>}
            {tax > 0 && <div className="flex justify-between px-3 py-2 border-t border-slate-100"><span>Tax ({invoiceSettings.defaultTaxRate}%)</span><span className="font-mono">{currency(tax)}</span></div>}
            <div className="flex justify-between px-3 py-2.5 text-white" style={{ backgroundColor: template === 'classic' ? '#1f2937' : accent }}>
              <span className="font-black tracking-wide uppercase">Net Total</span>
              <span className="font-mono font-black text-[15px]">{currency(invoice.todayAmount)}</span>
            </div>
          </div>
        </div>

        {invoiceSettings.showPaymentDetails !== false && (invoiceSettings.showBankDetails || invoiceSettings.showUPI) && company.bankName && (
          <div className="mt-5 p-3 border border-slate-200 rounded-lg bg-slate-50/70 text-[10px] flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-[11px]">Payment Details</p>
              {invoiceSettings.showBankDetails && <p>{company.bankName} | A/C {company.accountNo} | IFSC {company.ifsc}</p>}
              {invoiceSettings.showUPI && <p>UPI: {company.upiId}</p>}
            </div>
            {invoiceSettings.enableQR !== false && <QrCode className="w-10 h-10 text-slate-700" />}
          </div>
        )}
      </div>
    </div>
  );
};
