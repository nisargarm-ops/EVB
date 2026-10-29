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
        return { icon: Factory, color: 'text-[#14532D] bg-[#ECFDF3] border-[#D1FAE5]' };
      case 'OEM_ASSEMBLED':
        return { icon: Award, color: 'text-[#1E40AF] bg-[#EFF6FF] border-[#DBEAFE]' };
      case 'REGISTERED_FLEET':
      case 'TELEMETRY_UPDATED':
      case 'MAINTENANCE_LOGGED':
      case 'TRANSFERRED_CUSTODY':
        return { icon: Truck, color: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]' };
      case 'SECOND_LIFE_ASSIGNED':
      case 'RECYCLED':
      case 'DECOMMISSIONED':
        return { icon: Recycle, color: 'text-[#059669] bg-[#ECFDF3] border-[#D1FAE5]' };
      default:
        return { icon: CheckCircle, color: 'text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0]' };
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
      <h3 className="text-base font-bold text-[#14532D] mb-6">Chain of Custody Timeline</h3>
      
      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E7EB]">
        {events.map((evt) => {
          const config = getEventIcon(evt.event_type);
          const Icon = config.icon;

          return (
            <div key={evt.event_id} className="relative group">
              {/* Node Indicator */}
              <div className={`absolute -left-6 top-1 p-1 rounded-full border bg-white shadow-sm ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Event Card */}
              <div className="p-4 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] hover:border-[#14532D] transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-[#1F2937]">{evt.event_type.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[#64748B]">
                      {evt.actor_role}
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B] font-mono">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-[#475569] mb-2">
                  <span className="text-[#64748B]">Custodian Organization: </span>
                  <span className="font-semibold text-[#1F2937]">{evt.actor_organization}</span>
                  <span className="text-[#64748B]"> at </span>
                  <span className="text-[#1F2937] font-medium">{evt.location}</span>
                </div>

                {/* Event Payload */}
                {Object.keys(evt.payload).length > 0 && (
                  <div className="p-2.5 rounded-lg bg-white border border-[#E5E7EB] text-xs font-mono">
                    <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Payload Metadata</div>
                    <pre className="text-[11px] text-[#14532D] whitespace-pre-wrap break-all font-mono">
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
