import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Package, Search, Filter, ArrowUpRight, ArrowDownRight, Layers, AlertTriangle, RefreshCw } from 'lucide-react';
import { Combobox } from './ui/Combobox';

export const InventoryModule: React.FC = () => {
  const { inventory, stockMovements, fruits } = useApp();

  const [activeTab, setActiveTab] = useState<'LIVE_STOCK' | 'MOVEMENT_HISTORY'>('LIVE_STOCK');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFruit, setFilterFruit] = useState('ALL');

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch =
        item.fruit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variety.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFruit = filterFruit === 'ALL' || item.fruit.toLowerCase() === filterFruit.toLowerCase();
      return matchesSearch && matchesFruit;
    });
  }, [inventory, searchTerm, filterFruit]);

  const filteredMovements = useMemo(() => {
    return stockMovements.filter(m => {
      const matchesSearch =
        m.fruit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.variety.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.reference.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFruit = filterFruit === 'ALL' || m.fruit.toLowerCase() === filterFruit.toLowerCase();
      return matchesSearch && matchesFruit;
    });
  }, [stockMovements, searchTerm, filterFruit]);

  const totalStockWeight = inventory.reduce((sum, it) => sum + it.totalWeight, 0);
  const totalStockCarets = inventory.reduce((sum, it) => sum + it.totalCarets, 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 dark:bg-slate-900 bg-white p-4 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-md">
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Package className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>LIVE INVENTORY SYSTEM</span>
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-600 mt-0.5">Auto-generated from Gate Inward & Purchase Bills. Decremented by Sales Invoices.</p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 dark:bg-slate-950 bg-slate-100 p-1.5 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
          <button
            onClick={() => setActiveTab('LIVE_STOCK')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'LIVE_STOCK'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-white hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Live Variety Stock</span>
          </button>
          <button
            onClick={() => setActiveTab('MOVEMENT_HISTORY')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'MOVEMENT_HISTORY'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-white hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Movement Audit Log ({stockMovements.length})</span>
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-sans">
        <div className="bg-slate-900 dark:bg-slate-900 bg-white p-5 rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 block">Total Warehouse Stock Weight</span>
            <span className="text-2xl font-black font-mono dark:text-white text-slate-900 mt-1 block">
              {totalStockWeight.toLocaleString('en-IN')} <span className="text-xs text-teal-600 dark:text-teal-400 font-normal font-sans">KG</span>
            </span>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-900 bg-white p-5 rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 block">Total Warehouse Caret Boxes</span>
            <span className="text-2xl font-black font-mono dark:text-white text-slate-900 mt-1 block">
              {totalStockCarets.toLocaleString('en-IN')} <span className="text-xs text-teal-600 dark:text-teal-400 font-normal font-sans">CRT</span>
            </span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-900 bg-white p-5 rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 block">Inventory Source Connection</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-2"></span>
              Fully Automated Sync
            </span>
            <span className="text-[11px] dark:text-slate-500 text-slate-600 block mt-0.5 font-medium">No manual stock entry required</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <RefreshCw className="w-6 h-6 animate-spin-slow" />
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-slate-900 dark:bg-slate-900 bg-white p-4 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 dark:text-slate-400 text-slate-600 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search fruit, variety..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-500 placeholder-slate-500"
          />
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 dark:text-slate-400 text-slate-600 hidden sm:block" />
          <Combobox
            value={filterFruit === 'ALL' ? 'All Fruits Inventory' : filterFruit}
            onChange={(val) => setFilterFruit(val === 'All Fruits Inventory' ? 'ALL' : val)}
            options={['All Fruits Inventory', ...fruits.map(f => f.name)]}
            placeholder="Filter Fruit..."
            searchPlaceholder="Search fruit..."
            creatable={false}
            className="py-2.5 sm:w-60"
          />
        </div>
      </div>

      {/* SUB-TAB 1: LIVE VARIETY STOCK TABLE */}
      {activeTab === 'LIVE_STOCK' && (
        <div className="bg-slate-900 dark:bg-slate-900 bg-white rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl overflow-hidden font-sans">
          <div className="px-6 py-4 bg-slate-950 dark:bg-slate-950 bg-slate-100 border-b border-slate-800 dark:border-slate-800 border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-300 text-slate-900">Live Variety-Wise Warehouse Stock</span>
            <span className="text-xs dark:text-slate-400 text-slate-600 font-bold font-mono">Total Unique Items: {filteredInventory.length}</span>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
            <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
              <thead>
                <tr className="bg-slate-950 dark:bg-slate-950 bg-slate-100 dark:text-slate-300 text-slate-900 uppercase font-bold border-b border-slate-800 dark:border-slate-800 border-slate-200 text-[11px]">
                  <th className="py-3.5 px-6">Fruit Category</th>
                  <th className="py-3.5 px-4">Variety (Vakkal)</th>
                  <th className="py-3.5 px-4 text-right">Carets Quantity</th>
                  <th className="py-3.5 px-6 text-right font-black text-teal-600 dark:text-teal-400">Total Net Weight (KG)</th>
                  <th className="py-3.5 px-6 text-center">Status / Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 dark:divide-slate-800/80 divide-slate-200 font-mono">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center dark:text-slate-500 text-slate-600 font-sans text-sm">
                      No stock records found. Save an Inward Load or Purchase Bill to add stock!
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(item => {
                    const isLowStock = item.totalWeight <= 200 && item.totalWeight > 0;
                    const isOut = item.totalWeight <= 0;

                    return (
                      <tr key={item.key} className="hover:bg-slate-800/40 dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors font-sans group">
                        <td className="py-4 px-6 font-bold dark:text-white text-slate-900 flex items-center space-x-2.5 font-sans">
                          <div className={`w-2.5 h-2.5 rounded-full ${isOut ? 'bg-rose-500' : isLowStock ? 'bg-amber-400 animate-pulse' : 'bg-teal-500'}`}></div>
                          <span>{item.fruit}</span>
                        </td>
                        <td className="py-4 px-4 font-black dark:text-slate-200 text-slate-900 text-base font-sans">
                          {item.variety}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold dark:text-slate-300 text-slate-800 text-sm">
                          {item.totalCarets} <span className="text-xs dark:text-slate-500 text-slate-600 font-normal font-sans">CRT</span>
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-black text-base text-teal-600 dark:text-teal-400 bg-teal-950/10">
                          {item.totalWeight.toLocaleString('en-IN')} <span className="text-xs dark:text-teal-500 text-teal-700 font-normal font-sans">KG</span>
                        </td>
                        <td className="py-4 px-6 text-center font-sans">
                          {isOut ? (
                            <span className="bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1 font-mono">
                              <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                              <span>Low Stock</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono">
                              Optimal Stock
                            </span>
                          )}
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

      {/* SUB-TAB 2: MOVEMENT AUDIT LOG */}
      {activeTab === 'MOVEMENT_HISTORY' && (
        <div className="bg-slate-900 dark:bg-slate-900 bg-white rounded-2xl border border-slate-800 dark:border-slate-800 border-slate-200 shadow-xl overflow-hidden font-sans">
          <div className="px-6 py-4 bg-slate-950 dark:bg-slate-950 bg-slate-100 border-b border-slate-800 dark:border-slate-800 border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-300 text-slate-900">Automated Inventory Movement Audit Log</span>
            <span className="text-xs dark:text-slate-400 text-slate-600 font-medium">Chronological history of all stock additions & billing deductions</span>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 font-sans">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-950 dark:bg-slate-950 bg-slate-100 dark:text-slate-300 text-slate-900 uppercase font-bold border-b border-slate-800 dark:border-slate-800 border-slate-200 text-[11px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3">Item Variety</th>
                  <th className="py-3 px-4">Source / Reference</th>
                  <th className="py-3 px-3 text-right">Weight Change</th>
                  <th className="py-3 px-3 text-right">Carets Change</th>
                  <th className="py-3 px-4 text-right font-black text-teal-600 dark:text-teal-400">Resulting Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 dark:divide-slate-800/80 divide-slate-200 font-mono font-medium">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center dark:text-slate-500 text-slate-600 font-sans text-sm">
                      No movement history recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    const isStockIn = m.type === 'ARRIVAL' || m.type === 'PURCHASE_BILL';
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40 dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors font-sans group">
                        <td className="py-3.5 px-4 font-mono dark:text-slate-400 text-slate-600 whitespace-nowrap text-xs">{m.date}</td>
                        <td className="py-3.5 px-3">
                          {isStockIn ? (
                            <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase flex items-center w-max font-mono">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                              <span>{m.type === 'ARRIVAL' ? 'STOCK IN (GATE)' : 'STOCK IN (BUY)'}</span>
                            </span>
                          ) : (
                            <span className="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase flex items-center w-max font-mono">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
                              <span>STOCK OUT (SALE)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-bold dark:text-white text-slate-950 font-sans">
                          {m.fruit} <span className="dark:text-slate-400 text-slate-600 font-semibold font-sans">({m.variety})</span>
                        </td>
                        <td className="py-3.5 px-4 dark:text-slate-300 text-slate-800 font-sans truncate max-w-[240px] font-medium">
                          {m.reference}
                        </td>
                        <td className={`py-3.5 px-3 text-right font-mono font-extrabold text-sm ${isStockIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isStockIn ? `+${m.weightChange}` : m.weightChange} KG
                        </td>
                        <td className={`py-3.5 px-3 text-right font-mono font-extrabold text-sm ${isStockIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isStockIn ? `+${m.caretChange}` : m.caretChange} CRT
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-950/10 text-sm">
                          {m.resultingWeight} KG <span className="text-[11px] dark:text-slate-500 text-slate-600 font-normal font-sans">({m.resultingCarets} CRT)</span>
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
    </div>
  );
};
