import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Cpu, 
  Activity, 
  Recycle, 
  Zap, 
  QrCode, 
  Layers, 
  Truck, 
  CheckCircle2, 
  Sparkles,
  Lock,
  Globe,
  Leaf
} from 'lucide-react';
import { HeroBatteryGraphic } from '../components/HeroBatteryGraphic';

interface LandingPageProps {
  onNavigate: (tab: string) => void;
  onSelectBattery: (id: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onSelectBattery }) => {
  const lifecycleStages = [
    {
      step: '01',
      title: 'Cell & Pack Manufacturing',
      role: 'MANUFACTURER',
      desc: 'Genesis SHA-256 block creation. Deterministic DID anchor calculated from serial, chemistry & date.',
      icon: Zap,
      color: 'border-emerald-500/40 text-emerald-400'
    },
    {
      step: '02',
      title: 'Vehicle OEM Integration',
      role: 'OEM',
      desc: 'VIN association and pack commissioning. Inverter compatibility check and digital handoff.',
      icon: ShieldCheck,
      color: 'border-blue-500/40 text-blue-400'
    },
    {
      step: '03',
      title: 'Fleet Operations & Telematics',
      role: 'FLEET_OPERATOR',
      desc: 'Real-time BMS stream: State of Health (SoH), internal resistance (mΩ) and cycle accumulation.',
      icon: Activity,
      color: 'border-amber-500/40 text-amber-400'
    },
    {
      step: '04',
      title: 'Second-Life BESS Storage',
      role: 'CIRCULARITY',
      desc: 'Repurposing degraded vehicle packs (70–80% SoH) for stationary microgrids and peak shaving.',
      icon: Recycle,
      color: 'border-purple-500/40 text-purple-400'
    },
    {
      step: '05',
      title: 'Closed-Loop Deep Recycling',
      role: 'RECYCLER',
      desc: 'Hydrometallurgical extraction tracking recovery rates for high-purity Cobalt, Lithium & Nickel.',
      icon: Leaf,
      color: 'border-cyan-500/40 text-cyan-400'
    },
    {
      step: '06',
      title: 'Regulatory Audit & Verification',
      role: 'AUDITOR',
      desc: 'Zero-knowledge verification of full block chain. Immediate tamper detection with cryptographic proof.',
      icon: Lock,
      color: 'border-rose-500/40 text-rose-400'
    }
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 sm:pt-12 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Subtle background glow spots */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>EU Battery Regulation (EU 2023/1542) Digital Product Passport</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Cross-Enterprise <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                EV Battery Metrology
              </span>
              <br />
              & Circular Passports
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              An enterprise platform tracking State of Health, carbon intensity, and tamper-evident custody chains 
              across cell manufacturers, vehicle OEMs, fleet operators, and circular recyclers. 
              Accelerated with <span className="text-cyan-400 font-semibold">QpiAI-Opt</span> reverse logistics and <span className="text-emerald-400 font-semibold">QpiAI Quantum</span> cathode degradation simulation.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
              >
                <span>Launch Fleet Dashboard</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                onClick={() => onNavigate('decisions')}
                className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 hover:border-slate-600 transition-all"
              >
                <Recycle className="w-4 h-4 text-cyan-400" />
                <span>Circular Disposition Studio</span>
              </button>

              <button
                onClick={() => onNavigate('verify')}
                className="flex items-center space-x-2 px-4 py-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition-all"
              >
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>QR Verification Portal</span>
              </button>
            </div>

            {/* Quick KPI Row */}
            <div className="pt-6 grid grid-cols-3 gap-3 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0">
              <div>
                <div className="text-2xl font-black text-white font-mono">100%</div>
                <div className="text-[11px] text-slate-400">EU 2023/1542 Metrology</div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-400 font-mono">SHA-256</div>
                <div className="text-[11px] text-slate-400">Custody Chain Integrity</div>
              </div>
              <div>
                <div className="text-2xl font-black text-cyan-400 font-mono">QpiAI</div>
                <div className="text-[11px] text-slate-400">Opt & Quantum SDK</div>
              </div>
            </div>
          </div>

          {/* Hero Illustration Graphic */}
          <div className="lg:col-span-5 flex justify-center">
            <HeroBatteryGraphic />
          </div>
        </div>
      </section>

      {/* Featured Batteries Live Demo Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Live Demonstration Passports</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-1">Pre-Seeded Compliant Battery Fleet</h2>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <span>View Full Fleet Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div 
            onClick={() => { onSelectBattery('BAT-NMC-8A2F91C0'); onNavigate('detail'); }}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                BAT-NMC-8A2F91C0
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                IN SERVICE
              </span>
            </div>
            <h3 className="font-bold text-white group-hover:text-emerald-300 transition-colors">NMC 811 High-Energy Pack</h3>
            <p className="text-xs text-slate-400 mt-0.5">QuantumVolt Gigafactory · Berlin</p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono pt-3 border-t border-slate-800">
              <span className="text-slate-400">SoH: <strong className="text-emerald-400">88.4%</strong></span>
              <span className="text-slate-400">Capacity: <strong className="text-slate-200">92.4 kWh</strong></span>
              <span className="text-slate-400">Class: <strong className="text-emerald-400">A</strong></span>
            </div>
          </div>

          <div 
            onClick={() => { onSelectBattery('BAT-LFP-3C7D410E'); onNavigate('detail'); }}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                BAT-LFP-3C7D410E
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                SECOND LIFE
              </span>
            </div>
            <h3 className="font-bold text-white group-hover:text-cyan-300 transition-colors">LFP SafeCell Stationary BESS</h3>
            <p className="text-xs text-slate-400 mt-0.5">Nordic Battery Systems · Skellefteå</p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono pt-3 border-t border-slate-800">
              <span className="text-slate-400">SoH: <strong className="text-cyan-400">76.8%</strong></span>
              <span className="text-slate-400">Capacity: <strong className="text-slate-200">64.0 kWh</strong></span>
              <span className="text-slate-400">Class: <strong className="text-cyan-400">A</strong></span>
            </div>
          </div>

          <div 
            onClick={() => { onSelectBattery('BAT-NCA-F104A7B2'); onNavigate('detail'); }}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                BAT-NCA-F104A7B2
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                END OF LIFE
              </span>
            </div>
            <h3 className="font-bold text-white group-hover:text-amber-300 transition-colors">NCA Long-Range Pack (Ready for Recycling)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Rhine Energy Cells · Dunkirk</p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono pt-3 border-t border-slate-800">
              <span className="text-slate-400">SoH: <strong className="text-amber-400">64.2%</strong></span>
              <span className="text-slate-400">Capacity: <strong className="text-slate-200">85.0 kWh</strong></span>
              <span className="text-slate-400">Class: <strong className="text-amber-400">B</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 6-Stage Circular Lifecycle */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/30">
            <Globe className="w-3.5 h-3.5" />
            <span>Circular Economy Metrology Standard</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Full-Lifecycle Metrology Architecture</h2>
          <p className="text-slate-400 text-sm">
            EU Regulation 2023/1542 mandates unbroken traceability from mineral genesis to closed-loop hydrometallurgical recycling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lifecycleStages.map(stage => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border bg-slate-900 ${stage.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-extrabold text-slate-500">STAGE {stage.step}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{stage.title}</h3>
                  <div className="text-[10px] font-mono text-cyan-400 mt-0.5">STAKEHOLDER: {stage.role}</div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{stage.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security & Cryptography Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-10 border border-emerald-500/30 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero-Trust Cryptographic Ledger</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Mathematically Guaranteed Tamper Evidence
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every battery passport block encodes the canonical cryptographic digest of its payload, actor signature, 
              timestamp, and the previous block's SHA-256 hash. Any retroactive alteration breaks the downstream chain, 
              alerting auditors and customs authorities in under 5 milliseconds.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                DID:BATTERY:SHA256
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400">
                GENESIS: 0000...0000
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400">
                FASTAPI + CLIENT RECALC
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 font-mono text-xs space-y-3">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              Cryptographic Block Verification Formula:
            </div>
            <pre className="text-[11px] text-emerald-400 bg-slate-900 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`block_hash = SHA256(
  prev_hash |
  battery_id |
  event_type |
  timestamp  |
  actor_id   |
  canonical_json(payload)
)`}
            </pre>
            <div className="text-[11px] text-slate-400">
              Audited in accordance with CIRPASS metrology standards and EU 2023/1542 Annex VI digital passport specifications.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
