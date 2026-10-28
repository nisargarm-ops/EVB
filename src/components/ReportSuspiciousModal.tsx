import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { SuspiciousReportRequest } from '../types';
import { api } from '../services/api';

interface ReportSuspiciousModalProps {
  batteryId: string;
  onClose: () => void;
  onReportSubmitted: () => void;
}

export const ReportSuspiciousModal: React.FC<ReportSuspiciousModalProps> = ({
  batteryId,
  onClose,
  onReportSubmitted
}) => {
  const [reason, setReason] = useState<SuspiciousReportRequest['reason']>('CLONED_QR_CODE');
  const [location, setLocation] = useState('Central Workshop Dock');
  const [details, setDetails] = useState('');
  const [claimedSoh, setClaimedSoh] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.reportSuspiciousLabel({
        battery_id: batteryId,
        reporter_role: api.getCurrentRole(),
        reporter_org: api.getCurrentOrg(),
        location,
        reason,
        details: details || 'Suspicious label observed during verification scan',
        claimed_soh_pct: claimedSoh ? parseFloat(claimedSoh) : undefined
      });
      setSuccess(true);
      setTimeout(() => {
        onReportSubmitted();
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to submit suspicious label report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-panel border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-2">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Report Suspicious or Cloned Label</h3>
          <p className="text-xs text-slate-400 mt-1">
            Flag fraudulent physical stickers, cloned QR codes, or mismatched specifications for {batteryId}.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-6 text-center space-y-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
            <div className="text-sm font-bold">Incident Logged Successfully</div>
            <p className="text-xs text-slate-300">
              The passport for {batteryId} has been flagged across all network nodes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Violation Category *</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as SuspiciousReportRequest['reason'])}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="CLONED_QR_CODE">Cloned / Copied QR Code Sticker</option>
                <option value="DUPLICATE_PHYSICAL_LABEL">Duplicate Label (Scanned elsewhere simultaneously)</option>
                <option value="INCONSISTENT_SPECIFICATIONS">Inconsistent Physical vs Canonical Data</option>
                <option value="PHYSICAL_TAMPERING">Physical Enclosure Seal Tampered</option>
                <option value="OTHER">Other Discrepancy</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Observation Location *</label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Frankfurt Depot Logistics Gate 2"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Claimed State of Health on Physical Sticker (Optional %)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={claimedSoh}
                onChange={e => setClaimedSoh(e.target.value)}
                placeholder="e.g. 96.0 (if sticker falsely claims new status)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Detailed Findings & Physical Inspection Report *</label>
              <textarea
                rows={3}
                required
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Describe why this label is suspected to be counterfeit, re-printed, or tampered."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold transition-all shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {submitting ? 'Transmitting Alert...' : 'Submit Fraud Alert'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
