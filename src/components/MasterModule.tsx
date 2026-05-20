import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Plus, Users, UserCheck, Apple, Tag } from 'lucide-react';
import { Combobox } from './ui/Combobox';
import { useToast } from './ui/Toast';

export const MasterModule: React.FC = () => {
  const { fruits, suppliers, customers, addSupplier, addCustomer, addFruitVariety } = useApp();
  const toast = useToast();

  // Add Supplier State
  const [supName, setSupName] = useState('');
  const [supCode, setSupCode] = useState('');
  const [supCity, setSupCity] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supBalance, setSupBalance] = useState<number>(0);

  // Add Customer State
  const [custName, setCustName] = useState('');
  const [custCity, setCustCity] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custBalance, setCustBalance] = useState<number>(0);

  // Add Variety State
  const [selectedFruitId, setSelectedFruitId] = useState(fruits[0]?.id || '');
  const [varietyName, setVarietyName] = useState('');

  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supCode) return;
    addSupplier({
      name: supName,
      code: supCode.toUpperCase(),
      city: supCity || 'Local',
      phone: supPhone || '+91 ',
      previousBalance: Number(supBalance) || 0
    });
    toast.success('Supplier Added', `"${supName}" has been registered successfully as a new supplier master.`);
    setSupName('');
    setSupCode('');
    setSupCity('');
    setSupPhone('');
    setSupBalance(0);
  };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName) return;
    addCustomer({
      name: custName,
      city: custCity || 'Local',
      phone: custPhone || '+91 ',
      previousBalance: Number(custBalance) || 0
    });
    toast.success('Customer Added', `"${custName}" has been registered successfully as a new customer / buyer.`);
    setCustName('');
    setCustCity('');
    setCustPhone('');
    setCustBalance(0);
  };

  const handleAddVarietySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varietyName || !selectedFruitId) return;
    addFruitVariety(selectedFruitId, varietyName);
    toast.success('Variety Added', `"${varietyName}" has been added to the fruit variety hierarchy.`);
    setVarietyName('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-slate-900 bg-white p-4 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-md">
        <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5">
          <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>MASTERS & SYSTEM SETUP</span>
        </h1>
        <p className="text-xs dark:text-slate-400 text-slate-600 mt-0.5">Configure trading counterparties, fruit categories, and variety hierarchy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        {/* ADD SUPPLIER FORM */}
        <div className="bg-slate-900 dark:bg-slate-900 bg-white p-6 rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 dark:border-slate-800 border-slate-200 pb-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <Users className="w-5 h-5" />
            <span>Add New Supplier / Party</span>
          </div>
          <form onSubmit={handleAddSupplierSubmit} className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Supplier Name *</label>
              <input type="text" required value={supName} placeholder="e.g. Kisan Fruit Agency" onChange={e => setSupName(e.target.value)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Unique Code *</label>
              <input type="text" required value={supCode} placeholder="e.g. KFA-01" onChange={e => setSupCode(e.target.value)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 outline-none font-mono uppercase focus:border-emerald-500 font-bold" />
            </div>
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">City / Region</label>
              <input type="text" value={supCity} placeholder="e.g. Nashik, MH" onChange={e => setSupCity(e.target.value)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Phone Number</label>
              <input type="text" value={supPhone} placeholder="+91 98765..." onChange={e => setSupPhone(e.target.value)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Opening Previous Balance (₹)</label>
              <input type="number" value={supBalance === 0 ? '' : supBalance} placeholder="0" onChange={e => setSupBalance(parseFloat(e.target.value) || 0)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 text-emerald-600 dark:text-emerald-400 font-mono font-bold rounded-xl p-2.5 outline-none focus:border-emerald-500 text-base" />
            </div>
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow-lg transition-all mt-4 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Save Supplier Master</span>
            </button>
          </form>
          <div className="text-[11px] dark:text-slate-500 text-slate-600 pt-3 border-t border-slate-800 dark:border-slate-800 border-slate-200 mt-4 font-medium">
            Current Registered Suppliers: {suppliers.length}
          </div>
        </div>

        {/* ADD CUSTOMER FORM */}
        <div className="bg-slate-900 dark:bg-slate-900 bg-white p-6 rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 dark:border-slate-800 border-slate-200 pb-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <UserCheck className="w-5 h-5" />
            <span>Add New Customer / Buyer</span>
          </div>
          <form onSubmit={handleAddCustomerSubmit} className="space-y-3 text-xs sm:text-sm font-sans">
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Customer / Buyer Name *</label>
              <input type="text" required value={custName} placeholder="e.g. Royal Fresh Mart" onChange={e => setCustName(e.target.value)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-bold" />
            </div>
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">City / Region</label>
              <input type="text" value={custCity} placeholder="e.g. Mumbai" onChange={e => setCustCity(e.target.value)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Phone Number</label>
              <input type="text" value={custPhone} placeholder="+91 99887..." onChange={e => setCustPhone(e.target.value)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Opening Previous Balance (₹)</label>
              <input type="number" value={custBalance === 0 ? '' : custBalance} placeholder="0" onChange={e => setCustBalance(parseFloat(e.target.value) || 0)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 text-indigo-600 dark:text-indigo-400 font-mono font-bold rounded-xl p-2.5 outline-none focus:border-indigo-500 text-base" />
            </div>
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow-lg transition-all mt-4 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Save Customer Master</span>
            </button>
          </form>
          <div className="text-[11px] dark:text-slate-500 text-slate-600 pt-3 border-t border-slate-800 dark:border-slate-800 border-slate-200 mt-4 font-medium">
            Current Registered Customers: {customers.length}
          </div>
        </div>

        {/* FRUIT & VARIETY MASTER */}
        <div className="bg-slate-900 dark:bg-slate-900 bg-white p-6 rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl space-y-4 font-sans">
          <div className="flex items-center space-x-2 border-b border-slate-800 dark:border-slate-800 border-slate-200 pb-3 text-teal-600 dark:text-teal-400 font-bold text-sm">
            <Apple className="w-5 h-5" />
            <span>Fruit & Variety Hierarchy</span>
          </div>

          <form onSubmit={handleAddVarietySubmit} className="space-y-3 text-xs sm:text-sm font-sans">
            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Select Fruit Category</label>
              <Combobox
                value={fruits.find(f => f.id === selectedFruitId)?.name || ''}
                onChange={(val) => {
                  const matched = fruits.find(f => f.name === val) || fruits[0];
                  if (matched) setSelectedFruitId(matched.id);
                }}
                options={fruits.map(f => f.name)}
                placeholder="Select Fruit..."
                searchPlaceholder="Search fruit..."
                creatable={false}
                className="py-2.5 text-xs font-bold text-teal-600 dark:text-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Add New Variety (Vakkal) *</label>
              <input type="text" required value={varietyName} placeholder="e.g. Organic Kesar Jumbo" onChange={e => setVarietyName(e.target.value)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 outline-none focus:border-teal-500 font-sans font-medium" />
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow-lg transition-all mt-4 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Add Variety to Fruit</span>
            </button>
          </form>

          {/* List existing varieties for selected fruit */}
          <div className="pt-4 border-t border-slate-800 dark:border-slate-800 border-slate-200 space-y-2 font-sans">
            <span className="text-xs font-bold dark:text-slate-400 text-slate-600 block font-sans">Existing Varieties in Hierarchy:</span>
            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto pr-1">
              {(fruits.find(f => f.id === selectedFruitId)?.varieties || []).map((v, idx) => (
                <span key={idx} className="bg-slate-800 dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-800 border border-slate-700 dark:border-slate-700 border-slate-300 px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 font-sans">
                  <Tag className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>{v}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
