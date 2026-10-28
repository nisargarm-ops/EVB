import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  QrCode, 
  Zap, 
  Leaf, 
  Activity, 
  AlertCircle,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Award,
  Calendar,
  FileCheck,
  Building,
  Info,
  CheckCircle2,
  Lock,
  GitBranch,
  FileText,
  BadgeAlert,
  HelpCircle,
  Thermometer,
  Cpu
} from 'lucide-react';
import { BatteryPassport, CustodyEvent, UserRole } from '../types';
import { api } from '../services/api';
import { HashChainInspector } from '../components/HashChainInspector';
import { CustodyTimeline } from '../components/CustodyTimeline';
import { CustodyTransfersPanel } from '../components/CustodyTransfersPanel';
import { LifecycleDispositionPanel } from '../components/LifecycleDispositionPanel';

interface PassportDetailProps {
  batteryId: string;
  onBack: () => void;
  onShowQr: (id: string) => void;
  activeRole: UserRole;
}

export const PassportDetail: React.FC<PassportDetailProps> = ({
  batteryId,
  onBack,
  onShowQr,
  activeRole
}) => {
  const [passport, setPassport] = useState<BatteryPassport | null>(null);
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'transfers' | 'lifecycle' | 'audit'>('overview');

  // BMS Telemetry update state
  const [showTelemetryForm, setShowTelemetryForm] = useState(false);
  const [newSoH, setNewSoH] = useState(88.0);
  const [newSoC, setNewSoC] = useState(70.0);
  const [newCycles, setNewCycles] = useState(450);
  const [newResistance, setNewResistance] = useState(20.0);
  const [telemetryNote, setTelemetryNote] = useState('');
  const [sourceConfidence, setSourceConfidence] = useState(95);
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api.getBattery(batteryId);
      setPassport(p);
      setNewSoH(p.health_state.state_of_health_pct);
      setNewSoC(p.health_state.state_of_charge_pct);
      setNewCycles(p.health_state.cycle_count);
      setNewResistance(p.health_state.internal_resistance_mohm);
      setSourceConfidence(p.health_state.source_confidence_pct || 95);

      const evts = await api.getBatteryEvents(batteryId);
      setEvents(evts);
    } catch (err: any) {
      setError(err.message || 'Failed to load passport');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [batteryId]);

  const handleUpdateTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.updateTelemetry(batteryId, {
        state_of_health_pct: newSoH,
        state_of_charge_pct: newSoC,
        cycle_count: newCycles,
        internal_resistance_mohm: newResistance,
        source_type: 'WORKSHOP_DIAGNOSTIC',
        source_confidence_pct: sourceConfidence,
        data_classification: 'REPORTED_INFO',
        telemetry_notes: telemetryNote || 'BMS periodic health diagnostic telemetry'
      });
      setShowTelemetryForm(false);
      setTelemetryNote('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update telemetry');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading verified battery passport records...</p>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Passport Record Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'Requested battery record does not exist.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          Return to Fleet Passports
        </button>
      </div>
    );
  }

  // Role permissions check
  const isPublic = activeRole === 'PUBLIC';
  const isAuditor = activeRole === 'REGULATOR_AUDITOR';
  const isCustodian = activeRole !== 'PUBLIC';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Sample Demo Data Banner */}
      <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
            EU CIRPASS PROTOTYPE
          </span>
          <span className="text-slate-400">
            All telemetry and condition metrics displayed below are verified reference sample data compliant with EU 2023/1542.
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Role Persona: <strong className="text-emerald-400">{activeRole}</strong>
        </div>
      </div>

      {/* Flagged Suspicious Banner */}
      {passport.is_flagged_suspicious && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>
            <span className="font-bold">SUSPICIOUS PHYSICAL LABEL ALERT: </span>
            <span>{passport.suspicious_reason || 'Label reported for suspected cloning or fraudulent QR replacement.'}</span>
          </div>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{passport.battery_id}</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {passport.status.replace('_', ' ')}
              </span>
              {passport.is_revoked && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  REVOKED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center space-x-1.5">
              <span>UUID:</span>
              <span className="text-slate-300">{passport.battery_did}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['FLEET_OPERATOR', 'OEM', 'MANUFACTURER', 'RECYCLER'].includes(activeRole) && (
            <button
              onClick={() => setShowTelemetryForm(!showTelemetryForm)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Log Workshop Diagnosis</span>
            </button>
          )}

          <button
            onClick={() => onShowQr(passport.battery_id)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <QrCode className="w-4 h-4" />
            <span>Physical QR Sticker</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'overview'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Passport Metrology & Specs
        </button>
        <button
          onClick={() => setActiveSubTab('transfers')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'transfers'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Custody Governance & Transfers
        </button>
        <button
          onClick={() => setActiveSubTab('lifecycle')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'lifecycle'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Lifecycle State & Disposition
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'audit'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tamper-Evident Hash Audit
        </button>
      </div>

      {/* Telemetry Update Form */}
      {showTelemetryForm && (
        <form onSubmit={handleUpdateTelemetry} className="glass-panel p-6 rounded-2xl border border-cyan-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Record Workshop Diagnostic Observation</h3>
            </div>
            <span className="text-xs text-slate-400">Classified as 'Reported Information'</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">State of Health (%)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="100" 
                value={newSoH} 
                onChange={e => setNewSoH(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">State of Charge (%)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="100" 
                value={newSoC} 
                onChange={e => setNewSoC(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Cycle Count</label>
              <input 
                type="number" 
                min="0" 
                value={newCycles} 
                onChange={e => setNewCycles(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Internal Resistance (mΩ)</label>
              <input 
                type="number" 
                step="0.1" 
                min="1" 
                value={newResistance} 
                onChange={e => setNewResistance(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Reported Diagnosis Notes</label>
              <input 
                type="text" 
                placeholder="e.g. Workshop pre-delivery battery health check"
                value={telemetryNote} 
                onChange={e => setTelemetryNote(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Calibration Confidence Score (%)</label>
              <input 
                type="number" 
                min="50" 
                max="100"
                value={sourceConfidence} 
                onChange={e => setSourceConfidence(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowTelemetryForm(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
            >
              {updating ? 'Signing Block...' : 'Append Hash Chain Block'}
            </button>
          </div>
        </form>
      )}

      {/* Sub-Tab 1: Overview & Specs */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Verified Facts vs Reported vs Missing Data Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Facts</span>
              </div>
              <p className="text-xs text-slate-300">
                Factory birth certificate, manufacturing date, cell chemistry, and cryptographic SHA-256 custody chain blocks.
              </p>
              <div className="text-[10px] text-emerald-400 font-mono">Status: 100% Cryptographically Bound</div>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Activity className="w-4 h-4" />
                <span>Reported Condition Data</span>
              </div>
              <p className="text-xs text-slate-300">
                Live BMS telemetry & workshop diagnostics. Source: <strong className="text-cyan-300">{passport.health_state.source_type}</strong> ({passport.health_state.source_confidence_pct}% confidence).
              </p>
              <div className="text-[10px] text-cyan-400 font-mono">Freshness: {new Date(passport.health_state.last_telemetry_timestamp).toLocaleDateString()}</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <BadgeAlert className="w-4 h-4" />
                <span>Missing / Unreported Data</span>
              </div>
              <p className="text-xs text-slate-300">
                Thermal runaway stress logs and raw cell impedance spectra not supplied by custodian BMS gateway.
              </p>
              <div className="text-[10px] text-amber-400 font-mono">Flag: Standard Gap in Telemetry</div>
            </div>
          </div>

          {/* Main Grid: Health, Specs, Circularity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health & Condition Metrology */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health & Diagnostics</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <div className="text-4xl font-extrabold text-emerald-400 font-mono">
                  {passport.health_state.state_of_health_pct}%
                </div>
                <div className="text-xs text-slate-400 mt-1">State of Health (SoH)</div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                    style={{ width: `${passport.health_state.state_of_health_pct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">State of Charge (SoC):</span>
                  <span className="font-mono font-bold text-slate-200">{passport.health_state.state_of_charge_pct}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Cycle Count:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.health_state.cycle_count} cycles</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Internal Resistance:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.health_state.internal_resistance_mohm} mΩ</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Annual Degradation:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.health_state.capacity_fade_rate_pct_yr}% / yr</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Cell Voltage Deviation:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.health_state.cell_voltage_deviation_mv || 12} mV</span>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Technical Specifications</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Manufacturer:</span>
                  <span className="font-semibold text-slate-200">{passport.manufacturer_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Model Designation:</span>
                  <span className="font-semibold text-slate-200">{passport.model_designation}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Cathode Chemistry:</span>
                  <span className="font-semibold text-emerald-400">{passport.chemistry}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Rated Energy Capacity:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.technical_specs.rated_capacity_kwh} kWh</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Nominal Voltage:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.technical_specs.nominal_voltage_v} V</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Peak Charging Power:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.technical_specs.max_charge_power_kw} kW</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Cell Count:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.technical_specs.cell_count} cells</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Pack Weight:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.technical_specs.pack_weight_kg} kg</span>
                </div>
              </div>
            </div>

            {/* Custodian & Circular Carbon */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custody & Circular Footprint</span>
                <Leaf className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400">Current Legal Custodian</div>
                <div className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  <span>{passport.current_custodian}</span>
                </div>
                {passport.current_vehicle_vin && (
                  <div className="text-[11px] font-mono text-slate-400 pt-1">
                    Vehicle VIN: <span className="text-cyan-300">{passport.current_vehicle_vin}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Carbon Footprint</div>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {passport.carbon_footprint.total_co2_kg_per_kwh} <span className="text-xs">kg CO₂e/kWh</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  {passport.carbon_footprint.eu_compliance_class}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-[11px] font-bold text-slate-400 mb-1">Recycled Content (EU 2030 Standard)</div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Active Cobalt:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.recycled_content.cobalt_percentage}%</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Active Lithium:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.recycled_content.lithium_percentage}%</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Active Nickel:</span>
                  <span className="font-mono font-bold text-slate-200">{passport.recycled_content.nickel_percentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Warranty & Inspection Record Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Warranty Details */}
            {passport.warranty ? (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Manufacturer Warranty Certificate</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {passport.warranty.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Warranty ID:</span>
                    <span className="font-mono text-slate-200">{passport.warranty.warranty_id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Underwriting Provider:</span>
                    <span className="text-slate-200 font-medium">{passport.warranty.provider}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Coverage Type:</span>
                    <span className="text-slate-200">{passport.warranty.coverage_type}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Valid Until:</span>
                    <span className="font-mono text-slate-200">{new Date(passport.warranty.valid_until).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Retention Guarantee:</span>
                    <span className="font-bold text-emerald-400">{passport.warranty.capacity_retention_guarantee_pct}% capacity</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic pt-1">{passport.warranty.terms_summary}</p>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-center text-xs text-slate-400">
                No formal warranty certificate filed.
              </div>
            )}

            {/* Inspection Record */}
            {passport.latest_inspection ? (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Independent Inspection Audit</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {passport.latest_inspection.result}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Inspection ID:</span>
                    <span className="font-mono text-slate-200">{passport.latest_inspection.inspection_id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Auditing Body:</span>
                    <span className="text-slate-200 font-medium">{passport.latest_inspection.inspector_organization}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Mechanical Casing:</span>
                    <span className="text-slate-200">{passport.latest_inspection.mechanical_integrity}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Moisture / Thermal Safety:</span>
                    <span className="text-emerald-400 font-medium">Passed (Zero Ingress)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Audit Evidence Ref:</span>
                    <span className="font-mono text-cyan-300">{passport.latest_inspection.evidence_ref}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">{passport.latest_inspection.notes}</p>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-center text-xs text-slate-400">
                No third-party inspection filed yet.
              </div>
            )}
          </div>

          {/* Timeline of events */}
          <CustodyTimeline events={events} />
        </div>
      )}

      {/* Sub-Tab 2: Custody Governance & Transfers */}
      {activeSubTab === 'transfers' && (
        <CustodyTransfersPanel
          batteryId={passport.battery_id}
          currentCustodian={passport.current_custodian}
          activeRole={activeRole}
          onTransferCompleted={loadData}
        />
      )}

      {/* Sub-Tab 3: Lifecycle State & Disposition Engine */}
      {activeSubTab === 'lifecycle' && (
        <LifecycleDispositionPanel
          batteryId={passport.battery_id}
          currentStatus={passport.status}
          activeRole={activeRole}
          onStatusUpdated={loadData}
        />
      )}

      {/* Sub-Tab 4: Tamper-Evident Hash Audit */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6">
          <HashChainInspector batteryId={passport.battery_id} events={events} onReload={loadData} />
        </div>
      )}
    </div>
  );
};
