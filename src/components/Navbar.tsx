import React from 'react';
import { 
  BatteryCharging, 
  Cpu, 
  PlusCircle, 
  QrCode, 
  ArrowLeftRight, 
  Building2, 
  Database, 
  User, 
  ShieldCheck 
} from 'lucide-react';
import { RoleSelector } from './RoleSelector';
import { UserRole, UserProfile, DatabaseStatus } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeOrg: string;
  currentUser: UserProfile | null;
  dbStatus: DatabaseStatus | null;
  onOpenAuthModal: () => void;
  onOpenDbModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeRole,
  onRoleChange,
  activeOrg,
  currentUser,
  dbStatus,
  onOpenAuthModal,
  onOpenDbModal,
}) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 px-4 sm:px-6 py-3.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer shrink-0"
          onClick={() => setCurrentTab('dashboard')}
        >
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
            <BatteryCharging className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                BatteryPass 360
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                EU 2023/1542
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Cross-Enterprise EV Battery Passport & Metrology</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'dashboard'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>Fleet Passports</span>
          </button>

          <button
            onClick={() => setCurrentTab('create')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'create'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Mint Passport</span>
          </button>

          <button
            onClick={() => setCurrentTab('transfers')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'transfers'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfers</span>
          </button>

          <button
            onClick={() => setCurrentTab('organizations')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'organizations'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Enterprises</span>
          </button>

          <button
            onClick={() => setCurrentTab('qpiai')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'qpiai'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>QpiAI Studio</span>
          </button>

          <button
            onClick={() => setCurrentTab('verify')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'verify'
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Public Verify</span>
          </button>
        </nav>

        {/* Right Section: Database Status, Auth Trigger, Role Selector */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Database Diagnostics Pill */}
          <button
            onClick={onOpenDbModal}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              dbStatus?.isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
            title="Inspect Database Status & RLS Migrations"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                dbStatus?.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                dbStatus?.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <Database className="w-3.5 h-3.5 hidden sm:inline" />
            <span className="text-[11px] font-semibold hidden md:inline">
              {dbStatus?.isConnected ? 'Supabase PostgreSQL' : 'PostgreSQL Schema'}
            </span>
          </button>

          {/* User Auth Profile Trigger */}
          <button
            onClick={onOpenAuthModal}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-all"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold">
              {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline max-w-[90px] truncate">
              {currentUser?.full_name || 'Auth'}
            </span>
          </button>

          {/* Role Selector */}
          <RoleSelector 
            activeRole={activeRole} 
            onRoleChange={onRoleChange} 
            activeOrg={activeOrg} 
          />
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex lg:hidden items-center justify-around pt-2.5 mt-2.5 border-t border-slate-800/80 text-[11px] overflow-x-auto">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`px-2 py-1 ${currentTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          Fleet
        </button>
        <button
          onClick={() => setCurrentTab('create')}
          className={`px-2 py-1 ${currentTab === 'create' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          Mint
        </button>
        <button
          onClick={() => setCurrentTab('transfers')}
          className={`px-2 py-1 ${currentTab === 'transfers' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          Transfers
        </button>
        <button
          onClick={() => setCurrentTab('organizations')}
          className={`px-2 py-1 ${currentTab === 'organizations' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          Enterprises
        </button>
        <button
          onClick={() => setCurrentTab('qpiai')}
          className={`px-2 py-1 ${currentTab === 'qpiai' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
        >
          QpiAI
        </button>
        <button
          onClick={() => setCurrentTab('verify')}
          className={`px-2 py-1 ${currentTab === 'verify' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          Verify
        </button>
      </div>
    </header>
  );
};
