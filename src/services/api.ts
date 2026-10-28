import {
  BatteryPassport,
  PassportSummary,
  CustodyEvent,
  AuditVerification,
  PublicVerification,
  QpiAIOptResponse,
  QpiAIQuantumResponse,
  UserRole,
  LifecycleStatus,
  CustodyTransfer,
  DispositionDecision,
  SuspiciousReportRequest
} from '../types';
import { batteryStore } from './store';
import { QpiAIOptEngine, QpiAIQuantumEngine } from './qpiai';

let currentRole: UserRole = 'MANUFACTURER';
let currentOrg = 'QuantumVolt Gigafactory';
let currentUserId = 'USR-MFG-01';
let currentName = 'Elena Rostova (Lead Cell Engineer)';
let authToken = (typeof window !== 'undefined' && typeof localStorage !== 'undefined')
  ? (localStorage.getItem('bp360_token') || 'demo-bearer-token-mfg')
  : 'demo-bearer-token-mfg';

const ROLE_PRESETS: Record<UserRole, { userId: string; org: string; name: string }> = {
  MANUFACTURER: {
    userId: 'USR-MFG-01',
    org: 'QuantumVolt Gigafactory',
    name: 'Elena Rostova (Lead Cell Engineer)'
  },
  OEM: {
    userId: 'USR-OEM-01',
    org: 'Apex Motors AG',
    name: 'Marcus Vance (Vehicle Assembly Director)'
  },
  FLEET_OPERATOR: {
    userId: 'USR-FLEET-01',
    org: 'Apex EV Mobility Fleet',
    name: 'Sophie Chen (Fleet Operations Manager)'
  },
  RECYCLER: {
    userId: 'USR-REC-01',
    org: 'EcoRecycle Metals Recovery',
    name: 'Dr. Klaus Weber (Circular Metallurgy Lead)'
  },
  REGULATOR_AUDITOR: {
    userId: 'USR-AUD-01',
    org: 'EU Metrology & Battery Authority',
    name: 'Jean-Luc Dubois (Chief Inspector)'
  },
  PUBLIC: {
    userId: 'USR-PUB-01',
    org: 'Public Citizen / Consumer',
    name: 'Anonymous Citizen'
  }
};

export const setAuthToken = (token: string) => {
  authToken = token;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('bp360_token', token);
  }
};

export const getAuthToken = () => authToken;

