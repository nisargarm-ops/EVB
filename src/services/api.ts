import { 
  BatteryPassport, 
  PassportSummary, 
  CustodyEvent, 
  CustodyTransfer,
  DispositionDecision,
  AuditVerification, 
  PublicVerification, 
  QpiAIOptResponse, 
  QpiAIQuantumResponse,
  UserRole,
  UserProfile,
  Organization,
  DatabaseStatus
} from '../types';
import { supabase, isSupabaseConfigured, getActiveSupabaseConfig, updateSupabaseCredentials } from './supabaseClient';
import { batteryRepository } from './store';
import { QpiAIOptEngine, QpiAIQuantumEngine } from './qpiai';

let currentRole: UserRole = (localStorage.getItem('bp360_active_role') as UserRole) || 'MANUFACTURER';
let currentOrg: string = localStorage.getItem('bp360_active_org') || 'QuantumVolt Gigafactory';
let authToken: string = localStorage.getItem('bp360_token') || 'mock-jwt-token-bp360';
let activeUser: UserProfile | null = null;

const ROLE_DEFAULT_ORGS: Record<UserRole, string> = {
  MANUFACTURER: 'QuantumVolt Gigafactory',
  OEM: 'Apex Motors AG',
  FLEET_OPERATOR: 'Apex EV Mobility Fleet',
  SERVICE_CENTER: 'Berlin Battery Care',
  REMANUFACTURER: 'Nordic Remanufacturing Hub',
  RECYCLER: 'EcoRecycle Metals Recovery',
  REGULATOR_AUDITOR: 'EU Metrology Authority',
  ADMINISTRATOR: 'BatteryPass 360 Governance',
  PUBLIC: 'Anonymous Citizen',
};

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('bp360_token', token);
};

export const getAuthToken = () => authToken;

