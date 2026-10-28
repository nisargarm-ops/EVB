import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  LayoutGrid, 
  List, 
  QrCode, 
  ArrowRight, 
  Zap, 
  Leaf, 
  PlusCircle, 
  RefreshCw,
  Cpu,
  Layers
} from 'lucide-react';
import { PassportSummary, UserRole } from '../types';
import { api } from '../services/api';

interface BatteryInventoryProps {
  onSelectPassport: (id: string) => void;
  onShowQr: (id: string) => void;
  onNavigateCreate: () => void;
  onNavigateQpiAI: (selectedIds?: string[]) => void;
  activeRole: UserRole;
}

export const BatteryInventory: React.FC<BatteryInventoryProps> = ({
  onSelectPassport,
  onShowQr,
  onNavigateCreate,
  onNavigateQpiAI,
  activeRole
}) => {
  const [passports, setPassports] = useState<PassportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [chemistryFilter, setChemistryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'soh_desc' | 'soh_asc' | 'capacity_desc' | 'recent'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedForOptimization, setSelectedForOptimization] = useState<string[]>([]);

  const loadPassports = async () => {
    setLoading(true);
    try {
      const data = await api.listPassports(statusFilter === 'ALL' ? undefined : statusFilter);
      setPassports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassports();
  }, [statusFilter]);

  // Client-side filtering & sorting
  const filtered = passports.filter(p => {
    const matchesSearch = 
      p.battery_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.battery_did.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manufacturer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.current_custodian.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChem = chemistryFilter === 'ALL' || p.chemistry === chemistryFilter;
    return matchesSearch && matchesChem;
  }).sort((a, b) => {
    if (sortBy === 'soh_desc') return b.state_of_health_pct - a.state_of_health_pct;
    if (sortBy === 'soh_asc') return a.state_of_health_pct - b.state_of_health_pct;
    if (sortBy === 'capacity_desc') return b.rated_capacity_kwh - a.rated_capacity_kwh;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const chemistries = Array.from(new Set(passports.map(p => p.chemistry)));

  const toggleSelect = (id: string) => {
    if (selectedForOptimization.includes(id)) {
      setSelectedForOptimization(selectedForOptimization.filter(x => x !== id));
    } else {
      setSelectedForOptimization([...selectedForOptimization, id]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_SERVICE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'SECOND_LIFE':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'END_OF_LIFE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'RECYCLED':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Mint Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Cross-Enterprise Battery Inventory</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registered digital product passports under EU 2023/1542 Annex VI standards.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {selectedForOptimization.length > 0 && (
            <button
              onClick={() => onNavigateQpiAI(selectedForOptimization)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
            >
              <Cpu className="w-4 h-4" />
              <span>Optimize Batch ({selectedForOptimization.length})</span>
            </button>
          )}

          {activeRole === 'MANUFACTURER' && (
            <button
              onClick={onNavigateCreate}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Mint Passport</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Battery ID, DID, Serial, Manufacturer or Custodian..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Filters & Sorters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_SERVICE">In Service</option>
              <option value="SECOND_LIFE">Second Life</option>
              <option value="END_OF_LIFE">End of Life</option>
              <option value="RECYCLED">Recycled</option>
            </select>

            {/* Chemistry Select */}
            <select
              value={chemistryFilter}
              onChange={e => setChemistryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Chemistries</option>
              {chemistries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="recent">Recently Updated</option>
              <option value="soh_desc">SoH (Highest first)</option>
              <option value="soh_asc">SoH (Lowest first)</option>
              <option value="capacity_desc">Capacity (Highest)</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>Showing <strong className="text-white">{filtered.length}</strong> of {passports.length} registered battery passports</span>
          <button
            onClick={loadPassports}
            className="flex items-center space-x-1 text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => {
            const isSelected = selectedForOptimization.includes(p.battery_id);
            return (
              <div
                key={p.battery_id}
                className={`glass-panel rounded-2xl p-5 border transition-all relative flex flex-col justify-between group ${
                  isSelected ? 'border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-500/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.battery_id)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                        title="Select for QpiAI-Opt Batch Allocation"
                      />
                      <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
                        {p.battery_id}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(p.status)}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                    {p.chemistry} EV Pack
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">{p.manufacturer_name}</p>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-3 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>State of Health</span>
                      </div>
                      <div className="text-base font-bold text-emerald-400 mt-0.5">
                        {p.state_of_health_pct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                        <Leaf className="w-3 h-3 text-emerald-400" />
                        <span>Capacity</span>
                      </div>
                      <div className="text-base font-bold text-slate-200 mt-0.5">
                        {p.rated_capacity_kwh} kWh
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 truncate mb-4">
                    <span className="text-slate-500">Custodian: </span>
                    <span className="text-slate-300">{p.current_custodian}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => onShowQr(p.battery_id)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition-colors"
                    title="View QR Sticker"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onSelectPassport(p.battery_id)}
                    className="flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
                  >
                    <span>View Passport</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Battery ID</th>
                  <th className="p-3">Chemistry</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3">Custodian</th>
                  <th className="p-3">Health (SoH)</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {filtered.map(p => (
                  <tr key={p.battery_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedForOptimization.includes(p.battery_id)}
                        onChange={() => toggleSelect(p.battery_id)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                    </td>
                    <td className="p-3 font-bold text-emerald-400">{p.battery_id}</td>
                    <td className="p-3 font-sans text-slate-200">{p.chemistry}</td>
                    <td className="p-3 font-sans text-slate-300">{p.manufacturer_name}</td>
                    <td className="p-3 font-sans text-slate-300">{p.current_custodian}</td>
                    <td className="p-3 font-bold text-emerald-400">{p.state_of_health_pct}%</td>
                    <td className="p-3 text-slate-200">{p.rated_capacity_kwh} kWh</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center space-x-2">
                        <button
                          onClick={() => onShowQr(p.battery_id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectPassport(p.battery_id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-sans font-semibold text-[11px]"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
