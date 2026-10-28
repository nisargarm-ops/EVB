import React from 'react';
import { Factory, Award, Truck, Recycle, CheckCircle } from 'lucide-react';
import { CustodyEvent } from '../types';

interface CustodyTimelineProps {
  events: CustodyEvent[];
}

export const CustodyTimeline: React.FC<CustodyTimelineProps> = ({ events }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'MANUFACTURED':
        return {
          icon: Factory,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        };
      case 'OEM_ASSEMBLED':
        return {
          icon: Award,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        };
      case 'REGISTERED_FLEET':
      case 'TELEMETRY_UPDATED':
      case 'MAINTENANCE_LOGGED':
      case 'TRANSFERRED_CUSTODY':
        return {
          icon: Truck,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        };
      case 'SECOND_LIFE_ASSIGNED':
      case 'RECYCLED':
      case 'DECOMMISSIONED':
        return {
          icon: Recycle,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        };
      default:
        return {
          icon: CheckCircle,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800">
      <h3 className="text-base font-bold text-white mb-6">Chain of Custody Timeline</h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {events.map(evt => {
          const config = getEventIcon(evt.event_type);
          const Icon = config.icon;

          return (
            <div key={evt.event_id} className="relative group">
              {/* Node Indicator */}
              <div
                className={`absolute -left-6 top-1 p-1 rounded-full border bg-slate-950 ${config.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Event Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-100">
                      {evt.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {evt.actor_role}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mb-2">
                  <span className="text-slate-500">Custodian Organization: </span>
                  <span className="font-semibold text-slate-200">{evt.actor_organization}</span>
                  <span className="text-slate-500"> at </span>
                  <span className="text-slate-400">{evt.location}</span>
                </div>

                {/* Event Payload */}
                {Object.keys(evt.payload || {}).length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-400">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Payload Metadata
                    </div>
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
