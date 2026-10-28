import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  Key, 
  Layers, 
  Check, 
  X as CloseIcon,
  Cpu,
  FileCheck2
} from 'lucide-react';
import { Organization, UserRole } from '../types';
import { api } from '../services/api';

export const Organizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>(api.listOrganizations());
  const [viewTab, setViewTab] = useState<'directory' | 'rbac'>('directory');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.fetchOrganizations().then(setOrganizations).catch(() => {});
  }, []);

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

  // RBAC Permission Grid definition
  const rbacRoles: { role: UserRole; label: string; desc: string; permissions: Record<string, boolean> }[] = [
    {
      role: 'MANUFACTURER',
      label: 'Battery Manufacturer',
      desc: 'Cell & pack gigafactories producing original battery assemblies.',
      permissions: {
        'Mint Genesis Passport': true,
        'Write Initial Technical Specs': true,
        'Append BMS Telemetry': true,
        'Initiate Custody Transfer': true,
        'Accept Transfer & Sign Block': true,
        'Run QpiAI-Opt QUBO Allocation': false,
        'Run Quantum Cathode Simulation': true,
        'Audit & Certificate Revocation': false,
        'Mark EOL Recycling Disposition': false,
      }
    },
    {
      role: 'OEM',
      label: 'Vehicle OEM / Automaker',
      desc: 'Automotive OEMs integrating battery packs into EV chassis.',
      permissions: {
        'Mint Genesis Passport': false,
        'Write Initial Technical Specs': false,
        'Append BMS Telemetry': true,
        'Initiate Custody Transfer': true,
        'Accept Transfer & Sign Block': true,
        'Run QpiAI-Opt QUBO Allocation': true,
        'Run Quantum Cathode Simulation': true,
        'Audit & Certificate Revocation': false,
        'Mark EOL Recycling Disposition': false,
      }
    },
    {
      role: 'FLEET_OPERATOR',
      label: 'Fleet Operator',
      desc: 'Commercial, logistics, and rideshare EV fleet management.',
      permissions: {
        'Mint Genesis Passport': false,
        'Write Initial Technical Specs': false,
        'Append BMS Telemetry': true,
        'Initiate Custody Transfer': true,
        'Accept Transfer & Sign Block': true,
        'Run QpiAI-Opt QUBO Allocation': true,
        'Run Quantum Cathode Simulation': false,
        'Audit & Certificate Revocation': false,
        'Mark EOL Recycling Disposition': false,
      }
    },
    {
      role: 'SERVICE_CENTER',
      label: 'Certified Service & Repair',
      desc: 'Authorized diagnostic centers and battery module repair hubs.',
      permissions: {
        'Mint Genesis Passport': false,
        'Write Initial Technical Specs': false,
        'Append BMS Telemetry': true,
        'Initiate Custody Transfer': true,
        'Accept Transfer & Sign Block': true,
        'Run QpiAI-Opt QUBO Allocation': false,
        'Run Quantum Cathode Simulation': true,
        'Audit & Certificate Revocation': false,
        'Mark EOL Recycling Disposition': false,
      }
    },
    {
      role: 'REMANUFACTURER',
      label: 'Remanufacturer & Repurposer',
      desc: 'Second-life pack refitting for stationary energy storage (BESS).',
      permissions: {
        'Mint Genesis Passport': false,
        'Write Initial Technical Specs': false,
        'Append BMS Telemetry': true,
        'Initiate Custody Transfer': true,
        'Accept Transfer & Sign Block': true,
        'Run QpiAI-Opt QUBO Allocation': true,
        'Run Quantum Cathode Simulation': true,
        'Audit & Certificate Revocation': false,
        'Mark EOL Recycling Disposition': false,
      }
    },
    {
      role: 'RECYCLER',
      label: 'Certified Recycler',
      desc: 'Hydrometallurgical and pyrometallurgical raw mineral recyclers.',
      permissions: {
        'Mint Genesis Passport': false,
        'Write Initial Technical Specs': false,
        'Append BMS Telemetry': false,
        'Initiate Custody Transfer': true,
        'Accept Transfer & Sign Block': true,
        'Run QpiAI-Opt QUBO Allocation': true,
        'Run Quantum Cathode Simulation': false,
        'Audit & Certificate Revocation': false,
        'Mark EOL Recycling Disposition': true,
      }
    },
    {
      role: 'REGULATOR_AUDITOR',
      label: 'EU Notified Body & Auditor',
      desc: 'Accredited metrology authorities enforcing EU Regulation 2023/1542.',
      permissions: {
        'Mint Genesis Passport': false,
        'Write Initial Technical Specs': false,
        'Append BMS Telemetry': false,
        'Initiate Custody Transfer': false,
        'Accept Transfer & Sign Block': false,
        'Run QpiAI-Opt QUBO Allocation': false,
        'Run Quantum Cathode Simulation': true,
        'Audit & Certificate Revocation': true,
        'Mark EOL Recycling Disposition': false,
      }
    },
  ];

  const permissionKeys = Object.keys(rbacRoles[0].permissions);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Enterprise & Access Governance</h1>
          <p className="text-xs text-slate-400 mt-1">
            Certified manufacturers, OEMs, service hubs, and accredited European Union regulatory bodies.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewTab('directory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewTab === 'directory'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stakeholder Directory
          </button>
          <button
            onClick={() => setViewTab('rbac')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewTab === 'rbac'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RBAC Permission Matrix
          </button>
        </div>
      </div>

      {/* VIEW 1: Enterprise Directory */}
      {viewTab === 'directory' && (
        <div className="space-y-6">
          {/* Filter Bar and Search */}
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
                placeholder="Search enterprise, facility..."
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
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {rawType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{org.name}</h3>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{org.country}</span>
                        <span className="text-slate-600">·</span>
                        <span className="font-mono text-[11px] text-cyan-400">{facility}</span>
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
      )}

      {/* VIEW 2: Interactive RBAC Matrix */}
      {viewTab === 'rbac' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cross-Enterprise RBAC Governance Model</h3>
                <p className="text-xs text-slate-400">
                  Strict cryptographic permission boundaries enforced by Row-Level Security (RLS) and cryptographic signatures.
                </p>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4 font-semibold">Capability / Operation</th>
                    {rbacRoles.map(r => (
                      <th key={r.role} className="py-3 px-3 font-semibold text-center whitespace-nowrap">
                        <div className="text-slate-200">{r.role.replace(/_/g, ' ')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {permissionKeys.map(perm => (
                    <tr key={perm} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-4 font-sans text-slate-300 font-medium">
                        {perm}
                      </td>
                      {rbacRoles.map(r => {
                        const allowed = r.permissions[perm];
                        return (
                          <td key={r.role} className="py-2.5 px-3 text-center">
                            {allowed ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 text-slate-600">
                                <CloseIcon className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Cryptographic Enforcement: Each lifecycle block is digitally signed with the custodian's private key and verified via SHA-256 hash chaining.</span>
              <span className="font-mono text-cyan-400">EU 2023/1542 Art. 77</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
