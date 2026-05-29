import React, { useState } from 'react';
import { X, User, Phone, MapPin, Building2, Save } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface QuickAddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (party: {
    name: string;
    phone: string;
    city: string;
    previousBalance: number;
    type: 'CUSTOMER' | 'SUPPLIER';
  }) => void;
  type: 'CUSTOMER' | 'SUPPLIER';
  initialName?: string;
}

export const QuickAddPartyModal: React.FC<QuickAddPartyModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  type,
  initialName = '',
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [balanceType, setBalanceType] = useState<'DEBIT' | 'CREDIT'>(
    type === 'CUSTOMER' ? 'DEBIT' : 'CREDIT'
  );

  // Update name if initialName changes and modal is open
  React.useEffect(() => {
    if (isOpen && initialName) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalBalance = balanceType === 'CREDIT' ? -Math.abs(balance) : Math.abs(balance);

    onAdd({
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      previousBalance: finalBalance,
      type,
    });
    
    // Reset and close
    setName('');
    setPhone('');
    setCity('');
    setBalance(0);
    onClose();
  };

  const isCustomer = type === 'CUSTOMER';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border dark:border-slate-800 border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "px-6 py-4 flex items-center justify-between border-b dark:border-slate-800 border-slate-100",
          isCustomer ? "bg-indigo-50/50 dark:bg-indigo-500/5" : "bg-emerald-50/50 dark:bg-emerald-500/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
              isCustomer ? "bg-indigo-500 text-white" : "bg-emerald-500 text-white"
            )}>
              {isCustomer ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold dark:text-white text-slate-900 leading-tight">
                Quick Add {isCustomer ? 'Customer' : 'Supplier'}
              </h3>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                Register new {type.toLowerCase()}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                  <User size={16} />
                </div>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Enter name..." 
                  className={cn(
                    "w-full bg-white dark:bg-slate-950 border dark:border-slate-800 border-slate-200 dark:text-white text-slate-900 rounded-xl py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all",
                    isCustomer ? "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" : "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  )}
                />
              </div>
            </div>

            {/* Phone & City */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  Phone No
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                    <Phone size={16} />
                  </div>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="98765..." 
                    className={cn(
                      "w-full bg-white dark:bg-slate-950 border dark:border-slate-800 border-slate-200 dark:text-white text-slate-900 rounded-xl py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all",
                      isCustomer ? "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" : "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  City / Village
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                    <MapPin size={16} />
                  </div>
                  <input 
                    type="text" 
                    value={city} 
                    onChange={e => setCity(e.target.value)} 
                    placeholder="City name" 
                    className={cn(
                      "w-full bg-white dark:bg-slate-950 border dark:border-slate-800 border-slate-200 dark:text-white text-slate-900 rounded-xl py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all",
                      isCustomer ? "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" : "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Opening Balance */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Opening Balance (₹)
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={balance || ''} 
                  onChange={e => setBalance(parseFloat(e.target.value) || 0)} 
                  placeholder="0.00" 
                  className={cn(
                    "flex-1 bg-white dark:bg-slate-950 border dark:border-slate-800 border-slate-200 dark:text-white text-slate-900 rounded-xl py-2.5 px-3.5 text-sm outline-none font-mono font-bold transition-all",
                    isCustomer ? "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" : "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  )}
                />
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700 border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBalanceType('DEBIT')}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all",
                      balanceType === 'DEBIT' 
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    )}
                  >
                    DR
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceType('CREDIT')}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all",
                      balanceType === 'CREDIT' 
                        ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    )}
                  >
                    CR
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={cn(
                "flex-[1.5] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                isCustomer 
                  ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20" 
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
              )}
            >
              <Save size={16} />
              <span>Save {isCustomer ? 'Customer' : 'Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
