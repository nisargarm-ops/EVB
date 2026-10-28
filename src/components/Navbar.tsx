import React, { useState } from 'react';
import { 
  BatteryCharging, 
  LayoutDashboard, 
  Truck, 
  Recycle, 
  Users, 
  QrCode, 
  PlusCircle, 
  Menu, 
  X,
  ChevronDown,
  Database,
  UserCheck,
  User,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { RoleSelector } from './RoleSelector';
import { UserRole, UserProfile, DatabaseStatus } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeOrg: string;
  currentUser?: UserProfile | null;
  dbStatus?: DatabaseStatus | null;
  onOpenAuthModal?: () => void;
  onOpenDbModal?: () => void;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard & Fleet', icon: LayoutDashboard },
    { id: 'transfers', label: 'Custody Transfers', icon: Truck },
    { id: 'qpiai', label: 'QpiAI Quantum & Opt', icon: Cpu },
    { id: 'verify', label: 'QR Verification', icon: QrCode },
    { id: 'organizations', label: 'Organizations & RBAC', icon: Users },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
  };

  const isDbConnected = dbStatus?.isConfigured ?? false;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Brand Identity */}
        <div 
          className="flex items-center space-x-3 cursor-pointer select-none group"
          onClick={() => handleNavClick('dashboard')}
        >
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <BatteryCharging className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                BatteryPass 360
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold tracking-wider">
                EU 2023/1542
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block font-mono">Cross-Enterprise Circular Metrology</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
          {primaryNavItems.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  active
                    ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Database Diagnostics Pill-free Button */}
          {onOpenDbModal && (
            <button
              onClick={onOpenDbModal}
              title="Inspect Database & API Connectivity"
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-cyan-400'}`} />
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-300 hidden xl:inline">
                {isDbConnected ? 'Supabase RLS' : 'FastAPI Repo'}
              </span>
            </button>
          )}

          {/* User Profile / Auth Button */}
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              title={currentUser ? `Signed in as ${currentUser.full_name}` : 'Enterprise Authentication'}
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
            >
              {currentUser ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-slate-200 max-w-[90px] truncate">{currentUser.full_name.split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-300">Sign In</span>
                </>
              )}
            </button>
          )}

          {activeRole === 'MANUFACTURER' && (
            <button
              onClick={() => handleNavClick('create')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mint Passport</span>
              <span className="sm:hidden">Mint</span>
            </button>
          )}

          <RoleSelector 
            activeRole={activeRole} 
            onRoleChange={onRoleChange} 
            activeOrg={activeOrg} 
          />

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-1">Navigation</div>
          <div className="grid grid-cols-1 gap-2">
            {primaryNavItems.map(item => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-xl text-left text-xs font-semibold ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            {onOpenDbModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDbModal();
                }}
                className="flex items-center space-x-1.5 text-slate-400 hover:text-white"
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>DB Diagnostics</span>
              </button>
            )}

            {onOpenAuthModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuthModal();
                }}
                className="flex items-center space-x-1.5 text-slate-400 hover:text-white"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentUser ? currentUser.full_name : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
