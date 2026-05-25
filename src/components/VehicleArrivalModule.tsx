import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, Save, Plus, FileSpreadsheet, Search, Filter, 
  Eye, Edit3, Trash2, AlertTriangle, Calendar, Calculator 
} from 'lucide-react';

import { useApp } from '../context/AppContext';

import { VehicleSpreadsheet } from './VehicleSpreadsheet';
import { VehiclePreviewModal } from './VehiclePreviewModal';
import { CommandSelect, CommandOption } from './ui/CommandSelect';
import { useToast } from './ui/Toast';
import { useConfirmDialog } from './ui/ConfirmDialog';

import { VehicleArrival, PurchaseRow } from '../types';
import { fmtDate } from '@/utils/format';

export const VehicleArrivalModule: React.FC = () => {
  const { vehicles, suppliers, fruits, saveVehicleArrival, deleteVehicleArrival, addFruit } = useApp();
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [activeSubTab, setActiveSubTab] = useState<'NEW_ENTRY' | 'LIST'>('NEW_ENTRY');
  const [previewVehicle, setPreviewVehicle] = useState<VehicleArrival | null>(null);

  // Form State for new entry or editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [arrivalNo, setArrivalNo] = useState(`ARR-2026-${String(vehicles.length + 1).padStart(3, '0')}`);
  const [date, setDate] = useState('2026-05-16');
  const [day, setDay] = useState('Saturday');
  const [vehicleNo, setVehicleNo] = useState('GJ-15-XX-1122');
  const [vehicleName, setVehicleName] = useState('Eicher Heavy Truck');
  const [fruitType, setFruitType] = useState('Mango');
  const [totalVehicleWeight, setTotalVehicleWeight] = useState(2000);
  const [driverName, setDriverName] = useState('Raju Yadav');
  const [notes, setNotes] = useState('Quality verified at gate weighbridge');

  // Advanced APMC deductions state
  const [freightCharge, setFreightCharge] = useState<number>(0);
  const [hamaliCharge, setHamaliCharge] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [showAdvancedDeductions, setShowAdvancedDeductions] = useState<boolean>(true);

  // Spreadsheet Rows State
  const [rows, setRows] = useState<PurchaseRow[]>([
    {
      id: `row-${Date.now()}-1`,
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || 'Cash Supplier',
      variety: 'Kesar',
      caret: 50,
      weight: 1000,
      rate: 85,
      amount: 85000,
      note: 'Grade A Kesar boxes'
    },
    {
      id: `row-${Date.now()}-2`,
      supplierId: suppliers[1]?.id || '',
      supplierName: suppliers[1]?.name || 'Cash Supplier',
      variety: 'Alphonso',
      caret: 50,
      weight: 1000,
      rate: 140,
      amount: 140000,
      note: 'Export quality'
    }
  ]);

  // (toasts used instead of inline banners)

  // Automatically update day when date changes
  useEffect(() => {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        setDay(days[d.getDay()]);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[VehicleArrivalModule] Date parsing failed:', err);
    }
  }, [date]);

  // Load a vehicle into draft edit mode
  const handleEditVehicle = (veh: VehicleArrival) => {
    setEditingId(veh.id);
    setArrivalNo(veh.arrivalNo);
    setDate(veh.date);
    setDay(veh.day);
    setVehicleNo(veh.vehicleNo);
    setVehicleName(veh.vehicleName || '');
    setFruitType(veh.fruitType);
    setTotalVehicleWeight(veh.totalVehicleWeight);
    setDriverName(veh.driverName || '');
    setNotes(veh.notes || '');
    setFreightCharge(veh.freightCharge || 0);
    setHamaliCharge(veh.hamaliCharge || 0);
    setAdvancePaid(veh.advancePaid || 0);
    setRows(veh.rows);
    setActiveSubTab('NEW_ENTRY');
  };

  const handleResetForm = () => {
    setEditingId(null);
    setArrivalNo(`ARR-2026-${String(vehicles.length + 1).padStart(3, '0')}`);
    setDate(new Date().toISOString().split('T')[0]);
    setVehicleNo('');
    setVehicleName('');
    setTotalVehicleWeight(0);
    setDriverName('');
    setNotes('');
    setFreightCharge(0);
    setHamaliCharge(0);
    setAdvancePaid(0);
    setRows([
      {
        id: `row-${Date.now()}-1`,
        supplierId: suppliers[0]?.id || '',
        supplierName: suppliers[0]?.name || 'Cash Supplier',
        variety: 'Standard',
        caret: 0,
        weight: 0,
        rate: 0,
        amount: 0,
        note: ''
      }
    ]);
  };

  const totalCalculatedWeight = rows.reduce((sum, r) => sum + (parseFloat(String(r.weight)) || 0), 0);
  const totalCarets = rows.reduce((sum, r) => sum + (parseFloat(String(r.caret)) || 0), 0);
  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0);

  const fruitOptions: CommandOption[] = useMemo(() => {
    return fruits.map(f => ({
      id: f.id,
      label: f.name,
      subtitle: `${f.varieties.length} varieties`,
      emoji: '🍃'
    }));
  }, [fruits]);

  // Net payable calculation (Total - Advance + Hamali + Freight if payable by supplier/agent)
  const netPayable = totalAmount + (Number(freightCharge) || 0) + (Number(hamaliCharge) || 0) - (Number(advancePaid) || 0);

  const handleSave = () => {
    if (!vehicleNo.trim()) {
      toast.error('Missing Vehicle Number', 'Please enter a valid vehicle registration number before saving.');
      return;
    }

    const arrival: VehicleArrival = {
      id: editingId || `va-${Date.now()}`,
      arrivalNo,
      date,
      day,
      vehicleNo,
      vehicleName,
      fruitType,
      totalVehicleWeight: Number(totalVehicleWeight) || 0,
      driverName,
      notes,
      rows,
      totalCarets,
      totalCalculatedWeight,
      totalAmount,
      freightCharge: Number(freightCharge) || 0,
      hamaliCharge: Number(hamaliCharge) || 0,
      advancePaid: Number(advancePaid) || 0,
      status: 'SAVED',
      createdAt: editingId ? (vehicles.find(v => v.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    saveVehicleArrival(arrival);
    toast.success('Vehicle Arrival Saved!', `${arrivalNo} — ₹${totalAmount.toLocaleString('en-IN')} committed. Supplier ledger & stock updated.`);
    setTimeout(() => {
      setActiveSubTab('LIST');
      handleResetForm();
    }, 600);
  };

  // Search and Filter State for List View
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFruit, setFilterFruit] = useState('ALL');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch =
        v.arrivalNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.fruitType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.rows.some(r => r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFruit = filterFruit === 'ALL' || v.fruitType.toLowerCase() === filterFruit.toLowerCase();
      return matchesSearch && matchesFruit;
    });
  }, [vehicles, searchTerm, filterFruit]);

  const isWeightMismatch = Math.abs(totalCalculatedWeight - totalVehicleWeight) > 5 && totalVehicleWeight > 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Bar / Navigation */}
      <div className="erp-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
        <div>
          <h1 className="erp-title text-[1.1rem] flex items-center space-x-2.5">
            <Truck className="w-6 h-6 text-emerald-500" />
            <span>VEHICLE ARRIVAL REGISTER & INWARD STOCK</span>
          </h1>
          <p className="erp-subtitle mt-0.5">Mandi gate inward, automated variety inventory allocation, and supplier ledger integration</p>
        </div>

        <div className="erp-surface flex items-center space-x-2 p-1.5">
          <button
            onClick={() => setActiveSubTab('NEW_ENTRY')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'NEW_ENTRY'
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_6px_16px_rgba(0,174,239,0.3)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{editingId ? 'Edit Draft Load' : 'New Inward Load'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('LIST')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'LIST'
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_6px_16px_rgba(0,174,239,0.3)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Arrival Register List ({vehicles.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: NEW ENTRY / SPREADSHEET FORM */}
      {activeSubTab === 'NEW_ENTRY' && (
        <div className="space-y-6">
          {/* VEHICLE ARRIVAL HEADER FIELDS */}
          <div className="erp-panel p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4">
              <div className="flex items-center space-x-3">
                <span className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-mono font-bold">
                  {arrivalNo}
                </span>
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Gate Entry Header Information</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDeductions(!showAdvancedDeductions)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer font-bold"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{showAdvancedDeductions ? 'Hide Lorry Deductions' : 'Add Lorry Charges (Bhaada/Hamali)'}</span>
                </button>
                {editingId && (
                  <button type="button" onClick={handleResetForm} className="text-xs text-rose-500 hover:underline cursor-pointer font-semibold">
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-xs sm:text-sm">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Arrival Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="erp-input w-full font-mono text-xs"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] bg-[var(--surface-bg)] text-[var(--text-muted)] px-2 py-0.5 rounded font-bold uppercase border border-[var(--card-border)]">
                    {day}
                  </span>
                </div>
              </div>

              {/* Fruit Type */}
              <div className="flex-1">
                <CommandSelect
                  id="arrival-fruit"
                  label="Fruit Category"
                  variant="emerald"
                  value={fruitType}
                  onChange={(val) => {
                    const opt = fruitOptions.find(o => o.id === val || o.label === val);
                    setFruitType(opt?.label || val);
                  }}
                  options={fruitOptions}
                  placeholder="Select Fruit..."
                  creatable={true}
                  onAdd={(newFruit) => addFruit(newFruit)}
                />
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Vehicle Registration No *</label>
                <input
                  type="text"
                  value={vehicleNo}
                  placeholder="e.g. GJ-06-AB-1234"
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  className="erp-input w-full font-mono font-extrabold text-xs uppercase"
                  required
                />
              </div>

              {/* Vehicle Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Vehicle Model & Name</label>
                <input
                  type="text"
                  value={vehicleName}
                  placeholder="e.g. Tata Heavy Cargo / Eicher"
                  onChange={(e) => setVehicleName(e.target.value)}
                  className="erp-input w-full text-xs"
                />
              </div>

              {/* Declared Total Weight */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Declared Lorry Weight (KG)</label>
                <input
                  type="number"
                  value={totalVehicleWeight === 0 ? '' : totalVehicleWeight}
                  placeholder="2000"
                  onChange={(e) => setTotalVehicleWeight(parseFloat(e.target.value) || 0)}
                  className="erp-input w-full font-mono text-xs"
                />
              </div>

              {/* Driver Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Driver Full Name</label>
                <input
                  type="text"
                  value={driverName}
                  placeholder="e.g. Ramesh Singh"
                  onChange={(e) => setDriverName(e.target.value)}
                  className="erp-input w-full text-xs"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Gate Pass & Weighbridge Remarks</label>
                <input
                  type="text"
                  value={notes}
                  placeholder="Weighbridge chit no, moisture details..."
                  onChange={(e) => setNotes(e.target.value)}
                  className="erp-input w-full text-xs"
                />
              </div>
            </div>

            {/* Advanced Deductions Panel */}
            {showAdvancedDeductions && (
              <div className="pt-4 border-t border-[var(--card-border)] grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[var(--surface-bg)] p-4 rounded-xl border border-[var(--surface-border)]">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Lorry Freight (Bhaada ₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted)] font-mono">₹</span>
                    <input type="number" value={freightCharge === 0 ? '' : freightCharge} placeholder="0" onChange={(e) => setFreightCharge(parseFloat(e.target.value) || 0)}
                      className="erp-input w-full pl-7 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs" />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">Transport charges added</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Unloading (Hamali ₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted)] font-mono">₹</span>
                    <input type="number" value={hamaliCharge === 0 ? '' : hamaliCharge} placeholder="0" onChange={(e) => setHamaliCharge(parseFloat(e.target.value) || 0)}
                      className="erp-input w-full pl-7 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs" />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">Labour unloading expense</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Advance Paid to Driver (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted)] font-mono">₹</span>
                    <input type="number" value={advancePaid === 0 ? '' : advancePaid} placeholder="0" onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                      className="erp-input w-full pl-7 text-rose-600 dark:text-rose-400 font-mono font-bold text-xs border-rose-300 dark:border-rose-500/40 focus:border-rose-500" />
                  </div>
                  <span className="text-[10px] text-rose-500 block mt-0.5">Deducted from lorry settlement</span>
                </div>
              </div>
            )}

            {/* Weighbridge warning */}
            {isWeightMismatch && (
              <div className="bg-amber-500/10 border border-amber-500/40 p-3.5 rounded-xl flex items-center space-x-3 text-amber-500 text-xs shadow-md">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                <span>
                  <strong>Weighbridge Mismatch Alert:</strong> Declared Vehicle Weight is <strong className="font-mono">{totalVehicleWeight} kg</strong> while the sum of purchase rows is <strong className="font-mono">{totalCalculatedWeight} kg</strong>. Please verify box weights before finalizing.
                </span>
              </div>
            )}
          </div>

          {/* MAIN SPREADSHEET PURCHASE TABLE */}
          <VehicleSpreadsheet
            rows={rows}
            onChangeRows={setRows}
            suppliers={suppliers}
            selectedFruit={fruitType}
            fruits={fruits}
          />

          {/* SAVE WORKFLOW ACTION BAR */}
          <div className="erp-panel p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 sticky bottom-4 z-40 backdrop-blur-xl bg-[var(--card-bg)]/95">
            <div className="flex flex-wrap items-center gap-6 w-full sm:w-auto font-sans">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Total Purchase Items</div>
                <div className="text-2xl font-black font-mono text-[var(--text-primary)] mt-0.5">
                  ₹ {totalAmount.toLocaleString('en-IN')}
                </div>
              </div>

              {showAdvancedDeductions && (freightCharge > 0 || hamaliCharge > 0 || advancePaid > 0) && (
                <div className="pl-6 border-l border-[var(--card-border)] flex items-center space-x-6">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-[var(--text-muted)]">+ Charges</div>
                    <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">₹ {(freightCharge + hamaliCharge).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase text-rose-500">- Driver Advance</div>
                    <div className="text-lg font-bold font-mono text-rose-500">₹ {advancePaid.toLocaleString()}</div>
                  </div>
                  <div className="bg-[var(--surface-bg)] px-4 py-2 rounded-xl border border-[var(--card-border)] font-bold">
                    <div className="text-[11px] font-black uppercase text-sky-500 dark:text-sky-400">Net Load Payable</div>
                    <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400">₹ {netPayable.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto font-sans">
              <button type="button" onClick={handleResetForm}
                className="erp-btn-secondary px-6 py-3.5 text-xs flex-1 sm:flex-none text-center">
                Reset Form
              </button>
              <button type="button" onClick={handleSave}
                className="erp-btn-primary px-8 py-3.5 text-sm flex items-center justify-center space-x-2 flex-1 sm:flex-none">
                <Save className="w-5 h-5 stroke-[2.5]" />
                <span>{editingId ? 'UPDATE & RE-CALCULATE STOCK' : 'SAVE ARRIVAL & SYNC LEDGERS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ARRIVAL REGISTER LIST */}
      {activeSubTab === 'LIST' && (
        <div className="erp-panel p-6 rounded-2xl space-y-6 font-sans">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[var(--card-border)] pb-4">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <span>Saved Arrivals Register</span>
              <span className="text-xs bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono px-2.5 py-0.5 rounded font-bold">
                {filteredVehicles.length} Loads Synced
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search vehicle no, arrival no, fruit, supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="erp-input w-full pl-9 pr-4"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-[var(--text-muted)] hidden sm:block" />
                <CommandSelect
                  value={filterFruit}
                  onChange={(val) => setFilterFruit(val)}
                  options={[
                    { id: 'ALL', label: 'All Fruit Types', emoji: '📦' },
                    ...fruitOptions
                  ]}
                  placeholder="Filter Fruit..."
                  creatable={false}
                  className="sm:w-56"
                />
              </div>
            </div>
          </div>

          {/* List Table */}
          <div className="overflow-x-auto">
            <table className="erp-table w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="text-[11px]">
                  <th className="py-3.5 px-4 col-text w-28">Arrival # / Date</th>
                  <th className="py-3.5 px-3 col-text w-40">Vehicle Details</th>
                  <th className="py-3.5 px-3 col-text w-32">Fruit Item</th>
                  <th className="py-3.5 px-3 col-num w-28">Carets</th>
                  <th className="py-3.5 px-3 col-num w-32">Weight (KG)</th>
                  <th className="py-3.5 px-4 col-num font-black text-emerald-500 w-44">Total Amount</th>
                  <th className="py-3.5 px-3 col-text">Suppliers</th>
                  <th className="py-3.5 px-4 col-actions w-32">Actions / View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 dark:divide-slate-800/80 divide-slate-200 font-mono">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center dark:text-slate-500 text-slate-600 font-sans text-sm font-medium">
                      No matching vehicle arrivals found. Create a new load entry above!
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map(veh => {
                    const uniqueSuppliers = new Set(veh.rows.map(r => r.supplierName));
                    const supplierListStr = Array.from(uniqueSuppliers).join(', ');

                    return (
                      <tr key={veh.id} className="hover:bg-slate-800/40 dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors group font-sans">
                        <td className="py-4 px-4 col-text font-mono">
                          <span className="font-bold dark:text-slate-200 text-slate-900 block text-sm">{veh.arrivalNo}</span>
                          <span className="text-[11px] dark:text-slate-400 text-slate-600 flex items-center mt-0.5 font-sans">
                            <Calendar className="w-3 h-3 mr-1 text-emerald-500" />
                            {fmtDate(veh.date)} ({veh.day})
                          </span>
                        </td>
                        <td className="py-4 px-3 col-text font-sans">
                          <span className="font-black font-mono dark:text-white text-slate-900 block uppercase tracking-wider text-sm">{veh.vehicleNo}</span>
                          <span className="dark:text-slate-400 text-slate-600 text-[11px] block truncate max-w-[180px]">{veh.vehicleName || 'Truck'}</span>
                        </td>
                        <td className="py-4 px-3 col-text font-bold text-emerald-500 font-sans text-sm">
                          {veh.fruitType}
                        </td>
                        <td className="py-4 px-3 col-num font-mono font-semibold dark:text-slate-300 text-slate-800">
                          {veh.totalCarets} <span className="text-[10px] dark:text-slate-500 text-slate-600 font-normal">CRT</span>
                        </td>
                        <td className="py-4 px-3 col-num font-mono font-semibold dark:text-slate-300 text-slate-800">
                          {veh.totalCalculatedWeight} <span className="text-[10px] dark:text-slate-500 text-slate-600 font-normal">KG</span>
                        </td>
                        <td className="py-4 px-4 col-num font-black font-mono text-emerald-500 text-base bg-emerald-950/10">
                          ₹ {veh.totalAmount.toLocaleString('en-IN')}
                          {(veh.freightCharge || veh.hamaliCharge) ? (
                            <span className="block text-[10px] font-sans font-normal dark:text-slate-400 text-slate-600">+ Charges</span>
                          ) : null}
                        </td>
                        <td className="py-4 px-3 col-text max-w-[200px] font-sans">
                          <span className="truncate block dark:text-slate-200 text-slate-900 font-semibold" title={supplierListStr}>
                            {supplierListStr}
                          </span>
                          <span className="text-[10px] dark:text-slate-500 text-slate-600 block font-medium">{uniqueSuppliers.size} Party / Suppliers</span>
                        </td>
                        <td className="py-4 px-4 col-actions font-sans">
                          <div className="flex items-center justify-center space-x-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setPreviewVehicle(veh)}
                              className="p-2 dark:text-slate-400 text-slate-600 hover:text-emerald-500 rounded-lg transition-colors cursor-pointer"
                              title="View Billa"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditVehicle(veh)}
                              className="p-2 dark:text-slate-400 text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                              title="Edit Load"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await dialog.confirm({ variant: 'destructive', title: `Delete ${veh.arrivalNo}?`, description: 'This will permanently remove the vehicle arrival record and revert stock inventory and supplier ledger balances.', confirmText: 'Delete Arrival' });
                                if (ok) { deleteVehicleArrival(veh.id); toast.info('Arrival Deleted', `${veh.arrivalNo} removed.`); }
                              }}
                              className="p-2 dark:text-slate-400 text-slate-600 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                              title="Delete Load"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF / Billa Preview Modal */}
      <VehiclePreviewModal
        vehicle={previewVehicle}
        onClose={() => setPreviewVehicle(null)}
      />
    </div>
  );
};
