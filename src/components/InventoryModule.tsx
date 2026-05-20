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
      <div className="erp-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <h1 className="erp-title text-[1.1rem] flex items-center space-x-2.5">
            <Package className="w-6 h-6 text-[#00aeef]" />
            <span>LIVE INVENTORY SYSTEM</span>
          </h1>
          <p className="erp-subtitle mt-1">Auto-generated from Gate Inward & Purchase Bills. Decremented by Sales Invoices.</p>
        </div>

        <div className="erp-surface flex items-center space-x-2 p-1.5">
          <button
            onClick={() => setActiveTab('LIVE_STOCK')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeTab === 'LIVE_STOCK'
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)]'
                : 'text-[#64748b] hover:text-[#0f172a] hover:bg-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Live Variety Stock</span>
          </button>
          <button
            onClick={() => setActiveTab('MOVEMENT_HISTORY')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeTab === 'MOVEMENT_HISTORY'
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)]'
                : 'text-[#64748b] hover:text-[#0f172a] hover:bg-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Movement Audit Log ({stockMovements.length})</span>
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-sans">
        <div className="erp-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8] block">Total Warehouse Stock Weight</span>
            <span className="text-[1.7rem] font-semibold font-mono text-[#0f172a] mt-1 block leading-tight">
              {totalStockWeight.toLocaleString('en-IN')} <span className="text-xs text-[#00aeef] font-medium font-sans">KG</span>
            </span>
          </div>
          <div className="p-3 bg-[rgba(0,174,239,0.1)] text-[#00aeef] rounded-xl border border-[rgba(0,174,239,0.25)]">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="erp-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8] block">Total Warehouse Caret Boxes</span>
            <span className="text-[1.7rem] font-semibold font-mono text-[#0f172a] mt-1 block leading-tight">
              {totalStockCarets.toLocaleString('en-IN')} <span className="text-xs text-[#00aeef] font-medium font-sans">CRT</span>
            </span>
          </div>
          <div className="p-3 bg-[rgba(0,200,150,0.1)] text-[#00c896] rounded-xl border border-[rgba(0,200,150,0.25)]">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="erp-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8] block">Inventory Source Connection</span>
            <span className="text-sm font-semibold text-[#10b981] mt-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping mr-2"></span>
              Fully Automated Sync
            </span>
            <span className="text-[11px] text-[#64748b] block mt-0.5 font-medium">No manual stock entry required</span>
          </div>
          <div className="p-3 bg-[rgba(16,185,129,0.1)] text-[#10b981] rounded-xl border border-[rgba(16,185,129,0.25)]">
            <RefreshCw className="w-6 h-6 animate-spin-slow" />
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="erp-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search fruit, variety..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="erp-input w-full pl-9 pr-4"
          />
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#94a3b8] hidden sm:block" />
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
        <div className="erp-table-wrap font-sans">
          <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#edf2f7] flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">Live Variety-Wise Warehouse Stock</span>
            <span className="text-xs text-[#64748b] font-semibold font-mono">Total Unique Items: {filteredInventory.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table text-left font-sans">
              <thead>
                <tr>
                  <th className="py-3.5 px-6">Fruit Category</th>
                  <th className="py-3.5 px-4">Variety (Vakkal)</th>
                  <th className="py-3.5 px-4 text-right">Carets Quantity</th>
                  <th className="py-3.5 px-6 text-right text-[#00aeef]">Total Net Weight (KG)</th>
                  <th className="py-3.5 px-6 text-center">Status / Health</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-[#94a3b8] font-sans text-sm">
                      No stock records found. Save an Inward Load or Purchase Bill to add stock!
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(item => {
                    const isLowStock = item.totalWeight <= 200 && item.totalWeight > 0;
                    const isOut = item.totalWeight <= 0;

                    return (
                      <tr key={item.key} className="font-sans group">
                        <td className="py-4 px-6 font-semibold text-[#0f172a] flex items-center space-x-2.5 font-sans">
                          <div className={`w-2.5 h-2.5 rounded-full ${isOut ? 'bg-rose-500' : isLowStock ? 'bg-amber-400 animate-pulse' : 'bg-teal-500'}`}></div>
                          <span>{item.fruit}</span>
                        </td>
                        <td className="py-4 px-4 font-semibold text-[#0f172a] text-[15px] font-sans">
                          {item.variety}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-semibold text-[#334155] text-sm">
                          {item.totalCarets} <span className="text-xs text-[#64748b] font-normal font-sans">CRT</span>
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-semibold text-base text-[#00aeef] bg-[rgba(0,174,239,0.06)]">
                          {item.totalWeight.toLocaleString('en-IN')} <span className="text-xs text-[#0369a1] font-normal font-sans">KG</span>
                        </td>
                        <td className="py-4 px-6 text-center font-sans">
                          {isOut ? (
                            <span className="bg-rose-500/10 text-rose-700 border border-rose-500/30 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider font-mono">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="bg-amber-500/10 text-amber-700 border border-amber-500/30 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center space-x-1 font-mono">
                              <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                              <span>Low Stock</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider font-mono">
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
        <div className="erp-table-wrap font-sans">
          <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#edf2f7] flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">Automated Inventory Movement Audit Log</span>
            <span className="text-xs text-[#64748b] font-medium">Chronological history of all stock additions & billing deductions</span>
          </div>

          <div className="overflow-x-auto font-sans">
            <table className="erp-table text-left">
              <thead>
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3">Item Variety</th>
                  <th className="py-3 px-4">Source / Reference</th>
                  <th className="py-3 px-3 text-right">Weight Change</th>
                  <th className="py-3 px-3 text-right">Carets Change</th>
                  <th className="py-3 px-4 text-right text-[#00aeef]">Resulting Balance</th>
                </tr>
              </thead>
              <tbody className="font-mono font-medium">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#94a3b8] font-sans text-sm">
                      No movement history recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    const isStockIn = m.type === 'ARRIVAL' || m.type === 'PURCHASE_BILL';
                    return (
                      <tr key={m.id} className="font-sans group">
                        <td className="py-3.5 px-4 font-mono text-[#64748b] whitespace-nowrap text-xs">{m.date}</td>
                        <td className="py-3.5 px-3">
                          {isStockIn ? (
                            <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase flex items-center w-max font-mono">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              <span>{m.type === 'ARRIVAL' ? 'STOCK IN (GATE)' : 'STOCK IN (BUY)'}</span>
                            </span>
                          ) : (
                            <span className="bg-sky-500/10 text-sky-700 border border-sky-500/30 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase flex items-center w-max font-mono">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-1 text-sky-600" />
                              <span>STOCK OUT (SALE)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#0f172a] font-sans">
                          {m.fruit} <span className="text-[#64748b] font-medium font-sans">({m.variety})</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#334155] font-sans truncate max-w-[240px] font-medium">
                          {m.reference}
                        </td>
                        <td className={`py-3.5 px-3 text-right font-mono font-semibold text-sm ${isStockIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isStockIn ? `+${m.weightChange}` : m.weightChange} KG
                        </td>
                        <td className={`py-3.5 px-3 text-right font-mono font-semibold text-sm ${isStockIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isStockIn ? `+${m.caretChange}` : m.caretChange} CRT
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#00aeef] bg-[rgba(0,174,239,0.06)] text-sm">
                          {m.resultingWeight} KG <span className="text-[11px] text-[#64748b] font-normal font-sans">({m.resultingCarets} CRT)</span>
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
