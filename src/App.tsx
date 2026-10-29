import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { Dashboard } from './pages/Dashboard';
import { AnalyticsView } from './pages/AnalyticsView';
import { PassportDetail } from './pages/PassportDetail';
import { CreatePassport } from './pages/CreatePassport';
import { VerifyPublic } from './pages/VerifyPublic';
import { QpiAIConsole } from './pages/QpiAIConsole';
import { CustodyTransfers } from './pages/CustodyTransfers';
import { Organizations } from './pages/Organizations';
import { QRCodeModal } from './components/QRCodeModal';
import { QRScannerModal } from './components/QRScannerModal';
import { AuthModal } from './components/AuthModal';
import { AuthLanding } from './components/AuthLanding';
import { DatabaseStatusModal } from './components/DatabaseStatusModal';
import { UserRole, UserProfile, DatabaseStatus } from './types';
import { api } from './services/api';
import { initSupabaseClient } from './services/supabaseClient';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ShieldCheck, ArrowLeft, Zap, RotateCcw, Camera } from 'lucide-react';

const MainApp: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>('');
  const [qrModalBatteryId, setQrModalBatteryId] = useState<string | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState<boolean>(false);

  // Sidebar Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bp_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const toggleSidebarCollapse = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    try {
      localStorage.setItem('bp_sidebar_collapsed', String(nextState));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Enterprise Auth & RBAC State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('MANUFACTURER');
  const [activeOrg, setActiveOrg] = useState<string>('QuantumVolt Gigafactory');
  const [initializing, setInitializing] = useState<boolean>(true);
  const [guestVerifyMode, setGuestVerifyMode] = useState<boolean>(false);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [dbModalOpen, setDbModalOpen] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  useEffect(() => {
    const initApp = async () => {
      // 1. Hydrate client-side Supabase authentication configuration from backend
      try {
        await initSupabaseClient();
      } catch (err) {
        console.warn('Supabase client hydration deferred:', err);
      }

      // 2. Check for active authenticated session token safely
      const hasActiveSession = typeof (api as any).isAuthenticated === 'function' 
        ? (api as any).isAuthenticated() 
        : false;

      if (hasActiveSession) {
        try {
          const user = await api.getMe();
          if (user && user.role !== 'PUBLIC') {
            setCurrentUser(user);
            setActiveRole(user.role);
            setActiveOrg(user.organization_name);
          }
        } catch (err) {
          console.error('Session restore notice:', err);
        }
      }

      // 3. Probe database connectivity status
      try {
        const status = await api.getDatabaseStatus();
        setDbStatus(status);
      } catch (err) {
        console.error('Failed to load database status', err);
      } finally {
        setInitializing(false);
      }
    };

    initApp();
  }, []);

  const handleRoleChange = async (newRole: UserRole, targetOrg?: string) => {
    try {
      const data = await api.switchRole(newRole, targetOrg);
      setActiveRole(data.role);
      setActiveOrg(data.organization);
      const user = await api.getMe();
      setCurrentUser(user);
      setSelectedBatteryId('');
    } catch (err) {
      console.error('Organization switch failed:', err);
    }
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setActiveOrg(user.organization_name);
    setSelectedBatteryId('');
    setGuestVerifyMode(false);
  };

  const handleLogout = async () => {
    try {
      await api.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setCurrentUser(null);
    setActiveRole('PUBLIC');
    setSelectedBatteryId('');
    setGuestVerifyMode(false);
    setCurrentTab('dashboard');
  };

  const handleSelectPassport = (id: string) => {
    setSelectedBatteryId(id);
    setCurrentTab('detail');
  };

  const handleShowQr = (id: string) => {
    setQrModalBatteryId(id);
  };

  const handleScanSuccess = (scannedBatteryId: string) => {
    setSelectedBatteryId(scannedBatteryId);
    setCurrentTab('verify');
  };

  // Initializing Splash Screen
  if (initializing) {
    return (
      <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B130E] flex flex-col items-center justify-center space-y-4 select-none transition-colors">
        <div className="p-3.5 rounded-2xl bg-[#14532D] text-white shadow-lg shadow-[#14532D]/20 animate-pulse">
          <Zap className="w-8 h-8 stroke-[2.4]" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-base font-bold text-[#1F2937] dark:text-[#F1F5F9] tracking-tight">{t.brandTitle}</div>
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono flex items-center justify-center space-x-1.5">
            <RotateCcw className="w-3.5 h-3.5 animate-spin text-[#059669]" />
            <span>Initializing Metrology Core...</span>
          </div>
        </div>
      </div>
    );
  }

  // 1. First-time & Unauthenticated Visitors: Clean Eco-Tech Auth Landing
  if (!currentUser && !guestVerifyMode) {
    return (
      <AuthLanding
        onAuthSuccess={handleAuthSuccess}
        onGuestVerify={() => setGuestVerifyMode(true)}
      />
    );
  }

  // 2. Guest QR Verification Mode (Physical Pack Verification without Login)
  if (!currentUser && guestVerifyMode) {
    return (
      <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B130E] text-[#1F2937] dark:text-[#F1F5F9] flex flex-col font-sans transition-colors">
        <header className="sticky top-0 z-50 bg-white dark:bg-[#121F17] border-b border-[#E5E7EB] dark:border-[#1E382B] px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#14532D] dark:text-[#34D399]">{t.brandTitle}</span>
              <span className="text-[11px] text-[#059669] dark:text-[#34D399] font-medium ml-2 px-2 py-0.5 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/40">
                {t.verifyGatewayTitle.split(' ')[0]} {t.verifyGatewayTitle.split(' ')[1]}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setScannerModalOpen(true)}
              className="flex items-center space-x-1.5 text-xs text-[#059669] font-semibold px-3 py-1.5 rounded-xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 border border-[#D1FAE5] dark:border-[#065F46] hover:bg-[#D1FAE5] transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t.scanQrBtn}</span>
            </button>
            <button
              onClick={() => setGuestVerifyMode(false)}
              className="flex items-center space-x-1.5 text-xs text-[#14532D] dark:text-[#34D399] hover:text-[#166534] font-semibold px-3 py-1.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.authBackToSignIn}</span>
            </button>
          </div>
        </header>

        <main className="flex-1">
          <VerifyPublic
            initialId={selectedBatteryId}
            activeRole={activeRole}
            onNavigateDetail={(id) => {
              setSelectedBatteryId(id);
              setCurrentTab('detail');
            }}
            onOpenScannerModal={() => setScannerModalOpen(true)}
          />
        </main>

        <QRScannerModal
          isOpen={scannerModalOpen}
          onClose={() => setScannerModalOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      </div>
    );
  }

  // 3. Authenticated Platform Experience: Vertical Fixed Left Sidebar Layout
  return (
    <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B130E] text-[#1F2937] dark:text-[#F1F5F9] flex font-sans transition-colors">
      {/* Vertical Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRole={activeRole}
        currentUser={currentUser}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenScannerModal={() => setScannerModalOpen(true)}
        onOpenDbModal={() => setDbModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area (Flexible Width) */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Compact Top Utility Header */}
        <TopHeader
          currentTab={currentTab}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          activeRole={activeRole}
          onRoleChange={handleRoleChange}
          activeOrg={activeOrg}
          currentUser={currentUser}
          onLogout={handleLogout}
          dbStatus={dbStatus}
          onOpenDbModal={() => setDbModalOpen(true)}
          onOpenScannerModal={() => setScannerModalOpen(true)}
        />

        {/* Dynamic Route View */}
        <main className="flex-1">
          {currentTab === 'dashboard' && (
            <Dashboard
              onSelectPassport={handleSelectPassport}
              onShowQr={handleShowQr}
              onNavigateCreate={() => setCurrentTab('create')}
              onNavigateQpiAI={() => setCurrentTab('qpiai')}
              onNavigateAnalytics={() => setCurrentTab('analytics')}
              activeRole={activeRole}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView
              activeRole={activeRole}
              activeOrg={activeOrg}
              onNavigateDetail={handleSelectPassport}
            />
          )}

          {currentTab === 'detail' && (
            <PassportDetail
              batteryId={selectedBatteryId}
              onBack={() => setCurrentTab('dashboard')}
              onShowQr={handleShowQr}
              activeRole={activeRole}
            />
          )}

          {currentTab === 'create' && (
            <CreatePassport
              onBack={() => setCurrentTab('dashboard')}
              onSuccess={(newId) => {
                setSelectedBatteryId(newId);
                setCurrentTab('detail');
              }}
            />
          )}

          {currentTab === 'transfers' && (
            <CustodyTransfers
              activeRole={activeRole}
              activeOrg={activeOrg}
              onNavigateDetail={(id) => {
                setSelectedBatteryId(id);
                setCurrentTab('detail');
              }}
            />
          )}

          {currentTab === 'organizations' && (
            <Organizations />
          )}

          {currentTab === 'verify' && (
            <VerifyPublic
              initialId={selectedBatteryId}
              activeRole={activeRole}
              onNavigateDetail={(id) => {
                setSelectedBatteryId(id);
                setCurrentTab('detail');
              }}
              onOpenScannerModal={() => setScannerModalOpen(true)}
            />
          )}

          {currentTab === 'qpiai' && (
            <QpiAIConsole activeRole={activeRole} />
          )}
        </main>

        {/* Professional EU Compliance Footer */}
        <footer className="border-t border-[#E5E7EB] dark:border-[#1E382B] py-5 px-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-[#121F17] transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span>BatteryPass 360 © 2026. Compliant with EU Battery Regulation (EU 2023/1542).</span>
              <button
                onClick={() => setDbModalOpen(true)}
                className="text-[11px] text-[#059669] dark:text-[#34D399] hover:underline font-medium"
              >
                {t.dbArchitecture}
              </button>
            </div>
            <span className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              SHA-256 Hash Chain • Immutable Metrology • QpiAI-Opt • QpiAI Quantum
            </span>
          </div>
        </footer>
      </div>

      {/* QR Code Generation Modal */}
      {qrModalBatteryId && (
        <QRCodeModal
          batteryId={qrModalBatteryId}
          onClose={() => setQrModalBatteryId(null)}
          onNavigateVerify={(id) => {
            setSelectedBatteryId(id);
            setCurrentTab('verify');
          }}
        />
      )}

      {/* QR Code Scanner Modal (Camera & File Upload) */}
      <QRScannerModal
        isOpen={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Enterprise Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        activeRole={activeRole}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Database Diagnostics Modal */}
      <DatabaseStatusModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
        onStatusChange={(newStatus) => setDbStatus(newStatus)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
