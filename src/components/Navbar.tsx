import React, { useState } from 'react';
import { 
  BatteryCharging, 
  LayoutDashboard, 
  Layers, 
  Truck, 
  Recycle, 
  BarChart3, 
  Users, 
  Settings, 
  QrCode, 
  PlusCircle, 
  Menu, 
  X,
  Compass
} from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'landing', label: 'Overview', icon: Compass },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Layers },
    { id: 'transfers', label: 'Custody Transfers', icon: Truck },
    { id: 'decisions', label: 'Circular Decisions', icon: Recycle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'verify', label: 'QR Verify', icon: QrCode },
    { id: 'access', label: 'Organization', icon: Users },
    { id: 'settings', label: 'Integrations', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer select-none"
          onClick={() => handleNavClick('landing')}
        >
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
            <BatteryCharging className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                BatteryPass 360
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                EU 2023/1542
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Cross-Enterprise Circular Battery Passport</p>
          </div>
        </div>

        {/* Desktop Primary Navigation */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          {navItems.slice(0, 6).map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* More menu items */}
          {navItems.slice(6).map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={item.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {activeRole === 'MANUFACTURER' && (
            <button
              onClick={() => handleNavClick('create')}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Mint</span>
            </button>
          )}

          <RoleSelector 
            activeRole={activeRole} 
            onRoleChange={onRoleChange} 
            activeOrg={activeOrg} 
          />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center space-x-2 p-2.5 rounded-xl text-left text-xs font-semibold ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {activeRole === 'MANUFACTURER' && (
            <button
              onClick={() => handleNavClick('create')}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs mt-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Mint New Battery Passport</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
