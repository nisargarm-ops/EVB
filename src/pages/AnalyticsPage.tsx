import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingDown, 
  Activity, 
  Leaf, 
  Recycle, 
  Zap, 
  ShieldCheck, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { PassportSummary } from '../types';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [passports, setPassports] = useState<PassportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await api.listPassports();
        setPassports(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalBatteries = passports.length;
  const avgSoH = totalBatteries > 0
    ? (passports.reduce((acc, p) => acc + p.state_of_health_pct, 0) / totalBatteries).toFixed(1)
    : '0';

  // Status Breakdown
  const statusCounts: Record<string, number> = {};
  passports.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  // Chemistry Breakdown
  const chemCounts: Record<string, number> = {};
  passports.forEach(p => {
    chemCounts[p.chemistry] = (chemCounts[p.chemistry] || 0) + 1;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Circular Battery Intelligence Analytics</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Macro-level fleet diagnostics, EU carbon benchmarking, and critical mineral recovery metrology.
          </p>
        </div>

        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>EU 2023/1542 Metrology Telemetry</span>
        </div>
      </div>

      {/* KPI Top Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Fleet Average Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">{avgSoH}%</div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <TrendingDown className="w-3.5 h-3.5 text-amber-400 inline" />
            <span>-1.8% annual degradation baseline</span>
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Avoided Manufacturing CO₂</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">14.2 t</div>
          <p className="text-[11px] text-slate-500 mt-1">Via secondary BESS repurposing</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Circularity Index</span>
            <Recycle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-400 font-mono">84.6%</div>
          <p className="text-[11px] text-slate-500 mt-1">EU 2030 quota compliant</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Registered Energy</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-400 font-mono">
            {passports.reduce((a, b) => a + b.rated_capacity_kwh, 0).toFixed(0)} kWh
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Under active cryptochain tracking</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: SoH Distribution by Battery Pack */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Individual Pack Health Distribution</h3>
            <span className="text-[11px] font-mono text-slate-400">Real-time BMS Data</span>
          </div>

          <div className="space-y-4 pt-2">
            {passports.map(p => (
              <div key={p.battery_id} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">{p.battery_id} ({p.chemistry})</span>
                  <span className="text-emerald-400 font-bold">{p.state_of_health_pct}% SoH</span>
                </div>
                <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      p.state_of_health_pct >= 85 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                      p.state_of_health_pct >= 75 ? 'bg-gradient-to-r from-cyan-500 to-blue-400' :
                      'bg-gradient-to-r from-amber-500 to-rose-400'
                    }`}
                    style={{ width: `${p.state_of_health_pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Custodian: {p.current_custodian}</span>
                  <span>Rated: {p.rated_capacity_kwh} kWh</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: EU Battery Carbon Intensity Benchmark */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Carbon Footprint vs EU Regulation Limits</h3>
            <span className="text-[11px] font-mono text-emerald-400">Class A Compliant</span>
          </div>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono">
                <span className="text-slate-300">QuantumVolt NMC 811</span>
                <span className="text-emerald-400 font-bold">62.5 kg CO₂e/kWh (Class A)</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-mono">
                <span className="text-slate-300">Nordic Battery Systems LFP</span>
                <span className="text-emerald-400 font-bold">51.2 kg CO₂e/kWh (Class A)</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: '38%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-mono">
                <span className="text-slate-300">Rhine Energy NCA</span>
                <span className="text-amber-400 font-bold">78.0 kg CO₂e/kWh (Class B)</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '60%' }} />
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between font-mono text-slate-500">
                <span>EU 2026 Maximum Regulatory Ceiling</span>
                <span className="text-rose-400 font-bold">95.0 kg CO₂e/kWh</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500/70 h-full rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Chemistry & Cell Technology Distribution */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">Chemistry Portfolio Breakdown</h3>

          <div className="grid grid-cols-3 gap-3 text-center">
            {Object.entries(chemCounts).map(([chem, count]) => (
              <div key={chem} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xl font-bold font-mono text-cyan-400">{count}</div>
                <div className="text-xs font-semibold text-slate-200 mt-1">{chem}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  {Math.round((count / totalBatteries) * 100)}% of fleet
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Recycled Critical Mineral Recovery Projections (2030 EU Targets) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Recycled Active Mineral Content Targets</h3>
            <span className="text-[11px] font-mono text-purple-400">EU 2030 Mandate</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-mono mb-1">
                <span className="text-slate-400">Cobalt Recovery Rate:</span>
                <span className="text-slate-200 font-bold">16.5% (Target: 16%) <span className="text-emerald-400">✓ PASS</span></span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: '95%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-mono mb-1">
                <span className="text-slate-400">Lithium Recovery Rate:</span>
                <span className="text-slate-200 font-bold">6.0% (Target: 6%) <span className="text-emerald-400">✓ PASS</span></span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-mono mb-1">
                <span className="text-slate-400">Nickel Recovery Rate:</span>
                <span className="text-slate-200 font-bold">12.0% (Target: 6%) <span className="text-emerald-400">✓ EXCEEDS</span></span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
