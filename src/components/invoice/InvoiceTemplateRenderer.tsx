import React from "react";
import QRCode from "react-qr-code";
import {
  Phone,
  MapPin,
  Mail,
  Building2,
  User,
  Landmark,
  Package,
} from "lucide-react";
import { CompanySettings, Invoice, InvoiceSettings } from "../../types";
import { normalizeInvoiceTemplate } from "../../utils/invoice-number";
import {
  fmtDate,
  sumCurrency,
  roundCurrency,
  getFruitPricingType,
} from "../../utils/format";
import { useApp } from "@/context/useApp";

interface InvoiceTemplateRendererProps {
  invoice: Invoice;
  company: CompanySettings;
  invoiceSettings: InvoiceSettings;
  className?: string;
}

const currency = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const watermarkStyle = (settings: InvoiceSettings): React.CSSProperties => {
  const opacity = Math.max(
    0.01,
    Math.min(0.4, settings.watermarkOpacity ?? 0.08),
  );
  const scale = Math.max(20, Math.min(300, settings.watermarkSize ?? 110));
  const size = `${scale}%`;
  const rotation = settings.watermarkRotation || 0;

  return {
    opacity,
    backgroundRepeat: settings.watermarkRepeat ? "repeat" : "no-repeat",
    backgroundSize: settings.watermarkRepeat ? "240px auto" : size,
    backgroundPosition: "50% 50%",
    transform: `rotate(${rotation}deg)`,
  };
};

const InvoiceWatermark: React.FC<{
  settings: InvoiceSettings;
  company: CompanySettings;
}> = ({ settings, company }) => {
  const type =
    settings.templateStyle === "initials"
      ? "initials"
      : settings.templateStyle === "watermark"
        ? "image"
        : "none";

  if (type === "none" && settings.watermarkType === "none") return null;
  const effectiveType = type !== "none" ? type : settings.watermarkType;

  if (effectiveType === "initials" || effectiveType === "text") {
    const text =
      effectiveType === "initials"
        ? settings.watermarkText?.trim() ||
          getInitials(company.name) ||
          company.name.slice(0, 2).toUpperCase()
        : settings.watermarkText?.trim() || company.name;

    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center z-0"
        aria-hidden
      >
        <p
          className="select-none whitespace-nowrap font-black uppercase tracking-[0.3em] text-slate-400 text-center"
          style={{
            fontSize: `${Math.max(80, (settings.watermarkSize || 110) * 2.8)}px`,
            transform: `rotate(${settings.watermarkRotation || -25}deg)`,
            opacity: settings.watermarkOpacity || 0.08,
          }}
        >
          {text}
        </p>
      </div>
    );
  }

  const imageSource =
    effectiveType === "logo" ? company.logo : settings.watermarkImage;
  if (!imageSource) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-0 flex items-center justify-center"
      aria-hidden
    >
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

/** Generate up to 3 initials from a company name, skipping common filler words */
const getInitials = (name: string): string => {
  const skip = new Set([
    "and",
    "&",
    "of",
    "the",
    "a",
    "an",
    "co",
    "ltd",
    "pvt",
    "llp",
  ]);
  return name
    .split(/\s+/)
    .filter((w) => w && !skip.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .slice(0, 3)
    .join("");
};

/**
 * Returns the optimal font size for an initials badge based on character count.
 * Ensures text never overflows and stays perfectly centered.
 */
const getInitialsFontSize = (initials: string, badgeSize: number): string => {
  const len = initials.length;
  if (len <= 1) return `${Math.round(badgeSize * 0.48)}px`;
  if (len === 2) return `${Math.round(badgeSize * 0.38)}px`;
  if (len === 3) return `${Math.round(badgeSize * 0.3)}px`;
  return `${Math.round(badgeSize * 0.24)}px`; // 4+ chars
};

/** Renders a perfectly centered, auto-scaled initials badge */
const InitialsBadge: React.FC<{
  initials: string;
  size: number;
  background: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ initials, size, background, className = "", style }) => (
  <div
    className={`shrink-0 rounded-2xl text-white font-black select-none overflow-hidden ${className}`}
    style={{
      width: size,
      height: size,
      background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 1,
      letterSpacing: initials.length >= 3 ? "0.04em" : "0.02em",
      fontSize: getInitialsFontSize(initials, size),
      ...style,
    }}
    aria-label={`Company initials: ${initials}`}
  >
    {initials}
  </div>
);