export const api = {
  // --------------------------------------------------------------------------
  // Database Status & Diagnostics
  // --------------------------------------------------------------------------
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    const config = getActiveSupabaseConfig();
    if (!config.isConfigured || !supabase) {
      return {
        isConfigured: false,
        isConnected: false,
        provider: 'MEMORY_FALLBACK',
        message: 'Supabase credentials not configured in environment (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY). Running on local thread-safe repository with verified EU regulation seed records.',
        endpointUrl: config.url || undefined,
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      // Probe live connectivity
      const { error } = await supabase.from('batteries').select('count', { count: 'exact', head: true });
      if (error) {
        return {
          isConfigured: true,
          isConnected: false,
          provider: 'SUPABASE',
          message: `Supabase reached with error: ${error.message}. Check Row Level Security or API keys.`,
          endpointUrl: config.url,
          lastChecked: new Date().toISOString(),
        };
      }
      return {
        isConfigured: true,
        isConnected: true,
        provider: 'SUPABASE',
        message: 'Successfully connected to live Supabase PostgreSQL project with RLS enabled.',
        endpointUrl: config.url,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        isConnected: false,
        provider: 'SUPABASE',
        message: `Connection failed: ${err.message || 'Network error'}`,
        endpointUrl: config.url,
        lastChecked: new Date().toISOString(),
      };
    }
  },

  setSupabaseCredentials(url: string, key: string) {
    updateSupabaseCredentials(url, key);
  },

  // --------------------------------------------------------------------------
  // Supabase Authentication
  // --------------------------------------------------------------------------
  async signUp(email: string, password: string, fullName: string, role: UserRole, organizationName?: string) {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            organization_name: organizationName || ROLE_DEFAULT_ORGS[role],
          },
        },
      });
      if (error) throw new Error(error.message);
      
      if (data.user) {
        activeUser = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName,
          role,
          organization_id: `org-${role.toLowerCase()}`,
          organization_name: organizationName || ROLE_DEFAULT_ORGS[role],
        };
        currentRole = role;
        currentOrg = organizationName || ROLE_DEFAULT_ORGS[role];
        localStorage.setItem('bp360_active_role', currentRole);
        localStorage.setItem('bp360_active_org', currentOrg);
      }
      return data;
    }

    // Local / unconfigured fallback simulation
    const mockId = `usr-${Date.now()}`;
    activeUser = {
      id: mockId,
      email,
      full_name: fullName,
      role,
      organization_id: `org-${role.toLowerCase()}`,
      organization_name: organizationName || ROLE_DEFAULT_ORGS[role],
    };
    currentRole = role;
    currentOrg = organizationName || ROLE_DEFAULT_ORGS[role];
    localStorage.setItem('bp360_active_role', currentRole);
    localStorage.setItem('bp360_active_org', currentOrg);
    return { user: activeUser, session: { access_token: `jwt-${role.toLowerCase()}-${Date.now()}` } };
  },

  async signIn(email: string, password: string) {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);

      if (data.user) {
        const metadata = data.user.user_metadata || {};
        const role = (metadata.role as UserRole) || 'PUBLIC';
        const org = metadata.organization_name || ROLE_DEFAULT_ORGS[role] || 'Authorized Enterprise';

        activeUser = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: metadata.full_name || email.split('@')[0],
          role,
          organization_id: `org-${role.toLowerCase()}`,
          organization_name: org,
        };
        currentRole = role;
        currentOrg = org;
        localStorage.setItem('bp360_active_role', currentRole);
        localStorage.setItem('bp360_active_org', currentOrg);
        if (data.session) setAuthToken(data.session.access_token);
      }
      return data;
    }

    // Local fallback sign in
    const role: UserRole = email.includes('mfg') ? 'MANUFACTURER' : email.includes('recy') ? 'RECYCLER' : email.includes('audit') ? 'REGULATOR_AUDITOR' : 'FLEET_OPERATOR';
    const org = ROLE_DEFAULT_ORGS[role];
    activeUser = {
      id: `usr-${role.toLowerCase()}`,
      email,
      full_name: email.split('@')[0],
      role,
      organization_id: `org-${role.toLowerCase()}`,
      organization_name: org,
    };
    currentRole = role;
    currentOrg = org;
    localStorage.setItem('bp360_active_role', currentRole);
    localStorage.setItem('bp360_active_org', currentOrg);
    const token = `jwt-${role.toLowerCase()}-${Date.now()}`;
    setAuthToken(token);
    return { user: activeUser, session: { access_token: token } };
  },

  async signOut() {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    activeUser = null;
    currentRole = 'PUBLIC';
    currentOrg = 'Anonymous Visitor';
    localStorage.removeItem('bp360_token');
    localStorage.setItem('bp360_active_role', 'PUBLIC');
    localStorage.setItem('bp360_active_org', 'Anonymous Visitor');
  },

  async resetPassword(email: string) {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return { message: 'Password recovery email dispatched (simulated)' };
  },

  async updatePassword(newPassword: string) {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return { message: 'Password updated successfully' };
  },

  async switchRole(role: UserRole, organization?: string) {
    currentRole = role;
    currentOrg = organization || ROLE_DEFAULT_ORGS[role] || 'Unknown Organization';
    localStorage.setItem('bp360_active_role', currentRole);
    localStorage.setItem('bp360_active_org', currentOrg);
    const mockToken = `jwt-${role.toLowerCase()}-${Date.now()}`;
    setAuthToken(mockToken);
    activeUser = {
      id: `usr-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@batterypass360.eu`,
      full_name: `${role.replace(/_/g, ' ')} Operator`,
      role,
      organization_id: `org-${role.toLowerCase()}`,
      organization_name: currentOrg,
    };
    return {
      access_token: mockToken,
      token_type: 'bearer',
      role: currentRole,
      organization: currentOrg,
    };
  },

  async getMe(): Promise<UserProfile> {
    if (activeUser) return activeUser;
    return {
      id: `usr-${currentRole.toLowerCase()}`,
      email: `${currentRole.toLowerCase()}@batterypass360.eu`,
      full_name: `${currentRole.replace(/_/g, ' ')} Operator`,
      role: currentRole,
      organization_id: `org-${currentRole.toLowerCase()}`,
      organization_name: currentOrg,
    };
  },

  // --------------------------------------------------------------------------
  // Passports & Batteries
  // --------------------------------------------------------------------------
  async listPassports(statusFilter?: string): Promise<PassportSummary[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        let query = supabase.from('batteries').select('*');
        if (statusFilter && statusFilter !== 'ALL') {
          query = query.eq('status', statusFilter);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((b: any) => ({
            battery_id: b.battery_id,
            battery_did: b.battery_did,
            serial_number: b.serial_number,
            manufacturer_name: b.manufacturer_name,
            chemistry: b.chemistry,
            status: b.status,
            current_custodian: b.current_custodian,
            state_of_health_pct: b.health_state?.state_of_health_pct ?? 100,
            rated_capacity_kwh: b.technical_specs?.rated_capacity_kwh ?? 80,
            updated_at: b.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase query failed, falling back to repository', err);
      }
    }
    return await batteryRepository.listPassports(statusFilter);
  },

  async getPassport(id: string): Promise<BatteryPassport> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('batteries')
          .select('*')
          .or(`battery_id.eq.${id},battery_did.eq.${id}`)
          .single();
        if (!error && data) return data as BatteryPassport;
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to repository', err);
      }
    }
    const passport = await batteryRepository.getPassport(id);
    if (!passport) throw new Error(`Battery passport '${id}' not found`);
    return passport;
  },

  async createPassport(payload: any): Promise<BatteryPassport> {
    // If Supabase is connected, persist to Supabase
    const created = await batteryRepository.createPassport(payload);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('batteries').insert(created);
        const events = await batteryRepository.getCustodyEvents(created.battery_id);
        if (events.length > 0) {
          await supabase.from('lifecycle_events').insert({
            battery_id: created.battery_id,
            event_number: 0,
            event_type: 'MANUFACTURED',
            timestamp: events[0].timestamp,
            actor_role: events[0].actor_role,
            actor_organization_id: '11111111-1111-1111-1111-111111111111',
            location: events[0].location,
            payload: events[0].payload,
            prev_hash: events[0].prev_hash,
            hash: events[0].hash,
          });
        }
      } catch (err) {
        console.warn('Failed to insert into live Supabase', err);
      }
    }

    return created;
  },

  async updateTelemetry(id: string, telemetry: any): Promise<BatteryPassport> {
    const updated = await batteryRepository.updateTelemetry(id, telemetry, currentOrg);
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from('batteries')
          .update({
            health_state: updated.health_state,
            status: updated.status,
            updated_at: updated.updated_at,
          })
          .eq('battery_id', updated.battery_id);
      } catch (err) {
        console.warn('Supabase telemetry update warning', err);
      }
    }
    return updated;
  },

  // --------------------------------------------------------------------------
  // Custody & Transfers
  // --------------------------------------------------------------------------
  async getCustodyEvents(batteryId: string): Promise<CustodyEvent[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('lifecycle_events')
          .select('*')
          .eq('battery_id', batteryId)
          .order('timestamp', { ascending: true });
        if (!error && data && data.length > 0) return data as CustodyEvent[];
      } catch (err) {
        console.warn('Supabase custody fetch failed', err);
      }
    }
    return await batteryRepository.getCustodyEvents(batteryId);
  },

  async appendCustodyEvent(batteryId: string, event: any): Promise<CustodyEvent> {
    return await batteryRepository.appendCustodyEvent(batteryId, event);
  },

  async listTransfers(): Promise<CustodyTransfer[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('custody_transfers')
          .select('*')
          .order('initiated_at', { ascending: false });
        if (!error && data && data.length > 0) return data as CustodyTransfer[];
      } catch (err) {
        console.warn('Supabase transfers fetch failed', err);
      }
    }
    return await batteryRepository.listCustodyTransfers();
  },

  async createTransfer(payload: {
    battery_id: string;
    receiver_org_id: string;
    receiver_org_name: string;
    transfer_type: string;
    notes?: string;
  }): Promise<CustodyTransfer> {
    const transfer = await batteryRepository.createCustodyTransfer({
      ...payload,
      sender_org_name: currentOrg,
    });
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('custody_transfers').insert(transfer);
      } catch (err) {
        console.warn('Supabase transfer insert warning', err);
      }
    }
    return transfer;
  },

  async acceptTransfer(transferId: string, notes?: string): Promise<CustodyTransfer> {
    const updated = await batteryRepository.acceptCustodyTransfer(transferId, notes);
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from('custody_transfers')
          .update({
            state: 'ACCEPTED',
            responded_at: updated.responded_at,
            notes: updated.notes,
          })
          .eq('id', transferId);
      } catch (err) {
        console.warn('Supabase accept transfer warning', err);
      }
    }
    return updated;
  },

  async rejectTransfer(transferId: string, reason: string): Promise<CustodyTransfer> {
    const updated = await batteryRepository.rejectCustodyTransfer(transferId, reason);
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from('custody_transfers')
          .update({
            state: 'REJECTED',
            responded_at: updated.responded_at,
            rejection_reason: updated.rejection_reason,
          })
          .eq('id', transferId);
      } catch (err) {
        console.warn('Supabase reject transfer warning', err);
      }
    }
    return updated;
  },

  // --------------------------------------------------------------------------
  // Verification & Tamper Evidence
  // --------------------------------------------------------------------------
  async verifyPublic(batteryId: string): Promise<PublicVerification> {
    return await batteryRepository.verifyPublic(batteryId);
  },

  async verifyAuditTrail(batteryId: string): Promise<AuditVerification> {
    return await batteryRepository.verifyAuditTrail(batteryId);
  },

  getQrCodeUrl(batteryId: string) {
    return `/verify/${batteryId}`;
  },

  // --------------------------------------------------------------------------
  // Disposition & Second-Life
  // --------------------------------------------------------------------------
  async getDispositionDecision(batteryId: string): Promise<DispositionDecision> {
    return await batteryRepository.getDispositionDecision(batteryId);
  },

  // --------------------------------------------------------------------------
  // Organizations
  // --------------------------------------------------------------------------
  listOrganizations(): Organization[] {
    return batteryRepository.listOrganizations();
  },

  // --------------------------------------------------------------------------
  // QpiAI Engines & Execution Records
  // --------------------------------------------------------------------------
  async runQpiAIOpt(batteryIds: string[]): Promise<QpiAIOptResponse> {
    const batteryData: Array<{
      battery_id: string;
      state_of_health_pct: number;
      cycle_count: number;
      total_co2_kg_per_kwh: number;
    }> = [];

    for (const id of batteryIds) {
      const p = await batteryRepository.getPassport(id);
      if (p) {
        batteryData.push({
          battery_id: p.battery_id,
          state_of_health_pct: p.health_state.state_of_health_pct,
          cycle_count: p.health_state.cycle_count,
          total_co2_kg_per_kwh: p.carbon_footprint.total_co2_kg_per_kwh,
        });
      } else {
        batteryData.push({
          battery_id: id,
          state_of_health_pct: 75.0,
          cycle_count: 1000,
          total_co2_kg_per_kwh: 65.0,
        });
      }
    }

    const res = await QpiAIOptEngine.solveAllocation(batteryData);

    // Persist execution record if Supabase is connected
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('qpiai_execution_records').insert({
          engine_type: 'QPIAI_OPT',
          battery_id: batteryIds[0] || null,
          status: res.status,
          backend: 'QpiAI-Opt-Cloud',
          job_id: res.job_id || null,
          parameters: { battery_ids: batteryIds, num_variables: res.num_variables },
          results: { qubo_sample: res.qubo_sample_matrix, objective: res.objective_value },
          execution_time_seconds: res.execution_time_seconds || null,
        });
      } catch (err) {
        console.warn('Failed to log QpiAI execution record to Supabase', err);
      }
    }

    return res;
  },

  async runQpiAIQuantum(batteryId: string, cathode: string, soh: number, cycles: number): Promise<QpiAIQuantumResponse> {
    const res = QpiAIQuantumEngine.simulateCathodeDegradation(batteryId, cathode, soh, cycles);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('qpiai_execution_records').insert({
          engine_type: 'QPIAI_QUANTUM',
          battery_id: batteryId,
          status: res.status,
          backend: res.backend_used,
          parameters: { cathode, soh, cycles, num_qubits: res.num_qubits, depth: res.circuit_depth },
          results: { probabilities: res.measured_probabilities, energy: res.estimated_ground_state_energy_hartree },
          error_message: res.status === 'AUTH_REQUIRED' ? res.message : null,
        });
      } catch (err) {
        console.warn('Failed to log Quantum execution record to Supabase', err);
      }
    }

    return res;
  },
};
