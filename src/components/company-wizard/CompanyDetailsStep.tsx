import React, { useRef } from "react";
import { CompanyDetails } from "@/types/company";
import {
  Building,
  MapPin,
  Phone,
  Upload,
  CheckCircle2,
  AlertCircle,
  Globe,
} from "lucide-react";
import { Autocomplete, AutocompleteOption } from "../ui/Autocomplete";
import locationsData from "@/data/india-locations.json";

interface CompanyDetailsStepProps {
  data: CompanyDetails;
  onChange: (fields: Partial<CompanyDetails>) => void;
  errors: { [key: string]: string };
}

export const CompanyDetailsStep: React.FC<CompanyDetailsStepProps> = ({
  data,
  onChange,
  errors,
}) => {
  // Refs for auto-focus navigation
  const legalNameRef = useRef<HTMLInputElement>(null);
  const gstinRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const pincodeRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const phone2Ref = useRef<HTMLInputElement>(null);
  const phone3Ref = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);

  const locations = locationsData as AutocompleteOption[];

  const handleLogoUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fakeUrl = URL.createObjectURL(file);
      onChange({ logoUrl: fakeUrl });
    }
  };

  const handleCompanyNameChange = (val: string) => {
    const shouldSync = !data.legalName || data.legalName === data.companyName;
    const updates: Partial<CompanyDetails> = { companyName: val };
    if (shouldSync) updates.legalName = val;
    onChange(updates);
  };

  const handleLocationSelect = (option: AutocompleteOption) => {
    onChange({ city: option.city, state: option.state, pincode: option.pincode });
  };

  const handlePhoneChange = (val: string) => {
    onChange({ phone: val.replace(/\D/g, "").slice(0, 10) });
  };

  const sampleLogos = [
    { name: "BlueTech", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
    { name: "ApexCube", url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150&auto=format&fit=crop&q=80" },
    { name: "Hexagon",  url: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=150&auto=format&fit=crop&q=80" },
  ];

  // Shared input class builders
  const inputBase = "w-full py-2 rounded-lg border text-xs font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all";
  const inputNormal = `${inputBase} border-slate-200 dark:border-slate-700 focus:ring-amber-100 dark:focus:ring-amber-500/10 focus:border-amber-500 dark:focus:border-amber-500/60`;
  const inputError  = `${inputBase} border-red-300 dark:border-red-500/50 focus:ring-red-100 dark:focus:ring-red-500/10 focus:border-red-500`;
  const inputValid  = `${inputBase} border-emerald-300 dark:border-emerald-500/50 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:border-emerald-500`;

  const labelClass = "block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider";
  const errorMsg = "text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1";

  return (
    <div className="space-y-4 animate-fadeIn">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
        Company Details & Legal Identification
      </h2>

      {/* Logo */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
        <h3 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
          Company Logo
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 group hover:border-amber-500 dark:hover:border-amber-500 transition-colors">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUploadSim} />
            </label>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">or preset:</span>
            <div className="flex items-center gap-1.5">
              {sampleLogos.map((logo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange({ logoUrl: logo.url })}
                  className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${data.logoUrl === logo.url ? "border-amber-500 ring-1 ring-amber-100 dark:ring-amber-500/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
                  title={logo.name}
                >
                  <img src={logo.url} alt={logo.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Identity fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Company Name */}
        <div className="space-y-1">
          <label className={labelClass}>Company Name <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Building className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={data.companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              placeholder="e.g. ASZ Nexus ERP"
              onKeyDown={(e) => e.key === "Enter" && legalNameRef.current?.focus()}
              className={`pl-8 pr-3 ${errors.companyName ? inputError : inputNormal}`}
            />
          </div>
          {errors.companyName && (
            <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.companyName}</span></p>
          )}
        </div>

        {/* Legal Name */}
        <div className="space-y-1">
          <label className={labelClass}>Legal Business Name <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Building className="w-3.5 h-3.5" />
            </div>
            <input
              ref={legalNameRef}
              type="text"
              value={data.legalName}
              onChange={(e) => onChange({ legalName: e.target.value })}
              placeholder="e.g. ASZ Nexus ERP Private Limited"
              onKeyDown={(e) => e.key === "Enter" && gstinRef.current?.focus()}
              className={`pl-8 pr-3 ${errors.legalName ? inputError : inputNormal}`}
            />
          </div>
          {errors.legalName && (
            <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.legalName}</span></p>
          )}
        </div>

        {/* GSTIN */}
        <div className="space-y-1">
          <label className={labelClass}>GSTIN</label>
          <div className="relative">
            <input
              ref={gstinRef}
              type="text"
              value={data.gstin}
              onChange={(e) => onChange({ gstin: e.target.value.toUpperCase() })}
              placeholder="e.g. 24AAAAA0000A1Z5"
              onKeyDown={(e) => e.key === "Enter" && panRef.current?.focus()}
              className={`px-3 font-mono ${errors.gstin ? inputError : data.gstin && !errors.gstin ? inputValid : inputNormal}`}
            />
            {data.gstin && !errors.gstin && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          {errors.gstin && (
            <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.gstin}</span></p>
          )}
        </div>

        {/* PAN */}
        <div className="space-y-1">
          <label className={labelClass}>PAN Number</label>
          <div className="relative">
            <input
              ref={panRef}
              type="text"
              value={data.panNumber}
              onChange={(e) => onChange({ panNumber: e.target.value.toUpperCase() })}
              placeholder="e.g. ABCDE1234F"
              onKeyDown={(e) => e.key === "Enter" && addressRef.current?.focus()}
              className={`px-3 font-mono ${errors.panNumber ? inputError : data.panNumber && !errors.panNumber ? inputValid : inputNormal}`}
            />
            {data.panNumber && !errors.panNumber && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          {errors.panNumber && (
            <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.panNumber}</span></p>
          )}
        </div>
      </div>

      {/* Address section */}
      <div className="border-t border-slate-200/80 dark:border-slate-700/60 pt-3 space-y-3">
        <h3 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Address & Contact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Country */}
          <div className="space-y-1">
            <label className={labelClass}>Country <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <select
                value={data.country}
                onChange={(e) => onChange({ country: e.target.value })}
                className={`pl-8 pr-3 appearance-none ${inputNormal}`}
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United Arab Emirates">UAE</option>
                <option value="Singapore">Singapore</option>
                <option value="Germany">Germany</option>
                <option value="Australia">Australia</option>
                <option value="Canada">Canada</option>
              </select>
            </div>
          </div>

          {/* Street Address */}
          <div className="space-y-1">
            <label className={labelClass}>Street Address <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <input
                ref={addressRef}
                type="text"
                value={data.address}
                onChange={(e) => onChange({ address: e.target.value })}
                placeholder="e.g. Near Chamak Factory, Barkoshia Road"
                onKeyDown={(e) => e.key === "Enter" && cityRef.current?.focus()}
                className={`pl-8 pr-3 ${errors.address ? inputError : inputNormal}`}
              />
            </div>
            {errors.address && (
              <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.address}</span></p>
            )}
          </div>

          {/* City */}
          <div className="space-y-1">
            <label className={labelClass}>City <span className="text-red-500">*</span></label>
            <Autocomplete
              value={data.city}
              onChange={(val) => onChange({ city: val })}
              onSelect={handleLocationSelect}
              options={locations}
              placeholder="e.g. Nadiad"
              error={errors.city}
              icon={<MapPin className="w-3.5 h-3.5" />}
              nextFieldRef={phoneRef}
            />
          </div>

          {/* State */}
          <div className="space-y-1">
            <label className={labelClass}>State <span className="text-red-500">*</span></label>
            <input
              ref={stateRef}
              type="text"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
              placeholder="e.g. Gujarat"
              onKeyDown={(e) => e.key === "Enter" && pincodeRef.current?.focus()}
              className={`px-3 ${errors.state ? inputError : inputNormal}`}
            />
            {errors.state && (
              <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.state}</span></p>
            )}
          </div>

          {/* Pincode */}
          <div className="space-y-1">
            <label className={labelClass}>Pincode <span className="text-red-500">*</span></label>
            <input
              ref={pincodeRef}
              type="text"
              value={data.pincode}
              onChange={(e) => onChange({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              placeholder="e.g. 387001"
              onKeyDown={(e) => e.key === "Enter" && phoneRef.current?.focus()}
              className={`px-3 ${errors.pincode ? inputError : inputNormal}`}
            />
            {errors.pincode && (
              <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.pincode}</span></p>
            )}
          </div>

          {/* Phone 1 */}
          <div className="space-y-1">
            <label className={labelClass}>Phone 1 <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <input
                ref={phoneRef}
                type="text"
                value={data.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="9876543210"
                onKeyDown={(e) => e.key === "Enter" && phone2Ref.current?.focus()}
                className={`pl-8 pr-3 ${errors.phone ? inputError : inputNormal}`}
              />
            </div>
            {errors.phone && (
              <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.phone}</span></p>
            )}
          </div>

          {/* Phone 2 */}
          <div className="space-y-1">
            <label className={labelClass}>Phone 2</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <input
                ref={phone2Ref}
                type="text"
                value={data.phone2 || ""}
                onChange={(e) => onChange({ phone2: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="Optional"
                onKeyDown={(e) => e.key === "Enter" && phone3Ref.current?.focus()}
                className={`pl-8 pr-3 ${inputNormal}`}
              />
            </div>
          </div>

          {/* Phone 3 */}
          <div className="space-y-1">
            <label className={labelClass}>Phone 3</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <input
                ref={phone3Ref}
                type="text"
                value={data.phone3 || ""}
                onChange={(e) => onChange({ phone3: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="Optional"
                onKeyDown={(e) => e.key === "Enter" && emailRef.current?.focus()}
                className={`pl-8 pr-3 ${inputNormal}`}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <input
                ref={emailRef}
                type="email"
                value={data.email || ""}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="contact@company.com"
                onKeyDown={(e) => e.key === "Enter" && websiteRef.current?.focus()}
                className={`pl-8 pr-3 ${inputNormal}`}
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1">
            <label className={labelClass}>Website</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <input
                ref={websiteRef}
                type="text"
                value={data.website || ""}
                onChange={(e) => onChange({ website: e.target.value })}
                placeholder="www.company.com"
                className={`pl-8 pr-3 ${inputNormal}`}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
