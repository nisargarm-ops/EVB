import React, { useState } from 'react';
import {
  UserCheck,
  ChevronDown,
  Building,
  ShieldAlert,
  Award,
  Recycle,
  Truck,
  Factory,
} from 'lucide-react';
import { UserRole } from '../types';

interface RoleSelectorProps {
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeOrg: string;
}

const ROLES: {
  role: UserRole;
  label: string;
  org: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    role: 'MANUFACTURER',
    label: 'Cell Manufacturer',
    org: 'QuantumVolt Gigafactory',
    icon: Factory,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    role: 'OEM',
    label: 'Vehicle OEM',
    org: 'Apex Motors AG',
    icon: Award,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  {
    role: 'FLEET_OPERATOR',
    label: 'Fleet Operator',
    org: 'Apex EV Mobility Fleet',
    icon: Truck,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    role: 'RECYCLER',
    label: 'Circularity Recycler',
    org: 'EcoRecycle Metals Recovery',
    icon: Recycle,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  {
    role: 'REGULATOR_AUDITOR',
    label: 'Regulator / Auditor',
    org: 'EU Metrology Authority',
    icon: ShieldAlert,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
  {
    role: 'PUBLIC',
    label: 'Public Consumer',
    org: 'Anonymous Visitor',
    icon: Building,
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  },
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  activeRole,
  onRoleChange,
  activeOrg,
}) => {
  const [open, setOpen] = useState(false);
  const current = ROLES.find(r => r.role === activeRole) || ROLES[0];
  const IconComponent = current.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-3 bg-slate-900 border border-slate-700/70 hover:border-slate-600 px-3 py-1.5 rounded-xl transition-all text-left shadow-sm cursor-pointer"
      >
        <div className={`p-1.5 rounded-lg border ${current.color}`}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
            <span>{current.label}</span>
            <span className="text-[10px] text-slate-500 font-mono">({activeRole})</span>
          </div>
          <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
            {activeOrg || current.org}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 glass-panel border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50">
            <div className="px-3 py-2 border-b border-slate-800 text-xs font-semibold text-slate-400">
              SWITCH ENTERPRISE PERSONA (RBAC)
            </div>
            <div className="space-y-1 mt-1">
              {ROLES.map(r => {
                const ItemIcon = r.icon;
                const isSelected = r.role === activeRole;
                return (
                  <button
                    key={r.role}
                    onClick={() => {
                      onRoleChange(r.role);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg border ${r.color}`}>
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200">{r.label}</div>
                      <div className="text-[11px] text-slate-400 truncate">{r.org}</div>
                    </div>
                    {isSelected && <UserCheck className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
