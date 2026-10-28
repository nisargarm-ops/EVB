import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  QrCode, 
  Zap, 
  Leaf, 
  Activity, 
  AlertCircle,
  Truck,
  Recycle,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Sparkles
} from 'lucide-react';
import { BatteryPassport, CustodyEvent, UserRole, DispositionDecision, Organization } from '../types';
import { api } from '../services/api';
import { HashChainInspector } from '../components/HashChainInspector';
import { CustodyTimeline } from '../components/CustodyTimeline';

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
  const [disposition, setDisposition] = useState<DispositionDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // BMS Telemetry update state
  const [showTelemetryForm, setShowTelemetryForm] = useState(false);
  const [newSoH, setNewSoH] = useState(88.0);
  const [newSoC, setNewSoC] = useState(70.0);
  const [newCycles, setNewCycles] = useState(450);
  const [newResistance, setNewResistance] = useState(20.0);
  const [telemetryNote, setTelemetryNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Custody transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [transferTargetOrg, setTransferTargetOrg] = useState('');
  const [transferType, setTransferType] = useState('FLEET_DELIVERY');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api.getPassport(batteryId);
      setPassport(p);
      setNewSoH(p.health_state.state_of_health_pct);
      setNewSoC(p.health_state.state_of_charge_pct);
      setNewCycles(p.health_state.cycle_count);
      setNewResistance(p.health_state.internal_resistance_mohm);

      const [evts, disp, orgs] = await Promise.all([
        api.getCustodyEvents(batteryId),
        api.getDispositionDecision(batteryId),
        Promise.resolve(api.listOrganizations()),
      ]);

      setEvents(evts);
      setDisposition(disp);
      setOrganizations(orgs);
      if (orgs.length > 0 && !transferTargetOrg) {
        setTransferTargetOrg(orgs[1]?.id || orgs[0].id);
      }
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

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetOrg) return;
    const target = organizations.find((o) => o.id === transferTargetOrg);
    setTransferSubmitting(true);
    try {
      await api.createTransfer({
        battery_id: batteryId,
        receiver_org_id: transferTargetOrg,
        receiver_org_name: target ? target.name : 'Authorized Recipient',
        transfer_type: transferType,
        notes: transferNotes || `Direct transfer initiated from Passport ${batteryId}`,
      });
      setShowTransferModal(false);
      setTransferNotes('');
      await loadData();
      alert('Custody transfer manifest created successfully and routed to recipient.');
    } catch (err: any) {
      alert(err.message || 'Failed to initiate transfer');
    } finally {
      setTransferSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading passport metrology records...</p>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Passport Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'Requested battery record does not exist.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                {passport.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{passport.battery_did}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {['FLEET_OPERATOR', 'OEM', 'MANUFACTURER', 'SERVICE_CENTER'].includes(activeRole) && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Transfer Custody</span>
            </button>
          )}

          {['FLEET_OPERATOR', 'OEM', 'MANUFACTURER'].includes(activeRole) && (
            <button
              onClick={() => setShowTelemetryForm(!showTelemetryForm)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Log BMS Telemetry</span>
            </button>
          )}

          <button
            onClick={() => onShowQr(passport.battery_id)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <QrCode className="w-4 h-4" />
            <span>Digital QR Sticker</span>
          </button>
        </div>
      </div>

      {/* Telemetry Update Modal Form */}
      {showTelemetryForm && (
        <form onSubmit={handleUpdateTelemetry} className="glass-panel p-6 rounded-2xl border border-cyan-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Record Live Battery Telemetry (BMS)</h3>
            </div>
            <span className="text-xs text-slate-400">Enforces Tamper-Evident Hash Chain</span>
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

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Telemetry Notes / Diagnostics</label>
            <input 
              type="text" 
              placeholder="e.g. Scheduled quarterly fleet diagnostic scan"
              value={telemetryNote} 
              onChange={e => setTelemetryNote(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
            />
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
              {updating ? 'Appending Block...' : 'Append Hash Chain Block'}
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Health, Specs, Circularity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State of Health & Telematics */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health & Degradation</span>
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
              <span className="text-slate-400">Current Custodian:</span>
              <span className="font-semibold text-slate-200">{passport.current_custodian}</span>
            </div>
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
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Annual Fade Rate:</span>
              <span className="font-mono font-bold text-slate-200">{passport.health_state.capacity_fade_rate_pct_yr}% / yr</span>
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
              <span className="text-slate-400">Chemistry:</span>
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

        {/* Circularity & Carbon Footprint */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EU Circular Metrology</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
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
            <div className="text-[11px] font-bold text-slate-400 mb-2">Recycled Material Content (Target 2030)</div>
            
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Active Cobalt:</span>
                <span className="font-mono font-bold text-slate-200">{passport.recycled_content.cobalt_percentage}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${passport.recycled_content.cobalt_percentage}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Active Lithium:</span>
                <span className="font-mono font-bold text-slate-200">{passport.recycled_content.lithium_percentage}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${passport.recycled_content.lithium_percentage}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Active Nickel:</span>
                <span className="font-mono font-bold text-slate-200">{passport.recycled_content.nickel_percentage}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${passport.recycled_content.nickel_percentage}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EU 2023/1542 Disposition & Second-Life Decision Engine */}
      {disposition && (
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">EU 2023/1542 Circular Disposition Decision</h3>
                <p className="text-xs text-slate-400">Algorithmic End-of-First-Life & Second-Life Routing</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Regulatory Score:</span>
              <span className="text-sm font-bold font-mono text-cyan-400 px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                {disposition.score}/100
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Primary Recommendation</div>
              <div className="text-base font-bold text-emerald-400">
                {(disposition.recommended_action || disposition.recommendation).replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Second-Life Suitable: <strong className="text-white">{disposition.is_second_life_suitable ? 'Yes' : 'No'}</strong></span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Target Application</div>
              <div className="text-sm font-bold text-white">
                {disposition.target_application || 'Stationary Grid Storage (BESS)'}
              </div>
              <div className="text-xs text-slate-400">
                Est. Lifespan Remaining: <strong className="text-slate-200">{disposition.estimated_remaining_useful_life_years} years</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Recycling Recovery Target</div>
              <div className="text-sm font-bold text-cyan-400">
                {disposition.recycling_efficiency_pct}% Recovery
              </div>
              <div className="text-xs text-slate-400">
                Approval Status: <span className="font-semibold text-emerald-400">{disposition.approval_status}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
            <div className="font-semibold text-slate-300">Statutory Justification & Regulatory References:</div>
            <p className="text-slate-300 leading-relaxed">{disposition.explanation}</p>
            {disposition.constraints_evaluated && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                  Min SoH Threshold: 70% (Actual: {passport.health_state.state_of_health_pct}%)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                  Thermal Runaway Events: 0
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                  EU Art. 14 Conformity: Validated
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cryptographic Tamper-Evident Hash Chain Inspector */}
      <HashChainInspector batteryId={passport.battery_id} events={events} />

      {/* Chain of Custody Timeline */}
      <CustodyTimeline events={events} />

      {/* Transfer Custody Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleInitiateTransfer}
            className="w-full max-w-lg glass-panel bg-slate-900/95 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Transfer Battery Custody</h3>
                  <p className="text-xs text-slate-400 font-mono">{passport.battery_id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Target Transferee Organization</label>
              <select
                value={transferTargetOrg}
                onChange={(e) => setTransferTargetOrg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({(org.org_type || org.type || 'ENTERPRISE').replace(/_/g, ' ')}) — {org.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Transfer Purpose</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="OEM_DELIVERY">OEM Automotive Delivery</option>
                <option value="FLEET_DELIVERY">Commercial Fleet Onboarding</option>
                <option value="SERVICE_CENTER_TRANSFER">Maintenance Handover</option>
                <option value="REMANUFACTURING_TRANSFER">Second-Life Remanufacturing Transfer</option>
                <option value="RECYCLING_DELIVERY">End-of-Life Recycling Delivery</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Transfer Notes / Transport Seal</label>
              <textarea
                rows={3}
                placeholder="e.g. Dispatched via certified ADR carrier. Transport seal #TS-8842."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={transferSubmitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20"
              >
                {transferSubmitting ? 'Dispatching...' : 'Dispatch Custody Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
