import React from 'react';
import { Factory, Award, Truck, Recycle, CheckCircle, ShieldCheck, FileText, AlertTriangle } from 'lucide-react';
import { CustodyEvent } from '../types';

interface CustodyTimelineProps {
  events: CustodyEvent[];
}

export const CustodyTimeline: React.FC<CustodyTimelineProps> = ({ events }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'MANUFACTURED':
        return { icon: Factory, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'OEM_ASSEMBLED':
        return { icon: Award, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'REGISTERED_FLEET':
      case 'TELEMETRY_UPDATED':
      case 'MAINTENANCE_LOGGED':
      case 'TRANSFERRED_CUSTODY':
        return { icon: Truck, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'SECOND_LIFE_ASSIGNED':
      case 'RECYCLED':
      case 'DECOMMISSIONED':
        return { icon: Recycle, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      default:
        return { icon: CheckCircle, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white">Chain of Custody & Lifecycle Timeline</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic SHA-256 Hash-Linked Event Chain (Audit Log). Immutable ledger tracking every physical and legal handover.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
          {events.length} Historical Blocks
        </span>
      </div>
      
      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800 pt-2">
        {events.map((evt, idx) => {
          const config = getEventIcon(evt.event_type);
          const Icon = config.icon;
          const isGenesis = idx === 0;

          return (
            <div key={evt.event_id} className="relative group">
              {/* Node Indicator */}
              <div className={`absolute -left-6 top-1 p-1 rounded-full border bg-slate-950 ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Event Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-100">{evt.event_type.replace('_', ' ')}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {evt.actor_role}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>{evt.verification_status || 'VERIFIED'}</span>
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="text-slate-500">Custodian Organization: </span>
                  <span className="font-semibold text-slate-200">{evt.actor_organization}</span>
                  <span className="text-slate-500"> at </span>
                  <span className="text-slate-400">{evt.location}</span>
                </div>

                {/* Evidence reference & Event ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="truncate">
                    <span className="text-slate-500">Block ID: </span>
                    <span className="text-slate-300">{evt.event_id}</span>
                  </div>
                  <div className="truncate flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-500">Audit Evidence: </span>
                    <span className="text-cyan-300 truncate">{evt.evidence_ref || (isGenesis ? 'FACTORY-BIRTH-CERT' : 'CUSTODY-MANIFEST')}</span>
                  </div>
                </div>

                {/* Event Payload */}
                {Object.keys(evt.payload).length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800/90 text-xs font-mono text-slate-400">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Payload Metadata</div>
                    <pre className="text-[11px] text-emerald-400/90 whitespace-pre-wrap break-all">
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
