import {
  BatteryPassport,
  PassportSummary,
  CustodyEvent,
  AuditVerification,
  PublicVerification,
  QpiAIOptResponse,
  QpiAIQuantumResponse,
  IntegrationsStatusResponse,
  OptimizationRunResponse,
  QuantumRunResponse,
  PredefinedQuantumExperiment,
  SupportedQpiAIBackend,
  DispositionPathway,
  UserRole,
} from '../types';

const API_BASE = '/api/v1';

let authToken = localStorage.getItem('bp360_token') || '';

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('bp360_token', token);
};

export const getAuthToken = () => authToken;

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

export const api = {
  // Auth
  async switchRole(role: UserRole, organization?: string) {
    const res = await fetch(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, organization }),
    });
    if (!res.ok) throw new Error('Role switch failed');
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  // Passports
  async listPassports(status?: string): Promise<PassportSummary[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE}/passports${query}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch battery passports');
    return res.json();
  },

  async getPassport(id: string): Promise<BatteryPassport> {
    const res = await fetch(`${API_BASE}/passports/${encodeURIComponent(id)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to load passport ${id}`);
    return res.json();
  },

  async createPassport(payload: any): Promise<BatteryPassport> {
    const res = await fetch(`${API_BASE}/passports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create battery passport');
    }
    return res.json();
  },

  async updateTelemetry(id: string, telemetry: any): Promise<BatteryPassport> {
    const res = await fetch(`${API_BASE}/passports/${encodeURIComponent(id)}/telemetry`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(telemetry),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update telemetry');
    }
    return res.json();
  },

  // Custody
  async getCustodyEvents(batteryId: string): Promise<CustodyEvent[]> {
    const res = await fetch(`${API_BASE}/custody/${encodeURIComponent(batteryId)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load custody events');
    return res.json();
  },

  async appendCustodyEvent(batteryId: string, event: any): Promise<CustodyEvent> {
    const res = await fetch(`${API_BASE}/custody/${encodeURIComponent(batteryId)}/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to append custody event');
    }
    return res.json();
  },

  // Verification & Tamper Evidence
  async verifyPublic(batteryId: string): Promise<PublicVerification> {
    const res = await fetch(`${API_BASE}/verify/${encodeURIComponent(batteryId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Battery passport verification failed');
    }
    return res.json();
  },

  async verifyAuditTrail(batteryId: string): Promise<AuditVerification> {
    const res = await fetch(`${API_BASE}/verify/${encodeURIComponent(batteryId)}/audit-trail`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Audit trail verification request failed');
    }
    return res.json();
  },

  getQrCodeUrl(batteryId: string) {
    return `${API_BASE}/verify/${encodeURIComponent(batteryId)}/qr`;
  },

  // Dedicated QpiAI Contract Endpoints (/api/*)
  async getIntegrationsStatus(): Promise<IntegrationsStatusResponse> {
    const res = await fetch('/api/integrations/status', {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch QpiAI integration status');
    }
    return res.json();
  },

  async runDispositionOptimization(payload: {
    battery_ids: string[];
    allowed_pathways?: DispositionPathway[];
    pathway_capacities?: Partial<Record<DispositionPathway, number>>;
    inspection_flags_by_battery?: Record<string, { thermal_event_detected?: boolean }>;
    allow_demo_fallback?: boolean;
  }): Promise<OptimizationRunResponse> {
    const res = await fetch('/api/optimization/run', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Optimization execution failed');
    }
    return res.json();
  },

  async runQuantumExperiment(payload: {
    experiment_type: PredefinedQuantumExperiment;
    battery_ids?: string[];
    backend?: SupportedQpiAIBackend;
    shots?: number;
    allow_demo_simulation?: boolean;
  }): Promise<QuantumRunResponse> {
    const res = await fetch('/api/quantum/run', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Quantum experiment request failed');
    }
    return res.json();
  },

  // Legacy QpiAI Endpoints (preserved for backward compatibility)
  async runQpiAIOpt(batteryIds: string[]): Promise<QpiAIOptResponse> {
    const res = await fetch(`${API_BASE}/qpiai/opt/allocate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        battery_ids: batteryIds,
        target_destinations: ['stationary_bess', 'cell_reconditioning', 'deep_recycling'],
        carbon_penalty_weight: 0.4,
        logistics_distance_weight: 0.3,
        degradation_cost_weight: 0.3,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'QpiAI Opt execution failed');
    }
    return res.json();
  },

  async runQpiAIQuantum(
    batteryId: string,
    cathode: string,
    soh: number,
    cycles: number
  ): Promise<QpiAIQuantumResponse> {
    const res = await fetch(`${API_BASE}/qpiai/quantum/simulate-cathode`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        battery_id: batteryId,
        cathode_material: cathode,
        state_of_health_pct: soh,
        cycle_count: cycles,
        backend: 'QpiAI-QSV-Local',
        shots: 1024,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'QpiAI Quantum simulation failed');
    }
    return res.json();
  },
};
