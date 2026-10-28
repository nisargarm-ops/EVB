import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Search, 
  CheckCircle2 
} from 'lucide-react';
import { Organization } from '../types';
import { api } from '../services/api';

export const Organizations: React.FC = () => {
  const [organizations] = useState<Organization[]>(api.listOrganizations());
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = organizations.filter((org) => {
    const rawType = org.org_type || org.type || 'ENTERPRISE';
    const matchesFilter = filterType === 'ALL' || rawType === filterType;
    const loc = org.facility_location || org.facility_id || '';
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rawType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getRoleBadgeColor = (typeStr: string) => {
    switch (typeStr) {
      case 'MANUFACTURER':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'OEM':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'FLEET_OPERATOR':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'SERVICE_CENTER':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'REMANUFACTURER':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'RECYCLER':
        return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
      case 'REGULATOR_AUDITOR':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Enterprise & Facility Directory</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              EU Verified Directory
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Certified manufacturers, OEMs, service networks, remanufacturers, and recyclers operating on BatteryPass 360.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Enterprises' },
            { id: 'MANUFACTURER', label: 'Manufacturers' },
            { id: 'OEM', label: 'OEMs' },
            { id: 'FLEET_OPERATOR', label: 'Fleets' },
            { id: 'SERVICE_CENTER', label: 'Service Hubs' },
            { id: 'REMANUFACTURER', label: 'Remanufacturers' },
            { id: 'RECYCLER', label: 'Recyclers' },
            { id: 'REGULATOR_AUDITOR', label: 'Auditors' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === item.id
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search enterprise name, facility, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Directory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((org) => {
          const rawType = org.org_type || org.type || 'ENTERPRISE';
          const facility = org.facility_location || org.facility_id || 'Primary Facility';

          return (
            <div
              key={org.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeColor(rawType)}`}>
                    {rawType.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{org.name}</h3>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{org.country}</span>
                    <span className="font-mono text-[10px] text-cyan-400">• {facility}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>EU Metrology Verification:</span>
                    <span className="flex items-center space-x-1 text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accredited</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Audit Frequency:</span>
                    <span className="text-slate-200 font-mono text-[11px]">Biannual</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>API Integration:</span>
                    <span className="text-cyan-400 font-mono text-[11px]">FastAPI v1 / Supabase RLS</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">UUID: {org.id.slice(0, 13)}...</span>
                <span className="text-emerald-400 font-medium">Compliance Active</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