export const api = {
  // --- Auth & RBAC Personas ---
  async switchRole(role: UserRole, organization?: string) {
    const preset = ROLE_PRESETS[role] || ROLE_PRESETS.MANUFACTURER;
    currentRole = role;
    currentOrg = organization || preset.org;
    currentUserId = preset.userId;
    currentName = preset.name;
    const dummyToken = `jwt-${role.toLowerCase()}-${Date.now()}`;
    setAuthToken(dummyToken);

    return {
      access_token: dummyToken,
      token_type: 'bearer',
      user_id: currentUserId,
      username: role.toLowerCase(),
      role: currentRole,
      organization: currentOrg,
      full_name: currentName
    };
  },

  async getMe() {
    return {
      user_id: currentUserId,
      username: currentRole.toLowerCase(),
      role: currentRole,
      organization: currentOrg,
      full_name: currentName
    };
  },

  getCurrentRole(): UserRole {
    return currentRole;
  },

  getCurrentOrg(): string {
    return currentOrg;
  },

  // --- API Contract: GET /api/batteries ---
  async listBatteries(status?: string): Promise<PassportSummary[]> {
    await new Promise(r => setTimeout(r, 40));
    return batteryStore.listPassports(status);
  },
  // Backward compatibility alias
  async listPassports(status?: string): Promise<PassportSummary[]> {
    return this.listBatteries(status);
  },

  // --- API Contract: GET /api/batteries/{battery_id} ---
  async getBattery(id: string): Promise<BatteryPassport> {
    await new Promise(r => setTimeout(r, 40));
    const passport = batteryStore.getPassport(id);
    if (!passport) {
      throw new Error(`Battery Passport '${id}' was not found.`);
    }
    return passport;
  },
  // Backward compatibility alias
  async getPassport(id: string): Promise<BatteryPassport> {
    return this.getBattery(id);
  },

  // Mint / Create Genesis Passport
  async createPassport(payload: any): Promise<BatteryPassport> {
    await new Promise(r => setTimeout(r, 100));
    return batteryStore.createPassport(payload, {
      user_id: currentUserId,
      role: currentRole,
      organization: currentOrg,
      name: currentName
    });
  },

  // --- API Contract: Lifecycle State Transitions ---
  async transitionLifecycle(batteryId: string, targetState: LifecycleStatus, reason: string): Promise<BatteryPassport> {
    await new Promise(r => setTimeout(r, 60));
    return batteryStore.transitionLifecycle(batteryId, targetState, reason, {
      user_id: currentUserId,
      role: currentRole,
      organization: currentOrg,
      name: currentName
    });
  },

  // --- API Contract: GET /api/batteries/{battery_id}/events ---
  async getBatteryEvents(batteryId: string): Promise<CustodyEvent[]> {
    await new Promise(r => setTimeout(r, 40));
    return batteryStore.getCustodyEvents(batteryId);
  },
  // Backward compatibility alias
  async getCustodyEvents(batteryId: string): Promise<CustodyEvent[]> {
    return this.getBatteryEvents(batteryId);
  },

  async appendCustodyEvent(batteryId: string, event: any): Promise<CustodyEvent> {
    await new Promise(r => setTimeout(r, 60));
    return batteryStore.appendCustodyEvent(batteryId, event, {
      user_id: currentUserId,
      role: currentRole,
      organization: currentOrg
    });
  },

  async updateTelemetry(id: string, telemetry: any): Promise<BatteryPassport> {
    await new Promise(r => setTimeout(r, 60));
    return batteryStore.updateTelemetry(id, telemetry, {
      user_id: currentUserId,
      role: currentRole,
      organization: currentOrg
    });
  },

  // --- API Contract: POST /api/batteries/{battery_id}/verify ---
  async verifyBattery(batteryIdOrToken: string, claimedSpecs?: { soh?: number; chemistry?: string }): Promise<PublicVerification> {
    await new Promise(r => setTimeout(r, 80));
    return batteryStore.verifyPublicOrQr(batteryIdOrToken, claimedSpecs);
  },
  // Backward compatibility alias
  async verifyPublic(batteryId: string): Promise<PublicVerification> {
    return this.verifyBattery(batteryId);
  },

  async verifyAuditTrail(batteryId: string): Promise<AuditVerification> {
    await new Promise(r => setTimeout(r, 80));
    return batteryStore.verifyAuditTrail(batteryId);
  },

  // Flag suspicious / clone labels
  async reportSuspiciousLabel(report: SuspiciousReportRequest): Promise<{ success: boolean; message: string }> {
    await new Promise(r => setTimeout(r, 80));
    return batteryStore.reportSuspiciousLabel(report);
  },

  // --- API Contract: Custody Transfers ---
  // POST /api/custody/transfers
  async requestCustodyTransfer(data: {
    battery_id: string;
    receiver_organization: string;
    intended_receiver_role: UserRole;
    transfer_reason: string;
    notes?: string;
  }): Promise<CustodyTransfer> {
    await new Promise(r => setTimeout(r, 80));
    return batteryStore.requestCustodyTransfer(data, {
      user_id: currentUserId,
      role: currentRole,
      organization: currentOrg,
      name: currentName
    });
  },

  // POST /api/custody/transfers/{transfer_id}/accept
  async acceptCustodyTransfer(transferId: string): Promise<CustodyTransfer> {
    await new Promise(r => setTimeout(r, 80));
    return batteryStore.acceptCustodyTransfer(transferId, {
      user_id: currentUserId,
      role: currentRole,
      organization: currentOrg,
      name: currentName
    });
  },

  // POST /api/custody/transfers/{transfer_id}/reject
  async rejectCustodyTransfer(transferId: string, reason: string): Promise<CustodyTransfer> {
    await new Promise(r => setTimeout(r, 60));
    return batteryStore.rejectCustodyTransfer(transferId, reason, {
      user_id: currentUserId,
      role: currentRole,
      organization: currentOrg,
      name: currentName
    });
  },

  // GET custody transfers list
  async listTransfers(batteryId?: string): Promise<CustodyTransfer[]> {
    await new Promise(r => setTimeout(r, 40));
    return batteryStore.listTransfers(batteryId);
  },

  // --- API Contract: GET /api/decisions/{battery_id} ---
  async getDispositionDecision(batteryId: string): Promise<DispositionDecision> {
    await new Promise(r => setTimeout(r, 80));
    return batteryStore.getDispositionDecision(batteryId);
  },

  getQrCodeUrl(batteryId: string) {
    return `/verify/${batteryId}`;
  },

  // --- QpiAI Modules (Preserved) ---
  async runQpiAIOpt(batteryIds: string[]): Promise<QpiAIOptResponse> {
    await new Promise(r => setTimeout(r, 180));
    const telemetryData = batteryIds.map(id => {
      const p = batteryStore.getPassport(id);
      if (p) {
        return {
          battery_id: p.battery_id,
          state_of_health_pct: p.health_state.state_of_health_pct,
          cycle_count: p.health_state.cycle_count,
          total_co2_kg_per_kwh: p.carbon_footprint.total_co2_kg_per_kwh
        };
      }
      return {
        battery_id: id,
        state_of_health_pct: 75.0,
        cycle_count: 1000,
        total_co2_kg_per_kwh: 65.0
      };
    });

    return QpiAIOptEngine.solveAllocation(
      telemetryData,
      ['stationary_bess', 'cell_reconditioning', 'deep_recycling'],
      0.4,
      0.3,
      0.3
    );
  },

  async runQpiAIQuantum(
    batteryId: string,
    cathode: string,
    soh: number,
    cycles: number
  ): Promise<QpiAIQuantumResponse> {
    await new Promise(r => setTimeout(r, 200));
    return QpiAIQuantumEngine.simulateCathodeDegradation(
      batteryId,
      cathode,
      soh,
      cycles,
      'QpiAI-QSV-Local',
      1024
    );
  },

  // --- Testing & Auditor Utilities ---
  tamperBlockForAudit(batteryId: string, index: number): boolean {
    return batteryStore.tamperBlock(batteryId, index);
  },

  resetDefaults() {
    batteryStore.resetToDefaults();
  }
};
