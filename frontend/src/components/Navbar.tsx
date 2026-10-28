import React from 'react';
import { BatteryCharging, ShieldCheck, Cpu, PlusCircle, QrCode } from 'lucide-react';
import { RoleSelector } from './RoleSelector';
import { UserRole } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeOrg: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeRole,
  onRoleChange,
  activeOrg,
}) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 px-6 py-3.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => setCurrentTab('dashboard')}
        >
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
            <BatteryCharging className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                BatteryPass 360
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                EU 2023/1542
              </span>
            </div>
            <p className="text-xs text-slate-400">Cross-Enterprise EV Battery Passport & Metrology</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'dashboard'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>Fleet Passports</span>
          </button>

          <button
            onClick={() => setCurrentTab('create')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'create'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Mint Passport</span>
          </button>

          <button
            onClick={() => setCurrentTab('qpiai')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'qpiai'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>QpiAI Studio</span>
          </button>

          <button
            onClick={() => setCurrentTab('verify')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'verify'
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Public Verify</span>
          </button>
        </nav>

        {/* Role Selector */}
        <RoleSelector 
          activeRole={activeRole} 
          onRoleChange={onRoleChange} 
          activeOrg={activeOrg} 
        />
      </div>
    </header>
  );
};
