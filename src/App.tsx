import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { PassportDetail } from './pages/PassportDetail';
import { CreatePassport } from './pages/CreatePassport';
import { VerifyPublic } from './pages/VerifyPublic';
import { QpiAIConsole } from './pages/QpiAIConsole';
import { QRCodeModal } from './components/QRCodeModal';
import { UserRole } from './types';
import { api, getAuthToken } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (window.location.pathname.startsWith('/verify/')) {
      return 'verify';
    }
    return 'dashboard';
  });

  const [selectedBatteryId, setSelectedBatteryId] = useState<string>(() => {
    if (window.location.pathname.startsWith('/verify/')) {
      const id = decodeURIComponent(window.location.pathname.replace('/verify/', ''));
      if (id) return id;
    }
    return 'BAT-NMC-8A2F91C0';
  });

  const [qrModalBatteryId, setQrModalBatteryId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('MANUFACTURER');
  const [activeOrg, setActiveOrg] = useState<string>('QuantumVolt Gigafactory');

  useEffect(() => {
    // Initialize default RBAC session token if absent or expired
    const initSession = async () => {
      if (getAuthToken()) {
        try {
          const me = await api.getMe();
          if (me?.role) {
            setActiveRole(me.role as UserRole);
            setActiveOrg(me.org || 'QuantumVolt Gigafactory');
            return;
          }
        } catch {
          // Token expired or invalid; re-issue default persona token below
        }
      }
      try {
        const data = await api.switchRole('MANUFACTURER');
        setActiveOrg(data.organization);
      } catch (err) {
        console.error(err);
      }
    };
    initSession();
  }, []);

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

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        activeOrg={activeOrg}
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
            onSuccess={newId => {
              setSelectedBatteryId(newId);
              setCurrentTab('detail');
            }}
          />
        )}

        {currentTab === 'verify' && (
          <VerifyPublic
            initialId={selectedBatteryId}
            onNavigateDetail={id => {
              setSelectedBatteryId(id);
              setCurrentTab('detail');
            }}
          />
        )}

        {currentTab === 'qpiai' && <QpiAIConsole activeRole={activeRole} />}
      </main>

      {/* QR Code Modal */}
      {qrModalBatteryId && (
        <QRCodeModal
          batteryId={qrModalBatteryId}
          onClose={() => setQrModalBatteryId(null)}
          onNavigateVerify={id => {
            setSelectedBatteryId(id);
            setCurrentTab('verify');
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            BatteryPass 360 © 2026. Compliant with EU Battery Regulation (EU 2023/1542).
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            SHA-256 Hash Chain • Supabase RLS • QpiAI-Opt • QpiAI Quantum SDK
          </span>
        </div>
      </footer>
    </div>
  );
};
