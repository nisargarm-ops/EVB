import React from 'react';
import { ShieldCheck, Zap, Cpu, Activity, Lock } from 'lucide-react';

export const HeroBatteryGraphic: React.FC = () => {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center p-4 select-none">
      {/* Background ambient circular glow rings */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/10 via-emerald-500/10 to-blue-500/5 blur-3xl pointer-events-none animate-pulse-subtle" />
      
      {/* Cybernetic Grid & Radar circles */}
      <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="180" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 8" />
        <circle cx="200" cy="200" r="140" fill="none" stroke="#0E7490" strokeWidth="1" strokeDasharray="2 6" className="animate-spin" style={{ animationDuration: '60s' }} />
        <circle cx="200" cy="200" r="90" fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="6 6" />
        <line x1="20" y1="200" x2="380" y2="200" stroke="#1E293B" strokeWidth="1" />
        <line x1="200" y1="20" x2="200" y2="380" stroke="#1E293B" strokeWidth="1" />
      </svg>

      {/* Main Isometric EV Battery Pack Illustration */}
      <div className="relative z-10 w-80 sm:w-96 p-6 rounded-3xl glass-panel-glow border border-emerald-500/40 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Top Terminal Cap */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-xs font-bold text-emerald-400">DID:BATTERY:SHA256:8A2F91C0</span>
          </div>
          <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Lock className="w-3 h-3" />
            <span>HASH ANCHORED</span>
          </span>
        </div>

        {/* 4 Prismatic Cell Modules with Energy Flows */}
        <div className="my-5 grid grid-cols-4 gap-2.5">
          {[
            { label: 'MOD-A1', soh: '92%', temp: '24°C', color: 'from-emerald-500/40 to-teal-500/20', border: 'border-emerald-500/40' },
            { label: 'MOD-A2', soh: '90%', temp: '25°C', color: 'from-emerald-500/30 to-cyan-500/20', border: 'border-emerald-500/30' },
            { label: 'MOD-B1', soh: '88%', temp: '26°C', color: 'from-cyan-500/40 to-blue-500/20', border: 'border-cyan-500/40' },
            { label: 'MOD-B2', soh: '87%', temp: '27°C', color: 'from-cyan-500/30 to-indigo-500/20', border: 'border-cyan-500/30' },
          ].map((mod, i) => (
            <div
              key={mod.label}
              className={`relative rounded-xl p-2.5 bg-gradient-to-b ${mod.color} border ${mod.border} flex flex-col justify-between h-32 group hover:scale-[1.03] transition-transform shadow-inner`}
            >
              {/* Internal glowing anode pin */}
              <div className="w-full flex justify-between items-center text-[9px] font-mono text-slate-400">
                <span>{mod.label}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06B6D4]" />
              </div>

              {/* Energy fluid indicator */}
              <div className="my-auto space-y-1">
                <div className="w-full bg-slate-900/80 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: mod.soh }}
                  />
                </div>
                <div className="text-[10px] font-mono font-bold text-center text-slate-200">{mod.soh}</div>
              </div>

              <div className="text-[9px] font-mono text-slate-400 text-center border-t border-slate-800/60 pt-1">
                {mod.temp}
              </div>
            </div>
          ))}
        </div>

        {/* Flowing Energy Busbar Lines (SVG) */}
        <div className="relative h-6 w-full my-1 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 320 24">
            <defs>
              <linearGradient id="busbarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
            <path
              d="M 10 12 L 310 12"
              fill="none"
              stroke="#1E293B"
              strokeWidth="3"
            />
            <path
              d="M 10 12 L 310 12"
              fill="none"
              stroke="url(#busbarGrad)"
              strokeWidth="3"
              strokeDasharray="16 12"
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* Metrology Brain / BMS Diagnostic Footer */}
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
            <div>
              <div className="font-bold text-slate-200 text-[11px]">BMS Active Metrology</div>
              <div className="text-[10px] text-slate-400 font-mono">400.0 V · 250 kW Peak</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold font-mono text-emerald-400">Class A · EU 2023</div>
            <div className="text-[10px] text-slate-400 font-mono">62.5 kg CO₂/kWh</div>
          </div>
        </div>
      </div>

      {/* Floating HUD tags */}
      <div className="absolute -top-1 -right-2 glass-panel p-2.5 rounded-xl border border-cyan-500/30 text-[10px] font-mono shadow-xl hidden sm:flex items-center space-x-2">
        <Activity className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
        <span className="text-slate-300">Telemetry Stream: Active</span>
      </div>

      <div className="absolute -bottom-2 -left-2 glass-panel p-2.5 rounded-xl border border-emerald-500/30 text-[10px] font-mono shadow-xl hidden sm:flex items-center space-x-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-slate-300">EU Cirpass Passports: Validated</span>
      </div>
    </div>
  );
};
