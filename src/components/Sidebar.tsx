import React from 'react';
import { 
  BatteryCharging, 
  LayoutDashboard, 
  Truck, 
  Users, 
  QrCode, 
  Camera, 
  Cpu, 
  Settings, 
  PlusCircle, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  X,
  ShieldCheck
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeRole: UserRole;
  currentUser?: UserProfile | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenScannerModal: () => void;
  onOpenDbModal: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  activeRole,
  currentUser,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onOpenScannerModal,
  onOpenDbModal,
  onLogout,
}) => {
  const { t } = useLanguage();

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    onCloseMobile();
  };

  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard, roles: ['MANUFACTURER', 'OEM', 'FLEET_OPERATOR', 'SERVICE_CENTER', 'REMANUFACTURER', 'RECYCLER', 'REGULATOR_AUDITOR', 'ADMINISTRATOR'] },
    { id: 'transfers', label: t.navTransfers, icon: Truck, roles: ['MANUFACTURER', 'OEM', 'FLEET_OPERATOR', 'SERVICE_CENTER', 'REMANUFACTURER', 'RECYCLER', 'REGULATOR_AUDITOR', 'ADMINISTRATOR'] },
    { id: 'qpiai', label: t.navQpiAI, icon: Cpu, roles: ['MANUFACTURER', 'OEM', 'FLEET_OPERATOR', 'SERVICE_CENTER', 'REMANUFACTURER', 'ADMINISTRATOR'] },
    { id: 'verify', label: t.navVerify, icon: QrCode, roles: ['MANUFACTURER', 'OEM', 'FLEET_OPERATOR', 'SERVICE_CENTER', 'REMANUFACTURER', 'RECYCLER', 'REGULATOR_AUDITOR', 'ADMINISTRATOR'] },
    { id: 'organizations', label: t.navOrganizations, icon: Users, roles: ['MANUFACTURER', 'OEM', 'FLEET_OPERATOR', 'SERVICE_CENTER', 'REMANUFACTURER', 'RECYCLER', 'REGULATOR_AUDITOR', 'ADMINISTRATOR'] },
  ].filter((item) => item.roles.includes(activeRole));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#121F17] border-r border-[#E5E7EB] dark:border-[#1E382B] transition-colors">
      {/* 1. Header & Brand Identity */}
      <div className={`p-4 border-b border-[#E5E7EB] dark:border-[#1E382B] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div 
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center space-x-3 cursor-pointer select-none group"
          title={isCollapsed ? t.brandTitle : undefined}
        >
          <div className="p-2 rounded-xl bg-[#14532D] text-white shadow-sm shadow-[#14532D]/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <BatteryCharging className="w-5 h-5 stroke-[2.2]" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base tracking-tight text-[#14532D] dark:text-[#34D399] truncate">
                  {t.brandTitle}
                </span>
              </div>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399] border border-[#D1FAE5] dark:border-[#065F46]">
                  {t.euRegulation}
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate hidden xl:inline">
                  Passport
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-xl text-[#64748B] hover:text-[#1F2937] hover:bg-[#F8FAF7] dark:hover:bg-[#16261D]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-[#64748B] hover:text-[#1F2937] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F8FAF7] dark:hover:bg-[#16261D] transition-colors"
            title={t.collapseSidebar}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* When Collapsed: Re-open icon at top */}
      {isCollapsed && (
        <div className="hidden lg:flex justify-center py-2 border-b border-[#E5E7EB] dark:border-[#1E382B]">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1F2937] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F8FAF7] dark:hover:bg-[#16261D] transition-colors"
            title={t.expandSidebar}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Primary Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {/* Manufacturer & Administrator Mint CTA */}
        {(activeRole === 'MANUFACTURER' || activeRole === 'ADMINISTRATOR') && (
          <div className="mb-3">
            <button
              onClick={() => handleNavClick('create')}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'space-x-2.5 px-3 py-2.5'} rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs shadow-sm transition-all`}
              title={isCollapsed ? t.navMintPassport : undefined}
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{t.navMintPassport}</span>}
            </button>
          </div>
        )}

        {/* Main Nav Items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2.5'} rounded-xl text-xs font-medium transition-all ${
                active
                  ? 'bg-[#14532D] text-white shadow-sm font-semibold'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white hover:bg-[#F8FAF7] dark:hover:bg-[#16261D]'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-[#64748B] dark:text-[#94A3B8]'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* QR Scan Action Item */}
        <button
          onClick={() => {
            onCloseMobile();
            onOpenScannerModal();
          }}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2.5'} rounded-xl text-xs font-medium text-[#059669] dark:text-[#34D399] hover:bg-[#ECFDF3] dark:hover:bg-[#064E3B]/30 transition-all`}
          title={isCollapsed ? t.scanQrBtn : undefined}
        >
          <Camera className="w-4 h-4 flex-shrink-0 text-[#059669] dark:text-[#34D399]" />
          {!isCollapsed && <span className="truncate font-semibold">{t.scanQrBtn}</span>}
        </button>

        {/* Divider */}
        <div className="pt-2 pb-1">
          <div className="border-t border-[#E5E7EB] dark:border-[#1E382B]" />
        </div>

        {/* Settings & Architecture Item */}
        <button
          onClick={() => {
            onCloseMobile();
            onOpenDbModal();
          }}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2.5'} rounded-xl text-xs font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white hover:bg-[#F8FAF7] dark:hover:bg-[#16261D] transition-all`}
          title={isCollapsed ? t.navSettings : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0 text-[#64748B] dark:text-[#94A3B8]" />
          {!isCollapsed && <span className="truncate">{t.navSettings}</span>}
        </button>
      </div>

      {/* 3. User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-[#E5E7EB] dark:border-[#1E382B] bg-[#F8FAF7] dark:bg-[#16261D] transition-colors">
        {currentUser ? (
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between space-x-2'}`}>
            <div className="flex items-center space-x-2.5 min-w-0">
              <div 
                className="w-8 h-8 rounded-xl bg-[#14532D] text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs"
                title={isCollapsed ? `${currentUser.full_name} (${activeRole})` : undefined}
              >
                {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] truncate">
                    {currentUser.full_name}
                  </div>
                  <div className="text-[10px] font-semibold text-[#059669] dark:text-[#34D399] truncate">
                    {activeRole}
                  </div>
                </div>
              )}
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D]/40 transition-colors flex-shrink-0"
                title={t.navSignOut}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] font-mono">Public Session</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Fixed on the left edge */}
      <aside 
        className={`hidden lg:block h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Panel */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:hidden transform transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
