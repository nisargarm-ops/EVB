import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DemoDataBadge } from './components/DemoDataBadge';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { BatteryInventory } from './pages/BatteryInventory';
import { PassportDetail } from './pages/PassportDetail';
import { CreatePassport } from './pages/CreatePassport';
import { QRVerificationPage } from './pages/QRVerificationPage';
import { CustodyTransfersPage } from './pages/CustodyTransfersPage';
import { CircularDecisionsPage } from './pages/CircularDecisionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AccessManagementPage } from './pages/AccessManagementPage';
import { IntegrationsStatusPage } from './pages/IntegrationsStatusPage';
import { QpiAIConsole } from './pages/QpiAIConsole';
import { QRCodeModal } from './components/QRCodeModal';
import { UserRole } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>('BAT-NMC-8A2F91C0');
  const [qrModalBatteryId, setQrModalBatteryId] = useState<string | null>(null);
  const [preselectedBatch, setPreselectedBatch] = useState<string[]>([]);

  const [activeRole, setActiveRole] = useState<UserRole>('MANUFACTURER');
  const [activeOrg, setActiveOrg] = useState<string>('QuantumVolt Gigafactory');

  const handleRoleChange = async (newRole: UserRole) => {
    setActiveRole(newRole);
    try {
      const data = await api.switchRole(newRole);
      setActiveOrg(data.organization);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPassport = (id: string) => {
    setSelectedBatteryId(id);
    setCurrentTab('detail');
  };

  const handleShowQr = (id: string) => {
    setQrModalBatteryId(id);
  };

  const handleNavigateQpiAIWithBatch = (selectedIds?: string[]) => {
    if (selectedIds && selectedIds.length > 0) {
      setPreselectedBatch(selectedIds);
    }
    setCurrentTab('decisions');
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Demonstration Notice */}
      <DemoDataBadge 
        onReset={() => setCurrentTab('dashboard')} 
        onNavigateSettings={() => setCurrentTab('settings')}
      />

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        activeOrg={activeOrg}
      />

      {/* Active Page View */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onSelectBattery={handleSelectPassport}
          />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard
            onSelectPassport={handleSelectPassport}
            onShowQr={handleShowQr}
            onNavigateCreate={() => setCurrentTab('create')}
            onNavigateQpiAI={() => setCurrentTab('decisions')}
            activeRole={activeRole}
          />
        )}

        {currentTab === 'inventory' && (
          <BatteryInventory
            onSelectPassport={handleSelectPassport}
            onShowQr={handleShowQr}
            onNavigateCreate={() => setCurrentTab('create')}
            onNavigateQpiAI={handleNavigateQpiAIWithBatch}
            activeRole={activeRole}
          />
        )}

        {currentTab === 'detail' && (
          <PassportDetail
            batteryId={selectedBatteryId}
            onBack={() => setCurrentTab('inventory')}
            onShowQr={handleShowQr}
            activeRole={activeRole}
          />
        )}

        {currentTab === 'create' && (
          <CreatePassport
            onBack={() => setCurrentTab('inventory')}
            onSuccess={(newId) => {
              setSelectedBatteryId(newId);
              setCurrentTab('detail');
            }}
          />
        )}

        {currentTab === 'verify' && (
          <QRVerificationPage
            initialId={selectedBatteryId}
            onNavigateDetail={(id) => {
              setSelectedBatteryId(id);
              setCurrentTab('detail');
            }}
          />
        )}

        {currentTab === 'transfers' && (
          <CustodyTransfersPage
            onSelectPassport={handleSelectPassport}
            activeRole={activeRole}
            activeOrg={activeOrg}
          />
        )}

        {currentTab === 'decisions' && (
          <CircularDecisionsPage
            onSelectPassport={handleSelectPassport}
            activeRole={activeRole}
            preselectedBatch={preselectedBatch}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsPage />
        )}

        {currentTab === 'access' && (
          <AccessManagementPage
            activeRole={activeRole}
            onRoleChange={handleRoleChange}
            activeOrg={activeOrg}
          />
        )}

        {currentTab === 'settings' && (
          <IntegrationsStatusPage />
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

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-bold text-slate-400">BatteryPass 360</span> — EU Regulation 2023/1542 Circular Metrology Standard.
          </div>
          <div className="font-mono text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-2">
            <span>SHA-256 Hash Chain</span>
            <span>·</span>
            <span>Deterministic DIDs</span>
            <span>·</span>
            <span>QpiAI-Opt QUBO</span>
            <span>·</span>
            <span>QpiAI Quantum SDK</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