const ModernHeader: React.FC<{
  invoice: Invoice;
  company: CompanySettings;
  settings: InvoiceSettings;
  accent: string;
}> = ({ invoice, company, settings, accent }) => {
  const effectiveLogo =
    settings.enableInvoiceLogo && settings.invoiceLogo
      ? settings.invoiceLogo
      : company.logo;
  const contacts = [company.phone, company.phone2, company.phone3].filter(
    Boolean,
  );
  const initials =
    settings.watermarkText?.trim() ||
    getInitials(company.name) ||
    company.name.slice(0, 2).toUpperCase();
  // Build a gradient from the accent color for a premium look
  const badgeBg = `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`;

  return (
    <div className="pb-6 border-b-2 border-slate-100">
      {/* Header: logo + branding + invoice badge - single balanced row */}
      <div className="flex items-start justify-between gap-6">
        {/* Left: Logo / Initials + Company Info */}
        <div className="flex items-start gap-5 flex-1 min-w-0">
          {/* Logo or Initials badge */}
          <div className="shrink-0">
            {effectiveLogo && settings.templateStyle !== "initials" ? (
              <img
                src={effectiveLogo}
                alt={company.name}
                className="h-16 w-16 object-contain rounded-2xl bg-slate-50 border border-slate-100 p-1.5"
              />
            ) : (
              <InitialsBadge
                initials={initials}
                size={64}
                background={badgeBg}
                className="shadow-lg"
              />
            )}
          </div>

          {/* Company text */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
              {company.name}
            </h1>
            {company.tagline && (
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em] mt-1">
                {company.tagline}
              </p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-[10.5px] font-semibold text-slate-500">
              {company.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  {company.address}
                </span>
              )}
              {company.gstin && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  GSTIN:{" "}
                  <span className="font-mono font-black text-slate-700">
                    {company.gstin}
                  </span>
                </span>
              )}
              {company.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  {company.email}
                </span>
              )}
            </div>
            {/* Contact numbers row */}
            {contacts.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                {contacts.map((c, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-[10.5px] font-bold text-slate-500"
                  >
                    <Phone className="w-3 h-3 text-slate-400" />
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Invoice metadata badge */}
        <div className="shrink-0 text-right">
          <div
            className="inline-block px-5 py-3.5 rounded-2xl border-2 text-right relative overflow-hidden"
            style={{
              borderColor: accent + "40",
              backgroundColor: accent + "08",
            }}
          >
            {settings.templateStyle === "initials" && (
              <span
                className="absolute -bottom-2 -left-2 text-6xl font-black opacity-10 select-none pointer-events-none"
                style={{ color: accent }}
              >
                {initials}
              </span>
            )}
            <div className="relative z-10">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                Tax Invoice
              </p>
              <p className="text-xl font-black text-slate-900 font-mono tracking-tight">
                {invoice.invoiceNo}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">
                  Date
                </span>
                <span className="font-mono font-black text-slate-700">
                  {fmtDate(invoice.date)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModernItemTable: React.FC<{ invoice: Invoice; accent: string }> = ({
  invoice,
  accent,
}) => {
  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
      <table className="w-full border-collapse text-[11px] sm:text-[12px] erp-table">
        <thead>
          <tr
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
            }}
          >
            <th className="py-4 px-2 col-text text-center font-black uppercase tracking-wider w-16 text-white">
              SR No.
            </th>
            <th className="py-4 px-2 col-text font-black uppercase tracking-wider text-white">
              Description
            </th>
            <th className="py-4 px-2 col-text font-black uppercase tracking-wider text-white">
              Variety
            </th>
            <th className="py-4 px-2 col-num font-black uppercase tracking-wider w-20 text-white">
              Carets
            </th>
            <th className="py-4 px-2 col-num font-black uppercase tracking-wider w-24 text-white">
              Weight
            </th>
            <th className="py-4 px-2 col-num font-black uppercase tracking-wider w-24 text-white">
              Rate
            </th>
            <th className="py-4 px-6 col-num font-black uppercase tracking-wider w-32 text-white">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {invoice.items.map((item, idx) => {
            const pricingType =
              item.pricingType ??
              getFruitPricingType(item.fruitCategory || item.fruit || "");
            const isByKg = pricingType === "kg";
            return (
              <tr
                key={item.id}
                style={idx % 2 === 1 ? { backgroundColor: `${accent}08` } : {}}
              >
                <td className="py-4 px-2 col-text text-center text-slate-400 font-mono">
                  {idx + 1}
                </td>
                <td className="py-4 px-2 col-text font-black text-slate-900">
                  {item.fruit}
                </td>
                <td className="py-4 px-2 col-text text-slate-600 font-bold uppercase tracking-tight">
                  {item.lotVariety}
                </td>
                <td className="py-4 px-2 col-num font-mono font-black text-slate-700">
                  {item.caret}
                </td>
                <td className="py-4 px-2 col-num font-mono font-black text-slate-700">
                  {item.weight}{" "}
                  <span className="text-[9px] text-slate-400">KG</span>
                </td>
                <td className="py-4 px-2 col-num font-mono text-slate-600 font-bold">
                  {currency(item.rate)}
                  <span className="text-[9px] text-slate-400 ml-0.5">
                    {isByKg ? "/KG" : "/Crt"}
                  </span>
                </td>
                <td className="py-4 px-6 col-num font-mono font-black text-slate-900 text-[13px]">
                  {currency(item.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ModernTotals: React.FC<{
  invoice: Invoice;
  settings: InvoiceSettings;
  accent: string;
}> = ({ invoice, settings, accent }) => {
  const subtotal = sumCurrency(invoice.items.map((i) => Number(i.amount) || 0));
  const totalCarets = invoice.items.reduce(
    (s, i) => s + (Number(i.caret) || 0),
    0,
  );
  const totalWeight = sumCurrency(
    invoice.items.map((i) => Number(i.weight) || 0),
  );
  const freight = roundCurrency(Number(invoice.freight) || 0);
  const hamali = roundCurrency(Number(invoice.hamali) || 0);
  // Running balance = previous + today's bill (no payment deduction at invoice creation)
  const runningBalance = roundCurrency(
    invoice.previousBalance + invoice.todayAmount,
  );

  return (
    <div className="mt-10 flex flex-col md:flex-row justify-between gap-8">
      {/* LEFT: Ledger Statement Summary */}
      <div className="flex-1 max-w-xs">
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Landmark className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">
              Statement Summary
            </span>
          </div>

          <div className="px-5 py-4 space-y-3 bg-white">
            {/* Previous Balance */}
            <div className="flex justify-between items-center text-[12px] font-bold text-slate-500">
              <span className="uppercase tracking-wider">Previous Balance</span>
              <span className="font-mono font-black text-slate-700">
                {currency(invoice.previousBalance)}
              </span>
            </div>

            {/* Current Invoice */}
            <div className="flex justify-between items-center text-[12px] font-bold text-slate-500">
              <span className="uppercase tracking-wider">
                + Current Invoice
              </span>
              <span className="font-mono font-black text-slate-700">
                {currency(invoice.todayAmount)}
              </span>
            </div>

            {/* Running Balance */}
            <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-[12px] font-black">
              <span className="uppercase tracking-wider text-slate-900">
                Running Balance
              </span>
              <span
                className="font-mono font-black text-[12px]"
                style={{ color: accent }}
              >
                {currency(runningBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Caret Balance - amber */}
        <div className="mt-3 px-5 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">
              Caret Balance
            </span>
          </div>
          <span className="text-base font-black font-mono text-amber-700">
            {Number(invoice.remainingCaretBalance) || 0}{" "}
            <span className="text-[9px] font-bold">Carets</span>
          </span>
        </div>
      </div>

      {/* RIGHT: Invoice Totals + Net Payable */}
      <div className="w-full md:w-80 flex flex-col justify-end gap-3">
        {/* Line items */}
        <div className="space-y-2 px-1">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>
              Subtotal ({totalCarets} Carets / {totalWeight} kg)
            </span>
            <span className="font-mono text-slate-800">
              {currency(subtotal)}
            </span>
          </div>
          {freight > 0 && (
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Freight (Bhaada)</span>
              <span className="font-mono text-slate-700">
                {currency(freight)}
              </span>
            </div>
          )}
          {hamali > 0 && (
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Labour (Hamali)</span>
              <span className="font-mono text-slate-700">
                {currency(hamali)}
              </span>
            </div>
          )}
        </div>

        {/* Net Payable box - accent gradient, clean */}
        <div
          className="rounded-2xl px-6 py-5 text-white overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-75 mb-1">
            Net Payable Amount
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono tracking-tight">
              {currency(invoice.todayAmount)}
            </span>
            <span className="text-[11px] font-black bg-white/20 px-2.5 py-1 rounded-lg">
              INR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ThermalTemplate: React.FC<{
  invoice: Invoice;
  company: CompanySettings;
  settings: InvoiceSettings;
}> = ({ invoice, company, settings }) => {
  const subtotal = sumCurrency(invoice.items.map((i) => Number(i.amount) || 0));
  const freight = roundCurrency(Number(invoice.freight) || 0);
  const hamali = roundCurrency(Number(invoice.hamali) || 0);
  const otherCharges = roundCurrency(Number(invoice.otherCharges) || 0);
  const discount = roundCurrency(Number(invoice.discount) || 0);
  const totalCarets = invoice.items.reduce(
    (s, i) => s + (Number(i.caret) || 0),
    0,
  );
  const totalWeight = sumCurrency(
    invoice.items.map((i) => Number(i.weight) || 0),
  );

  // Format phone contacts
  const formatContact = (val: string | undefined, defaultVal: string) => {
    if (!val) return defaultVal;
    if (val.includes(":")) return val;
    const defaultName = defaultVal.split(":")[0].trim();
    return `${defaultName} : ${val}`;
  };

  const contactLeft1 = formatContact(company.phone, "Talha Bhai : 9408255209");
  const contactLeft2 = formatContact(company.phone2, "Mahir Bhai : 7600696765");
  const contactRight = formatContact(
    company.phone3,
    "M.Shafi bhai : 9824163102",
  );

  // Format customer code
  const customerCode =
    invoice.customerId === "sample-customer"
      ? "48"
      : invoice.customerId
        ? invoice.customerId.replace(/\D/g, "") ||
          invoice.customerId.replace("c-", "")
        : "-";

  // Format invoice date to DD/MM/YYYY
  const plainDate =
    invoice.date.length > 10 ? invoice.date.slice(0, 10) : invoice.date;
  const [yyyy, mm, dd] = plainDate.split("-");
  const formattedDate = yyyy && mm && dd ? `${dd}/${mm}/${yyyy}` : plainDate;

  // Ledger Balances
  const runningBalance = roundCurrency(
    invoice.previousBalance + invoice.todayAmount,
  );
  const netBalanceSuffix = runningBalance >= 0 ? "Db" : "Cr";
  const formattedNetBalance = `${Math.abs(runningBalance).toFixed(2)} ${netBalanceSuffix}`;

  const prevBalanceSuffix = invoice.previousBalance >= 0 ? "DB" : "CR";
  const formattedPrevBalance = `${Math.abs(invoice.previousBalance).toFixed(2)} ${prevBalanceSuffix}`;

  // Caret Balances
  const caretBal = invoice.remainingCaretBalance ?? 0;
  const firstItemFruitName = invoice.items[0]?.fruit || "Caret";

  // Empty rows for grid padding
  const minRows = 5;
  const emptyRowsCount = Math.max(0, minRows - invoice.items.length);

  return (
    <div className="mx-auto w-full bg-white text-black font-mono p-0 text-[13px] leading-tight border-2 border-black rounded-none shadow-none select-none">
      {/* 1. Header Contacts Section */}
      <div className="flex justify-between text-[11.5px] font-bold p-2 pb-0">
        <div>
          <p>{contactLeft1}</p>
          {contactLeft2 && <p>{contactLeft2}</p>}
        </div>
        <div className="text-right">
          <p>{contactRight}</p>
        </div>
      </div>

      {/* 2. Brand Identity */}
      <div className="text-center pt-1 pb-2">
        <h1 className="text-[20px] font-extrabold uppercase underline tracking-tight leading-none">
          {company.name}
        </h1>
        {company.tagline && (
          <p className="text-[12px] font-black uppercase mt-1">
            {company.tagline}
          </p>
        )}
        <p className="text-[11.5px] font-bold uppercase underline mt-0.5">
          {company.address ||
            "33/34,Gunj Bazar,Kabrastan Chowkdi,Nadiad-1.(GUJ)"}
        </p>
      </div>

      {/* 3. Invoice Meta Details Box */}
      <div className="border-t border-b border-black py-2 px-2 flex flex-col gap-1">
        <div className="flex justify-between text-[12px] font-bold">
          <span className="w-[30%] text-left">Code : {customerCode}</span>
          <span className="w-[35%] text-center">
            Bill No : {invoice.invoiceNo}
          </span>
          <span className="w-[35%] text-right">Date : {formattedDate}</span>
        </div>
        <div className="text-[13px] font-extrabold text-left mt-0.5">
          Name : {invoice.customerName}
        </div>
      </div>

      {/* 4. Table of Items */}
      <div className="px-0">
        <table className="w-full border-collapse text-[12px] border-b border-black">
          <thead>
            <tr className="border-b border-black font-extrabold">
              <th className="py-1 px-1 text-center w-[40%] border-r border-black font-extrabold">
                Item
              </th>
              <th className="py-1 px-1 text-center w-[12%] border-r border-black font-extrabold">
                Pkgs
              </th>
              <th className="py-1 px-1 text-center w-[16%] border-r border-black font-extrabold">
                Weight
              </th>
              <th className="py-1 px-1 text-center w-[15%] border-r border-black font-extrabold">
                Rate
              </th>
              <th className="py-1 px-1 text-center w-[17%] font-extrabold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => {
              const pricingType =
                item.pricingType ??
                getFruitPricingType(item.fruitCategory || item.fruit || "");
              const isByKg = pricingType === "kg";
              const itemDesc = item.lotVariety
                ? `${item.fruit}-${item.lotVariety}`
                : item.fruit;
              return (
                <tr key={item.id} className="align-top font-bold">
                  <td className="py-0.5 px-1 text-left border-r border-black truncate max-w-[150px]">
                    {itemDesc}
                  </td>
                  <td className="py-0.5 px-1 text-right border-r border-black">
                    {item.caret}
                  </td>
                  <td className="py-0.5 px-1 text-right border-r border-black">
                    {item.weight.toFixed(2)}
                  </td>
                  <td className="py-0.5 px-1 text-right border-r border-black">
                    {item.rate.toFixed(2)}
                  </td>
                  <td className="py-0.5 px-1 text-right">
                    {item.amount.toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {/* Empty rows to match reference image vertical empty space */}
            {Array.from({ length: emptyRowsCount }).map((_, idx) => (
              <tr key={`empty-${idx}`} className="h-6 align-top">
                <td className="py-0.5 px-1 border-r border-black"></td>
                <td className="py-0.5 px-1 border-r border-black"></td>
                <td className="py-0.5 px-1 border-r border-black"></td>
                <td className="py-0.5 px-1 border-r border-black"></td>
                <td className="py-0.5 px-1"></td>
              </tr>
            ))}

            {/* Table totals row */}
            <tr className="border-t border-black font-extrabold align-top">
              <td className="py-1 px-1 border-r border-black"></td>
              <td className="py-1 px-1 text-right border-r border-black">
                {totalCarets}
              </td>
              <td className="py-1 px-1 text-right border-r border-black">
                {totalWeight.toFixed(2)}
              </td>
              <td className="py-1 px-1 border-r border-black"></td>
              <td className="py-1 px-1 text-right">{subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Summary Section */}
      <div className="flex border-b border-black">
        {/* Left Side: Previous Balance */}
        <div className="w-[55%] flex flex-col justify-end p-2 pb-1.5 font-extrabold text-[12px]">
          <div>Pre. Bal : {formattedPrevBalance}</div>
        </div>
        {/* Right Side: Charges Box */}
        <div className="w-[45%] border-l border-black flex flex-col text-[12px] font-bold">
          <div className="flex justify-between px-2 py-1 border-b border-black">
            <span>Others Exp</span>
            <span>{otherCharges.toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-2 py-1 border-b border-black">
            <span>Labour</span>
            <span>{hamali.toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-2 py-1 border-b border-black">
            <span>Caret chg.</span>
            <span>{freight.toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-2 py-1">
            <span>Others Less</span>
            <span>{discount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 6. Net Bal & Total Row */}
      <div className="flex border-b border-black font-extrabold text-[12.5px] items-center">
        <div className="w-[18%] py-1.5 px-2 text-left">Net Bal</div>
        <div className="w-[37%] py-1.5 px-2 text-right border-r border-black">
          {formattedNetBalance}
        </div>
        <div className="w-[18%] py-1.5 px-2 text-left">Total</div>
        <div className="w-[27%] py-1.5 px-2 text-right">
          {invoice.todayAmount.toFixed(2)}
        </div>
      </div>

      {/* 7. Caret Balance Box */}
      <div className="p-2">
        <div className="border border-black p-2 text-[12.5px] font-extrabold flex justify-between items-center">
          <div>
            {firstItemFruitName}
            {"-->"} {caretBal.toFixed(2)}
          </div>
          <div>Caret Bal : {caretBal} Db.</div>
        </div>
      </div>

      {/* 8. Computer Generated Invoice Footer */}
      <div className="mt-6 mb-2 text-center">
        <p className="text-[9px] font-extrabold text-black uppercase tracking-[0.4em] select-none">
          Computer Generated Invoice — {company.name}
        </p>
      </div>
    </div>
  );
};

export const InvoiceTemplateRenderer: React.FC<
  InvoiceTemplateRendererProps
> = ({ invoice, company, invoiceSettings, className = "" }) => {
  const { customers } = useApp();
  let customer = customers.find(
    (c) => c.id === invoice.customerId || c.name === invoice.customerName,
  );

  if (!customer && invoice.id === "sample-invoice") {
    customer = {
      id: "sample-customer",
      name: "Metro Fresh Supermarket",
      phone: "9876543210",
      email: "buyer@metrofresh.in",
      gstin: "24BBBBB0000B1Z8",
      city: "Mumbai",
      state: "Maharashtra",
      billingAddress: "G-14, APMC Market Yard, Vashi, Navi Mumbai - 400703",
      shippingAddress: "G-14, APMC Market Yard, Vashi, Navi Mumbai - 400703",
      previousBalance: 35000,
      creditLimit: 200000,
      notes: "",
    };
  }
  const template = normalizeInvoiceTemplate(invoiceSettings.templateStyle);
  const accent = invoiceSettings.brandColor || "#4f46e5";

  if (template === "thermal") {
    return (
      <ThermalTemplate
        invoice={invoice}
        company={company}
        settings={invoiceSettings}
      />
    );
  }

  return (
    <div
      className={`relative bg-white text-slate-900 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl ${className} group/invoice`}
    >
      {/* Print Overlay - ensures white background on print */}
      <div className="absolute inset-0 bg-white pointer-events-none z-[-1] print:block hidden" />

      <InvoiceWatermark settings={invoiceSettings} company={company} />

      <div className="relative z-10 p-10 sm:p-14">
        <ModernHeader
          invoice={invoice}
          company={company}
          settings={invoiceSettings}
          accent={accent}
        />

        <div className="mt-12 flex flex-col sm:flex-row justify-between items-start gap-10">
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
              Billed To - Customer
            </p>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[1.25rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tight">
                  {invoice.customerName}
                </h3>
                {customer && (
                  <div className="text-[12px] font-bold text-slate-600 space-y-2 mt-3.5">
                    {customer.billingAddress && (
                      <p className="flex items-start gap-2 leading-tight">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-slate-800">
                          {customer.billingAddress}
                        </span>
                      </p>
                    )}
                    {customer.phone && (
                      <p className="flex items-center gap-2 leading-tight">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{customer.phone}</span>
                      </p>
                    )}
                    {customer.gstin && (
                      <p className="flex items-center gap-2 leading-tight">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          GSTIN:{" "}
                          <span className="font-mono font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60">
                            {customer.gstin}
                          </span>
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right min-w-[200px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
              Billing Status
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-black text-[11px] uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Credit Account
            </div>
          </div>
        </div>

        <ModernItemTable invoice={invoice} accent={accent} />

        <ModernTotals
          invoice={invoice}
          settings={invoiceSettings}
          accent={accent}
        />

        {/* Footer */}
        <div className="mt-16 pt-10 border-t-2 border-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div className="space-y-6">
              <div>
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  Terms & Conditions
                </h5>
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm italic font-medium">
                  {invoiceSettings.termsText ||
                    "Subject to APMC market yard rules. Goods once sold will not be taken back. Payment expected within 15 days."}
                </p>
              </div>
              {invoiceSettings.showBankDetails && (
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 inline-block">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                      Bank Transfer Info
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-bold">
                    <span className="text-slate-400 uppercase">Bank</span>
                    <span className="text-slate-900">{company.bankName}</span>
                    <span className="text-slate-400 uppercase">A/C No</span>
                    <span className="text-slate-900 font-mono">
                      {company.accountNo}
                    </span>
                    <span className="text-slate-400 uppercase">IFSC</span>
                    <span className="text-slate-900 font-mono">
                      {company.ifsc}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-4">
              {/* UPI QR Code */}
              {invoiceSettings.showUPI && company.upiId && (
                <div className="flex flex-col items-center gap-1.5">
                  {invoiceSettings.enableQR ? (
                    <div className="p-2 border border-slate-100 rounded-xl bg-white">
                      <QRCode
                        value={`upi://pay?pa=${encodeURIComponent(company.upiId)}&pn=${encodeURIComponent(company.name)}&am=${invoice.todayAmount}&cu=INR`}
                        size={72}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                        level="M"
                      />
                    </div>
                  ) : null}
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Scan to Pay
                  </p>
                  <p className="text-[9px] font-mono text-slate-500">
                    {company.upiId}
                  </p>
                </div>
              )}
              {/* Signature */}
              <div className="flex flex-col items-end">
                <div className="w-56 h-16 border-b-2 border-slate-100 mb-3 flex items-center justify-center text-slate-200 font-black uppercase text-[10px] tracking-widest">
                  Digital Signature
                </div>
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                  Authorized Signatory
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  For {company.name}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-16 text-center">
            <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] select-none">
              Computer Generated Invoice — {company.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
