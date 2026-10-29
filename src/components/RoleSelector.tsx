import React, { useState } from 'react';
import { 
  UserCheck, 
  ChevronDown, 
  Building, 
  ShieldAlert, 
  Award, 
  Recycle, 
  Truck, 
  Factory, 
  ShieldCheck, 
  LogOut, 
  CheckCircle2, 
  Lock
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface RoleSelectorProps {
  activeRole: UserRole;
  onRoleChange: (role: UserRole, organization?: string) => void;
  activeOrg: string;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
}

const ROLE_METADATA: Record<UserRole, { label: string; icon: any; color: string; badgeBg: string }> = {
  MANUFACTURER: { label: 'Cell Manufacturer', icon: Factory, color: 'text-[#14532D] dark:text-[#34D399]', badgeBg: 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#D1FAE5] dark:border-[#065F46]' },
  OEM: { label: 'Vehicle OEM', icon: Award, color: 'text-[#1E40AF] dark:text-[#60A5FA]', badgeBg: 'bg-[#EFF6FF] dark:bg-[#1E3A8A]/40 border-[#DBEAFE] dark:border-[#1E40AF]' },
  FLEET_OPERATOR: { label: 'Fleet Operator', icon: Truck, color: 'text-[#D97706] dark:text-[#FBBF24]', badgeBg: 'bg-[#FEF3C7] dark:bg-[#78350F]/40 border-[#FDE68A] dark:border-[#B45309]' },
  SERVICE_CENTER: { label: 'Service Center', icon: Factory, color: 'text-[#047857] dark:text-[#34D399]', badgeBg: 'bg-[#ECFDF5] dark:bg-[#064E3B]/40 border-[#A7F3D0] dark:border-[#065F46]' },
  REMANUFACTURER: { label: 'Remanufacturer', icon: Factory, color: 'text-[#0284C7] dark:text-[#38BDF8]', badgeBg: 'bg-[#F0F9FF] dark:bg-[#0C4A6E]/40 border-[#BAE6FD] dark:border-[#0284C7]' },
  RECYCLER: { label: 'Circularity Recycler', icon: Recycle, color: 'text-[#059669] dark:text-[#34D399]', badgeBg: 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#D1FAE5] dark:border-[#065F46]' },
  REGULATOR_AUDITOR: { label: 'Regulator / Auditor', icon: ShieldAlert, color: 'text-[#7C2D12] dark:text-[#FB923C]', badgeBg: 'bg-[#FFEDD5] dark:bg-[#7C2D12]/40 border-[#FED7AA] dark:border-[#9A3412]' },
  ADMINISTRATOR: { label: 'System Administrator', icon: ShieldCheck, color: 'text-[#14532D] dark:text-[#34D399]', badgeBg: 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#D1FAE5] dark:border-[#065F46]' },
  PUBLIC: { label: 'Public Consumer', icon: Building, color: 'text-[#475569] dark:text-[#94A3B8]', badgeBg: 'bg-[#F1F5F9] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155]' },
};

export const RoleSelector: React.FC<RoleSelectorProps> = ({ 
  activeRole, 
  onRoleChange, 
  activeOrg, 
  currentUser,
  onLogout 
}) => {
  const [open, setOpen] = useState(false);
  const meta = ROLE_METADATA[activeRole] || ROLE_METADATA.MANUFACTURER;
  const IconComponent = meta.icon;

  // Filter legitimate memberships assigned to this user
  const memberships = currentUser?.authorized_memberships || [
    {
      organization_id: currentUser?.organization_id || 'org-primary',
      organization_name: activeOrg || currentUser?.organization_name || meta.label,
      role: activeRole,
    },
  ];

  const hasMultipleOrgs = memberships.length > 1;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-3 bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D] dark:hover:border-[#34D399] px-3 py-1.5 rounded-xl transition-all text-left shadow-sm"
        title="Verified Enterprise Identity"
      >
        <div className={`p-1.5 rounded-lg border ${meta.badgeBg}`}>
          <IconComponent className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] flex items-center space-x-1.5">
            <span>{meta.label}</span>
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">({activeRole})</span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate max-w-[160px]">
            {activeOrg || currentUser?.organization_name}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] ml-1" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-2xl shadow-xl p-3 z-50 animate-fadeIn">
            
            {/* Header: User Profile Summary */}
            <div className="p-3 bg-[#F8FAF7] dark:bg-[#16261D] rounded-xl border border-[#E5E7EB] dark:border-[#1E382B] mb-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] truncate">
                  {currentUser?.full_name || 'Enterprise Operator'}
                </span>
                <span className="flex items-center space-x-1 text-[10px] font-semibold text-[#059669] dark:text-[#34D399] bg-[#ECFDF3] dark:bg-[#064E3B]/40 px-2 py-0.5 rounded-full border border-[#D1FAE5] dark:border-[#065F46]">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                  <span>Verified Identity</span>
                </span>
              </div>
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate font-mono">
                {currentUser?.email}
              </div>
              <div className="text-[11px] font-medium text-[#14532D] dark:text-[#34D399] truncate pt-0.5">
                {activeOrg}
              </div>
            </div>

            {/* Multi-Organization Switcher OR Locked Single Org State */}
            {hasMultipleOrgs ? (
              <div className="space-y-1 mb-2">
                <div className="px-2 py-1 text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                  Authorized Enterprise Memberships
                </div>
                {memberships.map((m, idx) => {
                  const mMeta = ROLE_METADATA[m.role] || ROLE_METADATA.MANUFACTURER;
                  const MIcon = mMeta.icon;
                  const isCurrent = m.organization_name === activeOrg && m.role === activeRole;

                  return (
                    <button
                      key={`${m.organization_id}-${idx}`}
                      onClick={() => {
                        onRoleChange(m.role, m.organization_name);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 p-2 rounded-xl text-left transition-all ${
                        isCurrent
                          ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border border-[#D1FAE5] dark:border-[#065F46] text-[#14532D] dark:text-[#34D399] font-semibold'
                          : 'hover:bg-[#F8FAF7] dark:hover:bg-[#16261D] text-[#1F2937] dark:text-[#F1F5F9]'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg border ${mMeta.badgeBg}`}>
                        <MIcon className={`w-3.5 h-3.5 ${mMeta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{m.organization_name}</div>
                        <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                          {mMeta.label} ({m.role})
                        </div>
                      </div>
                      {isCurrent && <UserCheck className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-2.5 mb-2 bg-[#F8FAF7] dark:bg-[#16261D]/60 rounded-xl border border-[#E5E7EB] dark:border-[#1E382B] flex items-start space-x-2.5">
                <Lock className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                  <span className="font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-0.5">Role Locked by Governance</span>
                  Role and organization membership are loaded from trusted database records under EU 2023/1542.
                </div>
              </div>
            )}

            {/* Logout / Switch Account Action */}
            {onLogout && (
              <div className="pt-1 border-t border-[#E5E7EB] dark:border-[#1E382B]">
                <button
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D]/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Switch Account</span>
                </button>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};
