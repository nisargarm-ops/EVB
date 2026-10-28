import React, { useState } from 'react';
import { ShieldCheck, Zap, Cpu, Activity, Lock, Eye, Thermometer } from 'lucide-react';

export const HeroBatteryGraphic: React.FC = () => {
  const [activeView, setActiveView] = useState<'cells' | 'thermal'>('cells');

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center p-3 select-none">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/15 via-emerald-500/10 to-blue-500/5 blur-3xl pointer-events-none animate-pulse-subtle" />
      
      {/* Precision CAD Radar Rings */}
      <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" viewBox="0 0 440 440">
        <circle cx="220" cy="220" r="200" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 9" />
        <circle cx="220" cy="220" r="160" fill="none" stroke="#0E7490" strokeWidth="1" strokeDasharray="4 8" className="animate-radar" />
        <circle cx="220" cy="220" r="110" fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="6 6" />
        <line x1="20" y1="220" x2="420" y2="220" stroke="#1E293B" strokeWidth="1" />
        <line x1="220" y1="20" x2="220" y2="420" stroke="#1E293B" strokeWidth="1" />
      </svg>

      {/* Main Isometric EV Battery Pack Illustration */}
      <div className="relative z-10 w-full max-w-[390px] p-5 sm:p-6 rounded-3xl glass-panel-glow border border-emerald-500/30 shadow-2xl backdrop-blur-xl">
        {/* Enclosure Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-xs font-bold text-white tracking-wider">
                BAT-NMC-8A2F91C0
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              EU 2023/1542 · SHA-256 ANCHORED
            </div>
          </div>

          {/* Toggle View mode */}
          <div className="flex p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px]">
            <button
              onClick={() => setActiveView('cells')}
              className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
                activeView === 'cells' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Cells</span>
            </button>
            <button
              onClick={() => setActiveView('thermal')}
              className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
                activeView === 'thermal' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
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
              color: 'from-emerald-500/30 to-teal-900/40', 
              border: 'border-emerald-500/40',
              thermalColor: 'bg-emerald-500/20 text-emerald-400'
            },
            { 
              name: 'MOD-02', 
              soh: 89.8, 
              temp: '24.5°C', 
              color: 'from-emerald-500/25 to-cyan-900/40', 
              border: 'border-emerald-500/30',
              thermalColor: 'bg-cyan-500/20 text-cyan-400'
            },
            { 
              name: 'MOD-03', 
              soh: 87.5, 
              temp: '25.2°C', 
              color: 'from-cyan-500/25 to-blue-900/40', 
              border: 'border-cyan-500/30',
              thermalColor: 'bg-cyan-500/20 text-cyan-400'
            },
            { 
              name: 'MOD-04', 
              soh: 85.1, 
              temp: '26.1°C', 
              color: 'from-cyan-500/20 to-indigo-900/40', 
              border: 'border-cyan-500/25',
              thermalColor: 'bg-amber-500/20 text-amber-400'
            },
          ].map((mod) => (
            <div
              key={mod.name}
              className={`relative rounded-xl p-2 bg-gradient-to-b ${mod.color} border ${mod.border} flex flex-col justify-between h-36 transition-all hover:scale-[1.02] shadow-inner`}
            >
              {/* Cathode terminal cap */}
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                <span className="font-bold text-slate-300">{mod.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06B6D4]" />
              </div>

              {activeView === 'cells' ? (
                <div className="my-auto space-y-1.5">
                  <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700"
                      style={{ width: `${mod.soh}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono font-bold text-center text-emerald-400">
                    {mod.soh}%
                  </div>
                </div>
              ) : (
                <div className="my-auto text-center space-y-1">
                  <div className={`p-1 rounded-lg text-[10px] font-mono font-bold ${mod.thermalColor}`}>
                    {mod.temp}
                  </div>
                  <div className="text-[9px] text-slate-400">Normal Band</div>
                </div>
              )}

              <div className="text-[9px] font-mono text-slate-400 text-center border-t border-slate-800/80 pt-1">
                48 Cells · 100V
              </div>
            </div>
          ))}
        </div>

        {/* Animated Flowing Energy Busbar (SVG) */}
        <div className="relative h-7 w-full my-2 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden flex items-center px-2">
          <svg className="w-full h-4" viewBox="0 0 340 16">
            <defs>
              <linearGradient id="busbarGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
            <line x1="5" y1="8" x2="335" y2="8" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
            <line
              x1="5"
              y1="8"
              x2="335"
              y2="8"
              stroke="url(#busbarGrad2)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="12 8"
              className="animate-energy-flow"
            />
          </svg>
        </div>

        {/* Enclosure Diagnostic Footer */}
        <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '12s' }} />
            </div>
            <div>
              <div className="font-bold text-slate-200 text-[11px]">BMS Active Metrology</div>
              <div className="text-[10px] text-slate-400 font-mono">400.0 V · 92.4 kWh · 19.8 mΩ</div>
            </div>
          </div>
          <div className="text-right font-mono text-[11px]">
            <div className="font-bold text-emerald-400">Class A · 62.5 kg CO₂</div>
            <div className="text-[10px] text-slate-400">420 Cycles Logged</div>
          </div>
        </div>
      </div>

      {/* Floating HUD Badges */}
      <div className="absolute -top-1 -right-1 glass-panel p-2 rounded-xl border border-cyan-500/30 text-[10px] font-mono shadow-xl hidden sm:flex items-center space-x-2">
        <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
        <span className="text-slate-300">CAN-Bus BMS: 100 Hz</span>
      </div>

      <div className="absolute -bottom-1 -left-1 glass-panel p-2 rounded-xl border border-emerald-500/30 text-[10px] font-mono shadow-xl hidden sm:flex items-center space-x-2">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span className="text-slate-300">EU Cirpass: Certified</span>
      </div>
    </div>
  );
};
