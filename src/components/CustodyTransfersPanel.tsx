import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  ChevronRight,
  Building,
  Hash
} from 'lucide-react';
import { CustodyTransfer, UserRole } from '../types';
import { api } from '../services/api';

interface CustodyTransfersPanelProps {
  batteryId: string;
  currentCustodian: string;
  activeRole: UserRole;
  onTransferCompleted: () => void;
}

export const CustodyTransfersPanel: React.FC<CustodyTransfersPanelProps> = ({
  batteryId,
  currentCustodian,
  activeRole,
  onTransferCompleted
}) => {
  const [transfers, setTransfers] = useState<CustodyTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Form state
  const [receiverOrg, setReceiverOrg] = useState('');
  const [receiverRole, setReceiverRole] = useState<UserRole>('OEM');
  const [transferReason, setTransferReason] = useState('Vehicle Assembly Handover');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const data = await api.listTransfers(batteryId);
      setTransfers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [batteryId]);

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.requestCustodyTransfer({
        battery_id: batteryId,
        receiver_organization: receiverOrg,
        intended_receiver_role: receiverRole,
        transfer_reason: transferReason,
        notes: notes || undefined
      });
      setShowRequestForm(false);
      setReceiverOrg('');
      setNotes('');
      await loadTransfers();
    } catch (err: any) {
      setError(err.message || 'Transfer request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptTransfer = async (transferId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.acceptCustodyTransfer(transferId);
      await loadTransfers();
      onTransferCompleted();
    } catch (err: any) {
      setError(err.message || 'Failed to accept transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.rejectCustodyTransfer(rejectModalId, rejectReason || 'Declined by recipient organization');
      setRejectModalId(null);
      setRejectReason('');
      await loadTransfers();
    } catch (err: any) {
      setError(err.message || 'Failed to reject transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: CustodyTransfer['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>Pending Acceptance</span>
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Transfer Confirmed</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <span>Cancelled</span>
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Custody Transfer Governance</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Two-party authorization protocol. Transfers require explicit recipient confirmation before updating canonical custody.
          </p>
        </div>

        {activeRole !== 'PUBLIC' && (
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Request New Transfer</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Transfer Request Form */}
      {showRequestForm && (
        <form onSubmit={handleRequestTransfer} className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-4">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
            <FileText className="w-4 h-4" />
            <span>Formal Custody Transfer Request Manifest</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Origin Custodian (Sender)</label>
              <input
                type="text"
                disabled
                value={currentCustodian}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Destination Organization (Receiver) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Motors AG"
                value={receiverOrg}
                onChange={e => setReceiverOrg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Receiver Enterprise Role *</label>
              <select
                value={receiverRole}
                onChange={e => setReceiverRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="OEM">Vehicle OEM (Assembly)</option>
                <option value="FLEET_OPERATOR">Fleet Operator (In-Service)</option>
                <option value="RECYCLER">Circular Recycler / Repurposer</option>
                <option value="MANUFACTURER">Cell Manufacturer</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Transfer Rationale *</label>
              <select
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="Vehicle Assembly Handover">Vehicle Assembly Handover</option>
                <option value="Commercial Fleet Delivery">Commercial Fleet Delivery</option>
                <option value="Scheduled Maintenance & Reconditioning">Scheduled Maintenance & Reconditioning</option>
                <option value="Second-Life BESS Redeployment">Second-Life BESS Redeployment</option>
                <option value="End-of-Life Hydrometallurgical Recycling">End-of-Life Hydrometallurgical Recycling</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Transfer Notes & Physical Seal Serial</label>
            <input
              type="text"
              placeholder="e.g. Container Seal #EU-SEAL-8891, battery pack secured in fireproof shipping crate"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              By dispatching, you declare that custody verification evidence and physical pack condition match this digital manifest. 
              The recipient must sign electronically to complete the transfer.
            </span>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
            >
              {submitting ? 'Generating Manifest...' : 'Submit Transfer Manifest'}
            </button>
          </div>
        </form>
      )}

      {/* Reject Reason Modal */}
      {rejectModalId && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-rose-500/40 space-y-3">
          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Decline Custody Transfer</h4>
          <p className="text-xs text-slate-300">
            Specify the audit reason for rejecting this battery handover (e.g., damaged physical packaging, missing seal, failed pre-check).
          </p>
          <input
            type="text"
            required
            placeholder="e.g. Mechanical casing damaged during transport; rejected at loading dock."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setRejectModalId(null);
                setRejectReason('');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectTransfer}
              disabled={actionLoading}
              className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs"
            >
              {actionLoading ? 'Declining...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      )}

      {/* Transfers List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading custody records...</div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-8 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400">
            No custody transfer requests recorded for this battery pack.
          </div>
        ) : (
          transfers.map(xfr => (
            <div
              key={xfr.transfer_id}
              className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                    {xfr.transfer_id}
                  </span>
                  {getStatusBadge(xfr.status)}
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Requested: {new Date(xfr.requested_at).toLocaleString()}
                </span>
              </div>

              {/* Sender -> Receiver flow */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/70">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">From Sender</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{xfr.sender_organization}</div>
                  <div className="text-[11px] text-slate-400 font-mono">ID: {xfr.sender_actor_id}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Intended Destination</div>
                  <div className="font-semibold text-amber-400 mt-0.5">{xfr.receiver_organization}</div>
                  <div className="text-[11px] text-slate-400 font-mono">Target Role: {xfr.intended_receiver_role}</div>
                </div>
              </div>

              <div className="text-xs text-slate-300">
                <span className="text-slate-500">Reason: </span>
                <span className="font-medium text-slate-200">{xfr.transfer_reason}</span>
                {xfr.notes && (
                  <div className="mt-1 text-[11px] text-slate-400 italic">"{xfr.notes}"</div>
                )}
              </div>

              {/* Audit Evidence */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                <div className="truncate max-w-md flex items-center space-x-1">
                  <Hash className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-500">Manifest Hash:</span>
                  <span className="text-emerald-400/90 truncate">{xfr.manifest_hash}</span>
                </div>

                {xfr.evidence_ref && (
                  <div className="text-slate-400 flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span>Evidence: {xfr.evidence_ref}</span>
                  </div>
                )}
              </div>

              {xfr.rejection_reason && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  Rejection Reason: {xfr.rejection_reason}
                </div>
              )}

              {/* Recipient Action Buttons when Pending */}
              {xfr.status === 'PENDING' && (
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setRejectModalId(xfr.transfer_id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold border border-rose-500/30 transition-colors"
                  >
                    Reject Handover
                  </button>
                  <button
                    onClick={() => handleAcceptTransfer(xfr.transfer_id)}
                    disabled={actionLoading}
                    className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{actionLoading ? 'Confirming...' : 'Accept & Record Handover Event'}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
