import React, { useState } from 'react';
import { 
  BatteryCharging, 
  LayoutDashboard, 
  Truck, 
  Users, 
  QrCode, 
  PlusCircle, 
  Menu, 
  X,
  Database,
  User,
  Cpu,
  LogOut,
  Globe,
  Sun,
  Moon,
  Laptop,
  Camera
} from 'lucide-react';
import { RoleSelector } from './RoleSelector';
import { UserRole, UserProfile, DatabaseStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { Language } from '../i18n/translations';

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
  onOpenScannerModal?: () => void;
  onLogout?: () => void;
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
  onOpenScannerModal,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const primaryNavItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'transfers', label: t.navTransfers, icon: Truck },
    { id: 'qpiai', label: t.navQpiAI, icon: Cpu },
    { id: 'verify', label: t.navVerify, icon: QrCode },
    { id: 'organizations', label: t.navOrganizations, icon: Users },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  const isDbConnected = dbStatus?.isConfigured ?? false;

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Laptop className="w-3.5 h-3.5" />;
    if (theme === 'dark') return <Moon className="w-3.5 h-3.5" />;
    return <Sun className="w-3.5 h-3.5" />;
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#121F17] border-b border-[#E5E7EB] dark:border-[#1E382B] shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Brand Identity */}
        <div 
          className="flex items-center space-x-3 cursor-pointer select-none group"
          onClick={() => handleNavClick('dashboard')}
        >
          <div className="p-2 rounded-xl bg-[#14532D] text-white shadow-sm shadow-[#14532D]/20 group-hover:scale-105 transition-transform">
            <BatteryCharging className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg sm:text-xl tracking-tight text-[#14532D] dark:text-[#34D399] group-hover:text-[#166534] transition-colors">
                {t.brandTitle}
              </span>
              <span className="text-[10px] font-mono text-[#059669] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/40 border border-[#D1FAE5] dark:border-[#065F46]">
                {t.euRegulation}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] hidden sm:block">{t.brandTagline}</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1 bg-[#F8FAF7] dark:bg-[#16261D] p-1 rounded-xl border border-[#E5E7EB] dark:border-[#1E382B] text-xs">
          {primaryNavItems.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  active
                    ? 'bg-[#14532D] text-white shadow-sm font-semibold'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white hover:bg-white dark:hover:bg-[#1E382B]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#64748B] dark:text-[#94A3B8]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Quick Scan QR Button */}
          {onOpenScannerModal && (
            <button
              onClick={onOpenScannerModal}
              title={t.scanQrBtn}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 hover:bg-[#D1FAE5] text-[#14532D] dark:text-[#34D399] border border-[#D1FAE5] dark:border-[#065F46] text-xs font-semibold shadow-xs transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-[#059669]" />
              <span className="hidden md:inline">{t.scanQrBtn}</span>
            </button>
          )}

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              title="Change Language"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-semibold transition-colors shadow-xs"
            >
              <Globe className="w-3.5 h-3.5 text-[#059669]" />
              <span className="text-[11px] uppercase font-mono">
                {language === 'kn' ? 'ಕನ್ನಡ' : language === 'hi' ? 'हिन्दी' : 'EN'}
              </span>
            </button>

            {langMenuOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl shadow-xl py-1 z-50 text-xs"
                onMouseLeave={() => setLangMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setLanguage('en');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F8FAF7] dark:hover:bg-[#1F382B] transition-colors ${
                    language === 'en' ? 'font-bold text-[#14532D] dark:text-[#34D399]' : 'text-[#1F2937] dark:text-[#F1F5F9]'
                  }`}
                >
                  <span>English</span>
                  {language === 'en' && <span className="text-[10px] text-[#059669]">✓</span>}
                </button>
                <button
                  onClick={() => {
                    setLanguage('kn');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F8FAF7] dark:hover:bg-[#1F382B] transition-colors ${
                    language === 'kn' ? 'font-bold text-[#14532D] dark:text-[#34D399]' : 'text-[#1F2937] dark:text-[#F1F5F9]'
                  }`}
                >
                  <span>ಕನ್ನಡ (Kannada)</span>
                  {language === 'kn' && <span className="text-[10px] text-[#059669]">✓</span>}
                </button>
                <button
                  onClick={() => {
                    setLanguage('hi');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#F8FAF7] dark:hover:bg-[#1F382B] transition-colors ${
                    language === 'hi' ? 'font-bold text-[#14532D] dark:text-[#34D399]' : 'text-[#1F2937] dark:text-[#F1F5F9]'
                  }`}
                >
                  <span>हिन्दी (Hindi)</span>
                  {language === 'hi' && <span className="text-[10px] text-[#059669]">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Theme Switcher Toggle */}
          <button
            onClick={cycleTheme}
            title={`Current Theme: ${theme.toUpperCase()} (Click to change)`}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-semibold transition-colors shadow-xs"
          >
            {getThemeIcon()}
            <span className="hidden xl:inline text-[11px] font-sans">
              {theme === 'light' ? t.themeLight : theme === 'dark' ? t.themeDark : t.themeSystem}
            </span>
          </button>

          {/* Database Diagnostics Button */}
          {onOpenDbModal && (
            <button
              onClick={onOpenDbModal}
              title="Inspect Database & API Connectivity"
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-mono transition-colors shadow-xs"
            >
              <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-[#059669]' : 'bg-[#D97706]'}`} />
              <Database className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
              <span className="text-[11px] text-[#475569] dark:text-[#CBD5E1] hidden xl:inline font-sans">
                {isDbConnected ? t.supabaseRls : t.localDb}
              </span>
            </button>
          )}

          {/* Authenticated User Pill & Sign Out */}
          {currentUser ? (
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs shadow-xs">
              <div className="w-6 h-6 rounded-lg bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#14532D] dark:text-[#34D399] border border-[#D1FAE5] dark:border-[#065F46] font-bold flex items-center justify-center text-xs">
                {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] leading-tight max-w-[100px] truncate">
                  {currentUser.full_name}
                </span>
                <span className="text-[9px] font-semibold text-[#059669] leading-tight truncate max-w-[100px]">
                  {activeRole}
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title={t.navSignOut}
                  className="p-1 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D]/40 transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                title={t.authSignIn}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#14532D] text-white hover:bg-[#166534] text-xs font-medium transition-colors shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.navSignIn}</span>
              </button>
            )
          )}

          {activeRole === 'MANUFACTURER' && (
            <button
              onClick={() => handleNavClick('create')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-semibold text-xs shadow-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.navMintPassport}</span>
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
            className="lg:hidden p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E5E7EB] dark:border-[#1E382B] bg-white dark:bg-[#121F17] px-4 py-4 space-y-3 shadow-lg">
          <div className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider px-1">Navigation</div>
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
                      ? 'bg-[#14532D] text-white'
                      : 'bg-[#F8FAF7] dark:bg-[#16261D] text-[#1F2937] dark:text-[#F1F5F9] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-[#14532D] dark:text-[#34D399]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] dark:border-[#1E382B] text-xs">
            {onOpenDbModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDbModal();
                }}
                className="flex items-center space-x-1.5 text-[#64748B] dark:text-[#94A3B8] hover:text-[#14532D]"
              >
                <Database className="w-3.5 h-3.5 text-[#059669]" />
                <span>{t.dbArchitecture}</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-[#1F2937] dark:text-[#F1F5F9] font-semibold">{currentUser.full_name}</span>
                {onLogout && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#FEE2E2] dark:bg-[#7F1D1D]/40 text-[#DC2626] font-semibold text-[11px]"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>{t.navSignOut}</span>
                  </button>
                )}
              </div>
            ) : (
              onOpenAuthModal && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#14532D] text-white font-medium"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t.navSignIn}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
};
