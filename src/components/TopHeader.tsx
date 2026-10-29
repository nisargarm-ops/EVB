import React, { useState } from 'react';
import { 
  Menu, 
  Globe, 
  Sun, 
  Moon, 
  Laptop, 
  Camera, 
  Database, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { UserRole, DatabaseStatus, UserProfile } from '../types';
import { RoleSelector } from './RoleSelector';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface TopHeaderProps {
  currentTab: string;
  onOpenMobileMenu: () => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole, organization?: string) => void;
  activeOrg: string;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  dbStatus?: DatabaseStatus | null;
  onOpenDbModal: () => void;
  onOpenScannerModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  activeRole,
  onRoleChange,
  activeOrg,
  currentUser,
  onLogout,
  dbStatus,
  onOpenDbModal,
  onOpenScannerModal,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

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

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return t.navDashboard;
      case 'transfers':
        return t.navTransfers;
      case 'qpiai':
        return t.navQpiAI;
      case 'verify':
        return t.navVerify;
      case 'organizations':
        return t.navOrganizations;
      case 'create':
        return t.navMintPassport;
      case 'detail':
        return 'Passport Metrology Detail';
      default:
        return 'BatteryPass 360';
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#121F17]/95 backdrop-blur-xs border-b border-[#E5E7EB] dark:border-[#1E382B] px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors shadow-2xs">
      {/* Left: Mobile Toggle & Page Title / Breadcrumbs */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-[#64748B] hover:text-[#1F2937] dark:text-[#94A3B8] dark:hover:text-white transition-colors"
          aria-label={t.menu}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb & Current Title */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hidden sm:inline">
            BatteryPass
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] dark:text-[#334155] hidden sm:inline" />
          <h1 className="text-sm sm:text-base font-bold text-[#14532D] dark:text-[#34D399] tracking-tight">
            {getPageTitle(currentTab)}
          </h1>
        </div>
      </div>

      {/* Right Controls: Quick Scan, Language, Theme, Supabase Pill, Role Persona */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Quick Scan QR Button */}
        <button
          onClick={onOpenScannerModal}
          title={t.scanQrBtn}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 hover:bg-[#D1FAE5] text-[#14532D] dark:text-[#34D399] border border-[#D1FAE5] dark:border-[#065F46] text-xs font-semibold shadow-2xs transition-colors"
        >
          <Camera className="w-3.5 h-3.5 text-[#059669]" />
          <span className="hidden md:inline">{t.scanQrBtn}</span>
        </button>

        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            title="Language Selection"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-semibold transition-colors shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#059669]" />
            <span className="text-[11px] font-mono uppercase">
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
          title={`Theme: ${theme.toUpperCase()}`}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-semibold transition-colors shadow-2xs"
        >
          {getThemeIcon()}
          <span className="hidden xl:inline text-[11px] font-sans">
            {theme === 'light' ? t.themeLight : theme === 'dark' ? t.themeDark : t.themeSystem}
          </span>
        </button>

        {/* Supabase Diagnostic Pill */}
        <button
          onClick={onOpenDbModal}
          title="Inspect Database Connectivity"
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-mono transition-colors shadow-2xs"
        >
          <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-[#059669]' : 'bg-[#D97706]'}`} />
          <Database className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
          <span className="text-[11px] text-[#475569] dark:text-[#CBD5E1] hidden md:inline font-sans">
            {isDbConnected ? t.supabaseRls : t.localDb}
          </span>
        </button>

        {/* Verified Enterprise Identity Badge & Multi-Org Selector */}
        <RoleSelector 
          activeRole={activeRole} 
          onRoleChange={onRoleChange} 
          activeOrg={activeOrg}
          currentUser={currentUser}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
};
