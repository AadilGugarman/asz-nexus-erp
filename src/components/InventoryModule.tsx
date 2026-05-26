import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, Search, Filter, ArrowUpRight, ArrowDownRight, 
  Layers, AlertTriangle, RefreshCw, ArrowUpDown 
} from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useDataTable } from '../hooks/useDataTable';

import { DataTable, Pagination } from './ui/table';
import { CommandSelect, CommandOption } from './ui/CommandSelect';
import { ModuleEmptyState, TableSkeleton } from './ui/DataStates';

import { fmtDate } from '@/utils/format';

export const InventoryModule: React.FC = () => {
  const { inventory, stockMovements, fruits } = useApp();

  const [activeTab, setActiveTab] = useState<'LIVE_STOCK' | 'MOVEMENT_HISTORY'>('LIVE_STOCK');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFruit, setFilterFruit] = useState('ALL');
  const [isTableLoading, setIsTableLoading] = useState(false);

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

  const liveStockTable = useDataTable<(typeof filteredInventory)[number], 'fruit' | 'variety' | 'totalCarets' | 'totalWeight'>({
    data: filteredInventory,
    initialSortBy: 'totalWeight',
    initialSortDir: 'desc',
    initialPageSize: 15,
    pageSizeOptions: [10, 15, 30, 50],
    sortComparators: {
      fruit: (a, b) => a.fruit.localeCompare(b.fruit),
      variety: (a, b) => a.variety.localeCompare(b.variety),
      totalCarets: (a, b) => a.totalCarets - b.totalCarets,
      totalWeight: (a, b) => a.totalWeight - b.totalWeight,
    },
    resetPageOn: [activeTab, filterFruit],
  });

  const movementTable = useDataTable<(typeof filteredMovements)[number], 'date' | 'fruit' | 'weightChange' | 'resultingWeight'>({
    data: filteredMovements,
    initialSortBy: 'date',
    initialSortDir: 'desc',
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      fruit: (a, b) => `${a.fruit}-${a.variety}`.localeCompare(`${b.fruit}-${b.variety}`),
      weightChange: (a, b) => a.weightChange - b.weightChange,
      resultingWeight: (a, b) => a.resultingWeight - b.resultingWeight,
    },
    resetPageOn: [activeTab, filterFruit],
  });

  useEffect(() => {
    setIsTableLoading(true);
    const timer = window.setTimeout(() => setIsTableLoading(false), 150);
    return () => window.clearTimeout(timer);
  }, [activeTab, searchTerm, filterFruit, liveStockTable.sortBy, liveStockTable.sortDir, movementTable.sortBy, movementTable.sortDir]);

  const totalStockWeight = inventory.reduce((sum, it) => sum + it.totalWeight, 0);
  const totalStockCarets = inventory.reduce((sum, it) => sum + it.totalCarets, 0);

  const fruitOptions: CommandOption[] = useMemo(() => {
    return [
      { id: 'ALL', label: 'All Fruits Inventory', emoji: '📦' },
      ...fruits.map(f => ({
        id: f.name,
        label: f.name,
        emoji: '🍃' // You could use getEmoji here too
      }))
    ];
  }, [fruits]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="erp-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <h1 className="erp-title text-[1.1rem] flex items-center space-x-2.5">
            <Package className="w-6 h-6 text-[#00aeef]" />
            <span>LIVE INVENTORY SYSTEM</span>
          </h1>
          <p className="erp-subtitle mt-1">Auto-generated from Purchase Bills. Decremented by Sales Invoices.</p>
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
          <CommandSelect
            variant="sky"
            value={filterFruit}
            onChange={(val) => setFilterFruit(val)}
            options={fruitOptions}
            placeholder="Filter Fruit..."
            creatable={false}
            className="sm:w-64"
          />
        </div>
      </div>

      {/* SUB-TAB 1: LIVE VARIETY STOCK TABLE */}
      {activeTab === 'LIVE_STOCK' && (
        <DataTable
          className="font-sans"
          toolbar={
          <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#edf2f7] flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">Live Variety-Wise Warehouse Stock</span>
            <span className="text-xs text-[#64748b] font-semibold font-mono">Total Unique Items: {liveStockTable.totalRecords}</span>
          </div>
          }
          footer={
            <Pagination
              page={liveStockTable.page}
              totalPages={liveStockTable.totalPages}
              totalRecords={liveStockTable.totalRecords}
              pageSize={liveStockTable.pageSize}
              pageSizeOptions={liveStockTable.pageSizeOptions}
              onPageChange={liveStockTable.setPage}
              onPageSizeChange={liveStockTable.setPageSize}
              label="stock items"
            />
          }
        >

            <table className="erp-table text-left font-sans">
              <thead>
                <tr>
                  <th className="py-3.5 px-6 col-text"><button type="button" onClick={() => liveStockTable.toggleSort('fruit')} className="inline-flex items-center gap-1">Fruit Category <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                  <th className="py-3.5 px-4 col-text"><button type="button" onClick={() => liveStockTable.toggleSort('variety')} className="inline-flex items-center gap-1">Variety (Vakkal) <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                  <th className="py-3.5 px-4 col-num w-44"><button type="button" onClick={() => liveStockTable.toggleSort('totalCarets')} className="inline-flex items-center gap-1 ml-auto">Carets Quantity <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                  <th className="py-3.5 px-6 col-num text-[#00aeef] w-52"><button type="button" onClick={() => liveStockTable.toggleSort('totalWeight')} className="inline-flex items-center gap-1 ml-auto">Total Net Weight (KG) <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                  <th className="py-3.5 px-6 col-actions w-44">Status / Health</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {isTableLoading ? (
                  <tr>
                    <td colSpan={5} className="p-0"><TableSkeleton rows={7} cols={5} /></td>
                  </tr>
                ) : liveStockTable.totalRecords === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-0">
                      <ModuleEmptyState title="No stock records found" subtitle="Save an Inward Load or Purchase Bill to add stock." />
                    </td>
                  </tr>
                ) : (
                  liveStockTable.pageRows.map(item => {
                    const isLowStock = item.totalWeight <= 200 && item.totalWeight > 0;
                    const isOut = item.totalWeight <= 0;

                    return (
                      <tr key={item.key} className="font-sans group">
                        <td className="py-4 px-6 col-text font-semibold text-[#0f172a] flex items-center space-x-2.5 font-sans">
                          <div className={`w-2.5 h-2.5 rounded-full ${isOut ? 'bg-rose-500' : isLowStock ? 'bg-amber-400 animate-pulse' : 'bg-teal-500'}`}></div>
                          <span>{item.fruit}</span>
                        </td>
                        <td className="py-4 px-4 col-text font-semibold text-[#0f172a] text-[15px] font-sans">
                          {item.variety}
                        </td>
                        <td className="py-4 px-4 col-num font-mono font-semibold text-[#334155] text-sm">
                          {item.totalCarets} <span className="text-xs text-[#64748b] font-normal font-sans">CRT</span>
                        </td>
                        <td className="py-4 px-6 col-num font-mono font-semibold text-base text-[#00aeef] bg-[rgba(0,174,239,0.06)]">
                          {item.totalWeight.toLocaleString('en-IN')} <span className="text-xs text-[#0369a1] font-normal font-sans">KG</span>
                        </td>
                        <td className="py-4 px-6 col-actions font-sans">
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
        </DataTable>
      )}

      {/* SUB-TAB 2: MOVEMENT AUDIT LOG */}
      {activeTab === 'MOVEMENT_HISTORY' && (
        <DataTable
          className="font-sans"
          toolbar={
          <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#edf2f7] flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">Automated Inventory Movement Audit Log</span>
            <span className="text-xs text-[#64748b] font-medium">Chronological history of all stock additions & billing deductions</span>
          </div>
          }
          footer={
            <Pagination
              page={movementTable.page}
              totalPages={movementTable.totalPages}
              totalRecords={movementTable.totalRecords}
              pageSize={movementTable.pageSize}
              pageSizeOptions={movementTable.pageSizeOptions}
              onPageChange={movementTable.setPage}
              onPageSizeChange={movementTable.setPageSize}
              label="movements"
            />
          }
        >

            <table className="erp-table text-left">
              <thead>
                <tr>
                  <th className="py-3 px-4 col-text w-28"><button type="button" onClick={() => movementTable.toggleSort('date')} className="inline-flex items-center gap-1">Date & Time <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                  <th className="py-3 px-3 col-text w-40">Movement Type</th>
                  <th className="py-3 px-3 col-text"><button type="button" onClick={() => movementTable.toggleSort('fruit')} className="inline-flex items-center gap-1">Item Variety <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                  <th className="py-3 px-4 col-text">Source / Reference</th>
                  <th className="py-3 px-3 col-num w-36"><button type="button" onClick={() => movementTable.toggleSort('weightChange')} className="inline-flex items-center gap-1 ml-auto">Weight Change <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                  <th className="py-3 px-3 col-num w-36">Carets Change</th>
                  <th className="py-3 px-4 col-num text-[#00aeef] w-48"><button type="button" onClick={() => movementTable.toggleSort('resultingWeight')} className="inline-flex items-center gap-1 ml-auto">Resulting Balance <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                </tr>
              </thead>
              <tbody className="font-mono font-medium">
                {isTableLoading ? (
                  <tr>
                    <td colSpan={7} className="p-0"><TableSkeleton rows={7} cols={7} /></td>
                  </tr>
                ) : movementTable.totalRecords === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-0">
                      <ModuleEmptyState title="No movement history recorded" subtitle="Stock movement entries appear after arrivals, purchases, and sales." />
                    </td>
                  </tr>
                ) : (
                  movementTable.pageRows.map(m => {
                    const isStockIn = m.type === 'ARRIVAL' || m.type === 'PURCHASE_BILL';
                    return (
                      <tr key={m.id} className="font-sans group">
                        <td className="py-3.5 px-4 col-text font-mono text-[#64748b] whitespace-nowrap text-xs">{fmtDate(m.date)}</td>
                        <td className="py-3.5 px-3 col-text">
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
                        <td className="py-3.5 px-3 col-text font-semibold text-[#0f172a] font-sans">
                          {m.fruit} <span className="text-[#64748b] font-medium font-sans">({m.variety})</span>
                        </td>
                        <td className="py-3.5 px-4 col-text text-[#334155] font-sans truncate max-w-[240px] font-medium">
                          {m.reference}
                        </td>
                        <td className={`py-3.5 px-3 col-num font-mono font-semibold text-sm ${isStockIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isStockIn ? `+${m.weightChange}` : m.weightChange} KG
                        </td>
                        <td className={`py-3.5 px-3 col-num font-mono font-semibold text-sm ${isStockIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isStockIn ? `+${m.caretChange}` : m.caretChange} CRT
                        </td>
                        <td className="py-3.5 px-4 col-num font-mono font-semibold text-[#00aeef] bg-[rgba(0,174,239,0.06)] text-sm">
                          {m.resultingWeight} KG <span className="text-[11px] text-[#64748b] font-normal font-sans">({m.resultingCarets} CRT)</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
        </DataTable>
      )}
    </div>
  );
};
