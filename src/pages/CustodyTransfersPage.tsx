import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Building,
  MapPin,
  FileText
} from 'lucide-react';
import { CustodyTransferRecord, PassportSummary, UserRole } from '../types';
import { api } from '../services/api';

interface CustodyTransfersPageProps {
  onSelectPassport: (id: string) => void;
  activeRole: UserRole;
  activeOrg: string;
}

export const CustodyTransfersPage: React.FC<CustodyTransfersPageProps> = ({
  onSelectPassport,
  activeRole,
  activeOrg
}) => {
  const [transfers, setTransfers] = useState<CustodyTransferRecord[]>([]);
  const [passports, setPassports] = useState<PassportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInitiateModal, setShowInitiateModal] = useState(false);

  // Transfer form state
  const [selectedBatteryId, setSelectedBatteryId] = useState('');
  const [targetCustodian, setTargetCustodian] = useState('Apex EV Mobility Fleet');
  const [targetRole, setTargetRole] = useState<UserRole>('FLEET_OPERATOR');
  const [location, setLocation] = useState('Frankfurt Logistics Gateway');
  const [conditionGrade, setConditionGrade] = useState('Grade A+ (Certified)');
  const [odometerKm, setOdometerKm] = useState(15000);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, pList] = await Promise.all([
        api.listCustodyTransfers(),
        api.listPassports()
      ]);
      setTransfers(tList);
      setPassports(pList);
      if (pList.length > 0 && !selectedBatteryId) {
        setSelectedBatteryId(pList[0].battery_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createCustodyTransfer({
        battery_id: selectedBatteryId,
        to_custodian: targetCustodian,
        to_role: targetRole,
        transfer_location: location,
        condition_grade: conditionGrade,
        odometer_km: odometerKm,
        notes: notes || 'Enterprise custody handover protocol'
      });
      setShowInitiateModal(false);
      setNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to initiate transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (transferId: string) => {
    try {
      await api.acceptCustodyTransfer(transferId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept transfer');
    }
  };

  const handleReject = async (transferId: string) => {
    try {
      await api.rejectCustodyTransfer(transferId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject transfer');
    }
  };

  const pendingTransfers = transfers.filter(t => t.status === 'PENDING');
  const completedTransfers = transfers.filter(t => t.status !== 'PENDING');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Chain of Custody Transfers</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Formal legal handovers between cell makers, vehicle OEMs, fleet managers, and recycling centers.
          </p>
        </div>

        <button
          onClick={() => setShowInitiateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-center"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Initiate Custody Transfer</span>
        </button>
      </div>

      {/* Initiate Transfer Modal */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Initiate Custody Transfer</h3>
              </div>
              <button
                onClick={() => setShowInitiateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ESC / Cancel
              </button>
            </div>

            <form onSubmit={handleInitiateTransfer} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Select Battery Pack *</label>
                <select
                  value={selectedBatteryId}
                  onChange={e => setSelectedBatteryId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                >
                  {passports.map(p => (
                    <option key={p.battery_id} value={p.battery_id}>
                      {p.battery_id} — {p.chemistry} ({p.current_custodian})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Receiving Stakeholder Org *</label>
                  <input
                    type="text"
                    value={targetCustodian}
                    onChange={e => setTargetCustodian(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Receiving Role *</label>
                  <select
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="OEM">Vehicle OEM</option>
                    <option value="FLEET_OPERATOR">Fleet Operator</option>
                    <option value="RECYCLER">Circularity Recycler</option>
                    <option value="MANUFACTURER">Manufacturer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Handover Location *</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Physical Condition Grade</label>
                  <input
                    type="text"
                    value={conditionGrade}
                    onChange={e => setConditionGrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Transfer Notes & Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inbound shipment arriving via rail freight. Scheduled for secondary BESS integration."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInitiateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Creating Transfer...' : 'Submit Handover Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Transfers Queue */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Clock className="w-4 h-4" />
          <span>Pending Inbound & Outbound Handovers ({pendingTransfers.length})</span>
        </div>

        {pendingTransfers.length === 0 ? (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
            No pending custody handovers awaiting signature. All fleet handoffs are settled.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTransfers.map(t => (
              <div
                key={t.transfer_id}
                className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {t.battery_id}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      AWAITING SIGNATURE
                    </span>
                  </div>

                  <div className="text-xs text-slate-200 flex flex-wrap items-center gap-2">
                    <span className="text-slate-400">From: <strong>{t.from_custodian}</strong> ({t.from_role})</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400">To: <strong className="text-cyan-400">{t.to_custodian}</strong> ({t.to_role})</span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center space-x-4">
                    <span>Location: <strong>{t.transfer_location}</strong></span>
                    <span>Condition: <strong>{t.condition_grade}</strong></span>
                  </div>
                  {t.notes && <div className="text-[11px] text-slate-400 italic">“{t.notes}”</div>}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleReject(t.transfer_id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold border border-slate-700"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleAccept(t.transfer_id)}
                    className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sign & Append Hash Block</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Transfers Ledger */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Settled Handover History</span>
        </div>

        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="p-3">Transfer ID</th>
                  <th className="p-3">Battery</th>
                  <th className="p-3">From Custodian</th>
                  <th className="p-3">To Custodian</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Hash Anchor</th>
                  <th className="p-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {completedTransfers.map(t => (
                  <tr key={t.transfer_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 text-slate-400">{t.transfer_id}</td>
                    <td className="p-3 font-bold text-emerald-400 cursor-pointer" onClick={() => onSelectPassport(t.battery_id)}>
                      {t.battery_id}
                    </td>
                    <td className="p-3 font-sans text-slate-300">{t.from_custodian}</td>
                    <td className="p-3 font-sans text-slate-200">{t.to_custodian}</td>
                    <td className="p-3 font-sans text-slate-400">{t.transfer_location}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        t.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-500 truncate max-w-[120px]">
                      {t.tx_hash ? t.tx_hash.slice(0, 16) + '...' : 'Verified Link'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onSelectPassport(t.battery_id)}
                        className="text-cyan-400 hover:text-cyan-300 font-sans text-xs"
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
