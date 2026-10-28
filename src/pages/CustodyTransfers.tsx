import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  Truck, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { CustodyTransfer, PassportSummary, Organization, UserRole } from '../types';
import { api } from '../services/api';

interface CustodyTransfersProps {
  activeRole: UserRole;
  activeOrg: string;
  onNavigateDetail: (batteryId: string) => void;
}

export const CustodyTransfers: React.FC<CustodyTransfersProps> = ({
  activeRole,
  activeOrg,
  onNavigateDetail,
}) => {
  const [transfers, setTransfers] = useState<CustodyTransfer[]>([]);
  const [passports, setPassports] = useState<PassportSummary[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Initiate Modal state
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [selectedBatteryId, setSelectedBatteryId] = useState('');
  const [recipientOrgId, setRecipientOrgId] = useState('');
  const [transferType, setTransferType] = useState('FLEET_DELIVERY');
  const [transferNotes, setTransferNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Accept Modal state
  const [acceptingTransferId, setAcceptingTransferId] = useState<string | null>(null);
  const [acceptNotes, setAcceptNotes] = useState('');

  // Reject Modal state
  const [rejectingTransferId, setRejectingTransferId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transferList, passportList] = await Promise.all([
        api.listTransfers(),
        api.listPassports(),
      ]);
      setTransfers(transferList);
      setPassports(passportList);
      const orgs = api.listOrganizations();
      setOrganizations(orgs);
      if (passportList.length > 0 && !selectedBatteryId) {
        setSelectedBatteryId(passportList[0].battery_id);
      }
      if (orgs.length > 0 && !recipientOrgId) {
        setRecipientOrgId(orgs[1]?.id || orgs[0].id);
      }
    } catch (err) {
      console.error('Failed to load transfers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatteryId || !recipientOrgId) return;

    const targetOrg = organizations.find((o) => o.id === recipientOrgId);
    setSubmitting(true);
    try {
      await api.createTransfer({
        battery_id: selectedBatteryId,
        receiver_org_id: recipientOrgId,
        receiver_org_name: targetOrg ? targetOrg.name : 'Authorized Recipient',
        transfer_type: transferType,
        notes: transferNotes || `Custody handover initiated by ${activeOrg}`,
      });
      setShowInitiateModal(false);
      setTransferNotes('');
      await loadData();
      setActionNotice({ message: 'Custody transfer manifest created successfully.', type: 'success' });
    } catch (err: any) {
      setActionNotice({ message: err.message || 'Failed to initiate transfer', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptingTransferId) return;
    setSubmitting(true);
    try {
      await api.acceptTransfer(acceptingTransferId, acceptNotes || 'Inbound physical & BMS inspection verified');
      setAcceptingTransferId(null);
      setAcceptNotes('');
      await loadData();
      setActionNotice({ message: 'Custody transfer accepted and committed to hash chain.', type: 'success' });
    } catch (err: any) {
      setActionNotice({ message: err.message || 'Failed to accept transfer', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTransferId || !rejectReason.trim()) {
      setActionNotice({ message: 'A valid rejection reason is legally required under EU custody regulations.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await api.rejectTransfer(rejectingTransferId, rejectReason);
      setRejectingTransferId(null);
      setRejectReason('');
      await loadData();
      setActionNotice({ message: 'Custody transfer rejected with documented audit refusal reason.', type: 'success' });
    } catch (err: any) {
      setActionNotice({ message: err.message || 'Failed to reject transfer', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    const matchesFilter = filterState === 'ALL' || t.state === filterState;
    const matchesSearch =
      t.battery_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sender_org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.receiver_org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transfer_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = transfers.filter((t) => t.state === 'PENDING').length;
  const acceptedCount = transfers.filter((t) => t.state === 'ACCEPTED').length;
  const rejectedCount = transfers.filter((t) => t.state === 'REJECTED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {actionNotice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          actionNotice.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white ml-4">✕</button>
        </div>
      )}

      {/* Title & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Custody Transfers & Chain-of-Custody</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              EU 2023/1542 Art. 77
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Inter-enterprise handovers with cryptographic state transitions, inspection receipts, and SHA-256 hash anchoring.
          </p>
        </div>

        <button
          onClick={() => setShowInitiateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Initiate Custody Transfer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Total Handovers</div>
          <div className="text-2xl font-bold font-mono text-white">{transfers.length}</div>
          <div className="text-[10px] text-slate-500">Cross-enterprise manifests</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
          <div className="text-[11px] font-medium text-amber-300">Pending Action</div>
          <div className="text-2xl font-bold font-mono text-amber-400">{pendingCount}</div>
          <div className="text-[10px] text-amber-400/70">Awaiting recipient signoff</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
          <div className="text-[11px] font-medium text-emerald-300">Accepted & Sealed</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{acceptedCount}</div>
          <div className="text-[10px] text-emerald-400/70">Anchored to hash chain</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1">
          <div className="text-[11px] font-medium text-rose-300">Rejected / Returned</div>
          <div className="text-2xl font-bold font-mono text-rose-400">{rejectedCount}</div>
          <div className="text-[10px] text-rose-400/70">Discrepancy registered</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterState === st
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search battery, organization, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Transfers List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading custody manifests from database...</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
          <ArrowLeftRight className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Custody Transfers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? 'No transfer matches your search criteria.' : 'No transfer manifests registered in this view. Initiate a new handover to transfer battery custody.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransfers.map((t) => {
            const isPending = t.state === 'PENDING';
            const isAccepted = t.state === 'ACCEPTED';
            const isRejected = t.state === 'REJECTED';

            return (
              <div
                key={t.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <span
                      onClick={() => onNavigateDetail(t.battery_id)}
                      className="font-mono font-bold text-sm text-cyan-400 hover:underline cursor-pointer"
                    >
                      {t.battery_id}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                      {t.transfer_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        isAccepted
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {t.state}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(t.initiated_at).toLocaleDateString()} {new Date(t.initiated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Sender -> Receiver Flow */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Transferor (Sender)</div>
                    <div className="font-semibold text-white flex items-center space-x-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.sender_org_name}</span>
                    </div>
                  </div>

                  <div className="hidden md:flex flex-col items-center justify-center text-slate-500">
                    <Truck className="w-5 h-5 text-cyan-400 mb-1" />
                    <span className="text-[10px] font-mono">Chain of Custody Handover</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Transferee (Recipient)</div>
                    <div className="font-semibold text-white flex items-center space-x-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.receiver_org_name}</span>
                    </div>
                  </div>
                </div>

                {/* Notes & Justifications */}
                <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400">Transfer Manifest Notes:</div>
                  <p className="text-slate-300 leading-relaxed">{t.notes || 'No operational remarks attached.'}</p>
                  {t.rejection_reason && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-rose-300 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <span className="font-bold">Rejection Justification: </span>
                        <span>{t.rejection_reason}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons if Pending */}
                {isPending && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        setRejectingTransferId(t.id);
                        setRejectReason('');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all flex items-center space-x-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Transfer</span>
                    </button>

                    <button
                      onClick={() => {
                        setAcceptingTransferId(t.id);
                        setAcceptNotes('');
                      }}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold hover:brightness-110 transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Accept Transfer & Append Block</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Initiate Transfer */}
      {showInitiateModal && (
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
                  <h3 className="text-sm font-bold text-white">Initiate Custody Transfer Manifest</h3>
                  <p className="text-xs text-slate-400">EU Battery Metrology Handover</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Select Battery Passport</label>
              <select
                value={selectedBatteryId}
                onChange={(e) => setSelectedBatteryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              >
                {passports.map((p) => (
                  <option key={p.battery_id} value={p.battery_id}>
                    {p.battery_id} — {p.chemistry} (SoH: {p.state_of_health_pct}%, Custodian: {p.current_custodian})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Recipient Organization</label>
              <select
                value={recipientOrgId}
                onChange={(e) => setRecipientOrgId(e.target.value)}
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
              <label className="text-xs font-medium text-slate-300 block mb-1">Transfer Purpose & Workflow</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="OEM_DELIVERY">OEM Automotive Delivery (Cell to Vehicle Assembly)</option>
                <option value="FLEET_DELIVERY">Fleet Onboarding (Commercial EV Deployment)</option>
                <option value="SERVICE_CENTER_TRANSFER">Maintenance Handover (Periodic Inspection)</option>
                <option value="REMANUFACTURING_TRANSFER">Second-Life Remanufacturing (BESS Conversion)</option>
                <option value="RECYCLING_DELIVERY">End-of-Life Hydrometallurgical Recycling Delivery</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Transfer Notes & Seal Identifier</label>
              <textarea
                rows={3}
                placeholder="e.g. EU HazMat Class 9 Transport Seal #EU-BAT-9941. In-transit temperature log verified."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20"
              >
                {submitting ? 'Creating Manifest...' : 'Issue Transfer Manifest'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Accept Transfer */}
      {acceptingTransferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleAcceptTransfer}
            className="w-full max-w-md glass-panel bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center space-x-2.5 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Accept Custody Transfer</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Accepting this transfer commits your organization as the official legal custodian of this battery pack under EU Regulation 2023/1542. An immutable cryptographic block will be calculated and anchored to the SHA-256 hash chain.
            </p>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Receipt & Inbound Inspection Remarks</label>
              <input
                type="text"
                placeholder="e.g. Physical casing inspected, SoC verified at 72%, no cell faults."
                value={acceptNotes}
                onChange={(e) => setAcceptNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptingTransferId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                {submitting ? 'Anchoring...' : 'Confirm Acceptance & Seal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Reject Transfer */}
      {rejectingTransferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleRejectTransfer}
            className="w-full max-w-md glass-panel bg-slate-900/95 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center space-x-2.5 text-rose-400">
              <XCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Reject Inbound Custody</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Custody rejection requires mandatory regulatory justification. The battery will remain with the prior custodian and a discrepancy record will be logged.
            </p>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Mandatory Rejection Reason</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Casing puncture detected upon delivery; telemetry serial mismatch."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingTransferId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold"
              >
                {submitting ? 'Rejecting...' : 'Submit Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
