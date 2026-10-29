import React, { useState } from 'react';
import { ShieldCheck, Cpu, Activity, Eye, Thermometer } from 'lucide-react';

export const HeroBatteryGraphic: React.FC = () => {
  const [activeView, setActiveView] = useState<'cells' | 'thermal'>('cells');

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center p-3 select-none">
      {/* Precision CAD Radar Rings */}
      <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 440 440">
        <circle cx="220" cy="220" r="200" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 9" />
        <circle cx="220" cy="220" r="160" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 8" className="animate-radar" />
        <circle cx="220" cy="220" r="110" fill="none" stroke="#D1FAE5" strokeWidth="1" strokeDasharray="6 6" />
        <line x1="20" y1="220" x2="420" y2="220" stroke="#F1F5F9" strokeWidth="1" />
        <line x1="220" y1="20" x2="220" y2="420" stroke="#F1F5F9" strokeWidth="1" />
      </svg>

      {/* Main Isometric EV Battery Pack Illustration */}
      <div className="relative z-10 w-full max-w-[400px] p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-md">
        {/* Enclosure Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E7EB]">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
              <span className="font-mono text-xs font-bold text-[#14532D] tracking-wider">
                BAT-NMC-8A2F91C0
              </span>
            </div>
            <div className="text-[10px] text-[#64748B] font-mono">
              EU 2023/1542 · SHA-256 ANCHORED
            </div>
          </div>

          {/* Toggle View mode */}
          <div className="flex p-0.5 rounded-lg bg-[#F8FAF7] border border-[#E5E7EB] text-[10px]">
            <button
              onClick={() => setActiveView('cells')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                activeView === 'cells' ? 'bg-[#14532D] text-white font-bold' : 'text-[#64748B] hover:text-[#1F2937]'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Cells</span>
            </button>
            <button
              onClick={() => setActiveView('thermal')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                activeView === 'thermal' ? 'bg-[#14532D] text-white font-bold' : 'text-[#64748B] hover:text-[#1F2937]'
              }`}
            >
              <Thermometer className="w-3 h-3" />
              <span>Thermal</span>
            </button>
          </div>
        </div>

        {/* 4 High-Voltage Prismatic Cell Modules */}
        <div className="my-4 grid grid-cols-4 gap-2">
          {[
            { 
              name: 'MOD-01', 
              soh: 91.2, 
              temp: '23.8°C', 
              thermalColor: 'bg-[#ECFDF3] text-[#059669]'
            },
            { 
              name: 'MOD-02', 
              soh: 89.8, 
              temp: '24.5°C', 
              thermalColor: 'bg-[#F0FDFA] text-[#0D9488]'
            },
            { 
              name: 'MOD-03', 
              soh: 87.5, 
              temp: '25.2°C', 
              thermalColor: 'bg-[#F0FDFA] text-[#0D9488]'
            },
            { 
              name: 'MOD-04', 
              soh: 85.1, 
              temp: '26.1°C', 
              thermalColor: 'bg-[#FEF3C7] text-[#D97706]'
            },
          ].map((mod) => (
            <div
              key={mod.name}
              className="relative rounded-xl p-2 bg-[#F8FAF7] border border-[#E5E7EB] flex flex-col justify-between h-36 transition-all hover:border-[#14532D]"
            >
              {/* Cathode terminal cap */}
              <div className="flex justify-between items-center text-[9px] font-mono text-[#64748B]">
                <span className="font-bold text-[#1F2937]">{mod.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
              </div>

              {activeView === 'cells' ? (
                <div className="my-auto space-y-1.5">
                  <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className="bg-[#059669] h-full rounded-full transition-all duration-700"
                      style={{ width: `${mod.soh}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono font-bold text-center text-[#14532D]">
                    {mod.soh}%
                  </div>
                </div>
              ) : (
                <div className="my-auto text-center space-y-1">
                  <div className={`p-1 rounded-lg text-[10px] font-mono font-bold ${mod.thermalColor}`}>
                    {mod.temp}
                  </div>
                  <div className="text-[9px] text-[#64748B]">Normal</div>
                </div>
              )}

              <div className="text-[9px] font-mono text-[#64748B] text-center border-t border-[#E5E7EB] pt-1">
                48 Cells
              </div>
            </div>
          ))}
        </div>

        {/* Animated Flowing Energy Busbar (SVG) */}
        <div className="relative h-7 w-full my-2 bg-[#F8FAF7] rounded-xl border border-[#E5E7EB] overflow-hidden flex items-center px-2">
          <svg className="w-full h-4" viewBox="0 0 340 16">
            <line x1="5" y1="8" x2="335" y2="8" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
            <line
              x1="5"
              y1="8"
              x2="335"
              y2="8"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="12 8"
              className="animate-energy-flow"
            />
          </svg>
        </div>

        {/* Enclosure Diagnostic Footer */}
        <div className="p-3 rounded-2xl bg-[#F8FAF7] border border-[#E5E7EB] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#ECFDF3] text-[#059669] border border-[#D1FAE5]">
              <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '12s' }} />
            </div>
            <div>
              <div className="font-bold text-[#1F2937] text-[11px]">BMS Active Metrology</div>
              <div className="text-[10px] text-[#64748B] font-mono">400.0 V · 92.4 kWh · 19.8 mΩ</div>
            </div>
          </div>
          <div className="text-right font-mono text-[11px]">
            <div className="font-bold text-[#059669]">Class A · 62.5 kg CO₂</div>
            <div className="text-[10px] text-[#64748B]">420 Cycles Logged</div>
          </div>
        </div>
      </div>

      {/* Floating HUD Badges */}
      <div className="absolute -top-1 -right-1 bg-white p-2.5 rounded-xl border border-[#E5E7EB] text-[10px] font-mono shadow-sm hidden sm:flex items-center space-x-2">
        <Activity className="w-3.5 h-3.5 text-[#059669]" />
        <span className="text-[#1F2937] font-semibold">CAN-Bus: 100 Hz</span>
      </div>

      <div className="absolute -bottom-1 -left-1 bg-white p-2.5 rounded-xl border border-[#E5E7EB] text-[10px] font-mono shadow-sm hidden sm:flex items-center space-x-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
        <span className="text-[#1F2937] font-semibold">EU Cirpass: Certified</span>
      </div>
    </div>
  );
};
