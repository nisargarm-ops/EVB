import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Lock, 
  Building, 
  UserCheck, 
  Key, 
  CheckCircle2, 
  XCircle,
  Factory,
  Award,
  Truck,
  Recycle,
  ShieldAlert
} from 'lucide-react';
import { OrganizationMember, UserRole } from '../types';
import { api } from '../services/api';

interface AccessManagementPageProps {
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeOrg: string;
}

export const AccessManagementPage: React.FC<AccessManagementPageProps> = ({
  activeRole,
  onRoleChange,
  activeOrg
}) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await api.getOrganizationMembers();
      setMembers(data);
    };
    load();
  }, []);

  const rolesMatrix = [
    { role: 'MANUFACTURER', label: 'Cell Manufacturer', mint: true, telemetry: true, transfer: true, qpiai: true, audit: true, public: true },
    { role: 'OEM', label: 'Vehicle OEM', mint: false, telemetry: true, transfer: true, qpiai: true, audit: true, public: true },
    { role: 'FLEET_OPERATOR', label: 'Fleet Operator', mint: false, telemetry: true, transfer: true, qpiai: true, audit: false, public: true },
    { role: 'RECYCLER', label: 'Circularity Recycler', mint: false, telemetry: false, transfer: true, qpiai: true, audit: true, public: true },
    { role: 'REGULATOR_AUDITOR', label: 'Regulator / Auditor', mint: false, telemetry: false, transfer: false, qpiai: false, audit: true, public: true },
    { role: 'PUBLIC', label: 'Public Consumer', mint: false, telemetry: false, transfer: false, qpiai: false, audit: false, public: true },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Cross-Enterprise Access & RBAC Directory</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise identity governance, role permissions matrix, and cryptographic digital credential management.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono p-2 rounded-xl bg-slate-900 border border-slate-800">
          <Key className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Active Persona:</span>
          <strong className="text-emerald-400">{activeRole}</strong>
        </div>
      </div>

      {/* Verified Stakeholders Directory */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Cross-Enterprise Ecosystem Directory
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => {
            const isCurrent = m.role === activeRole;
            return (
              <div
                key={m.id}
                className={`glass-panel p-5 rounded-2xl border transition-all ${
                  isCurrent ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {m.role}
                  </span>
                  {m.verified ? (
                    <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>EU Verified DID</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Unrestricted Public</span>
                  )}
                </div>

                <div className="font-bold text-base text-white">{m.name}</div>
                <div className="text-xs text-slate-400">{m.email}</div>
                <div className="text-xs text-cyan-400 font-medium mt-1">{m.organization}</div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500 font-mono">
                    {m.permissions.length} Granted Scopes
                  </div>

                  {!isCurrent ? (
                    <button
                      onClick={() => onRoleChange(m.role)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      Impersonate Role
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400">Current Role</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RBAC Permission Matrix */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Role-Based Access Control (RBAC) Permission Matrix</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic ledger rules enforce role-level privilege boundaries at the API and hash signing layers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
              <tr>
                <th className="p-3">Enterprise Persona</th>
                <th className="p-3 text-center">Mint Passport</th>
                <th className="p-3 text-center">Log BMS Telemetry</th>
                <th className="p-3 text-center">Sign Custody Transfer</th>
                <th className="p-3 text-center">Run QpiAI Solver</th>
                <th className="p-3 text-center">Audit Cryptochain</th>
                <th className="p-3 text-center">Public QR Verify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rolesMatrix.map(row => (
                <tr key={row.role} className={`hover:bg-slate-900/40 transition-colors ${row.role === activeRole ? 'bg-emerald-500/5' : ''}`}>
                  <td className="p-3 font-semibold text-slate-200 flex items-center space-x-2">
                    <span>{row.label}</span>
                    {row.role === activeRole && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">{row.mint ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-600 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.telemetry ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-600 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.transfer ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-600 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.qpiai ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-600 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.audit ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-600 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.public ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-slate-600 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
