import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { PassportDetail } from './pages/PassportDetail';
import { CreatePassport } from './pages/CreatePassport';
import { VerifyPublic } from './pages/VerifyPublic';
import { QpiAIConsole } from './pages/QpiAIConsole';
import { CustodyTransfers } from './pages/CustodyTransfers';
import { Organizations } from './pages/Organizations';
import { QRCodeModal } from './components/QRCodeModal';
import { AuthModal } from './components/AuthModal';
import { DatabaseStatusModal } from './components/DatabaseStatusModal';
import { UserRole, UserProfile, DatabaseStatus } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>('BAT-NMC-8A2F91C0');
  const [qrModalBatteryId, setQrModalBatteryId] = useState<string | null>(null);

  // Enterprise Auth & RBAC State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('MANUFACTURER');
  const [activeOrg, setActiveOrg] = useState<string>('QuantumVolt Gigafactory');

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [dbModalOpen, setDbModalOpen] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  useEffect(() => {
    // Check initial user profile & db connectivity
    const initApp = async () => {
      try {
        const user = await api.getMe();
        setCurrentUser(user);
        setActiveRole(user.role);
        setActiveOrg(user.organization_name);
      } catch (err) {
        console.error('Failed to load active user profile', err);
      }

      try {
        const status = await api.getDatabaseStatus();
        setDbStatus(status);
      } catch (err) {
        console.error('Failed to load database status', err);
      }
    };
    initApp();
  }, []);

  const handleRoleChange = async (newRole: UserRole) => {
    setActiveRole(newRole);
    try {
      const data = await api.switchRole(newRole);
      setActiveOrg(data.organization);
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setActiveOrg(user.organization_name);
  };

  const handleSelectPassport = (id: string) => {
    setSelectedBatteryId(id);
    setCurrentTab('detail');
  };

  const handleShowQr = (id: string) => {
    setQrModalBatteryId(id);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        activeOrg={activeOrg}
        currentUser={currentUser}
        dbStatus={dbStatus}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenDbModal={() => setDbModalOpen(true)}
      />

      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <Dashboard
            onSelectPassport={handleSelectPassport}
            onShowQr={handleShowQr}
            onNavigateCreate={() => setCurrentTab('create')}
            onNavigateQpiAI={() => setCurrentTab('qpiai')}
            activeRole={activeRole}
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
            onNavigateDetail={(id) => {
              setSelectedBatteryId(id);
              setCurrentTab('detail');
            }}
          />
        )}

        {currentTab === 'qpiai' && (
          <QpiAIConsole activeRole={activeRole} />
        )}
      </main>

      {/* QR Code Modal */}
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

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span>BatteryPass 360 © 2026. Compliant with EU Battery Regulation (EU 2023/1542).</span>
            <button
              onClick={() => setDbModalOpen(true)}
              className="text-[11px] text-emerald-400 hover:underline"
            >
              Database Architecture
            </button>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            SHA-256 Hash Chain • Immutable Metrology • QpiAI-Opt • QpiAI Quantum
          </span>
        </div>
      </footer>
    </div>
  );
};
export default App;
