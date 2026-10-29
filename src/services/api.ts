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
  DatabaseStatus,
} from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getActiveSupabaseConfig,
  initSupabaseClient,
  getSupabase,
} from './supabaseClient';
import { batteryRepository } from './store';
import { QpiAIOptEngine, QpiAIQuantumEngine } from './qpiai';
import { safeStorage } from './safeStorage';

const API_BASE = '/api/v1';
const isBrowserRuntime = typeof window !== 'undefined' && typeof window.fetch === 'function';

let currentRole: UserRole =
  (safeStorage.getItem('bp360_active_role') as UserRole) || 'MANUFACTURER';
let currentOrg: string =
  safeStorage.getItem('bp360_active_org') || 'QuantumVolt Gigafactory';
let authToken: string = safeStorage.getItem('bp360_token') || '';
let activeUser: UserProfile | null = null;
let cachedOrganizations: Organization[] = batteryRepository.listOrganizations();

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
  if (token) {
    safeStorage.setItem('bp360_token', token);
  } else {
    safeStorage.removeItem('bp360_token');
  }
};

export const getAuthToken = () => authToken;

function isValidJwtFormat(token: string): boolean {
  return Boolean(
    token &&
      token.split('.').length === 3 &&
      !token.startsWith('jwt-') &&
      !token.startsWith('token-session-') &&
      token !== 'mock-jwt-token-bp360'
  );
}

let tokenBootstrapPromise: Promise<string> | null = null;

async function ensureBackendToken(): Promise<string> {
  if (!isBrowserRuntime) return authToken;

  // Prefer active Supabase Auth session token when signed in
  if (supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token);
        return data.session.access_token;
      }
    } catch {
      // Fall through to server persona token
    }
  }

  if (isValidJwtFormat(authToken)) {
    return authToken;
  }

  if (!tokenBootstrapPromise) {
    tokenBootstrapPromise = (async () => {
      try {
        const safeBootstrapRole: UserRole =
          currentRole === 'ADMINISTRATOR' ? 'MANUFACTURER' : currentRole;
        const res = await fetch(`${API_BASE}/auth/switch-role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ role: safeBootstrapRole, organization: currentOrg }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.access_token) {
            setAuthToken(data.access_token);
            return String(data.access_token);
          }
        }
      } catch {
        // Ignore network bootstrap error
      } finally {
        tokenBootstrapPromise = null;
      }
      return '';
    })();
  }

  return tokenBootstrapPromise;
}

async function backendFetch<T>(
  path: string,
  options: RequestInit = {},
  requireToken = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = requireToken
    ? await ensureBackendToken()
    : isValidJwtFormat(authToken)
    ? authToken
    : '';

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh expired dev JWT once on 401
  if (res.status === 401 && requireToken && currentRole !== 'PUBLIC') {
    setAuthToken('');
    const refreshed = await ensureBackendToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || errBody.error || `Request failed (${res.status})`);
    } else {
      const rawText = await res.text().catch(() => '');
      if (rawText.includes('<!doctype') || rawText.includes('<html') || rawText.includes('<head')) {
        throw new Error(
          `Server returned an HTML error page (${res.status}) instead of JSON for '${path}'. Please verify the backend API route.`
        );
      }
      throw new Error(`Request failed (${res.status}): ${rawText.slice(0, 120)}`);
    }
  }

  if (!isJson) {
    const rawText = await res.text().catch(() => '');
    if (rawText.includes('<!doctype') || rawText.includes('<html') || rawText.includes('<head')) {
      throw new Error(
        `Backend route '${path}' returned an HTML page (status ${res.status}) instead of JSON. Ensure the endpoint is mapped in server.ts.`
      );
    }
    throw new Error(`Expected JSON from '${path}', but received '${contentType || 'text'}'`);
  }

  try {
    return (await res.json()) as T;
  } catch (err: any) {
    throw new Error(`Failed to parse JSON response from '${path}': ${err.message}`);
  }
}

export const api = {
  // --------------------------------------------------------------------------
  // Database Status & Diagnostics
  // --------------------------------------------------------------------------
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    if (isBrowserRuntime) {
      try {
        const status = await backendFetch<DatabaseStatus>('/db/status');
        // Refresh cached enterprise directory in background
        this.fetchOrganizations().catch(() => {});
        return status;
      } catch (err: any) {
        return {
          isConfigured: getActiveSupabaseConfig().isConfigured,
          isConnected: false,
          provider: 'SUPABASE',
          message: `Backend probe failed: ${err.message || 'Server unreachable'}`,
          endpointUrl: getActiveSupabaseConfig().url || undefined,
          lastChecked: new Date().toISOString(),
        };
      }
    }

    const config = getActiveSupabaseConfig();
    return {
      isConfigured: config.isConfigured,
      isConnected: false,
      provider: config.isConfigured ? 'SUPABASE' : 'MEMORY_FALLBACK',
      message: 'CLI test mode using local repository.',
      endpointUrl: config.url || undefined,
      lastChecked: new Date().toISOString(),
    };
  },

  // --------------------------------------------------------------------------
  // Supabase & Backend Authentication
  // --------------------------------------------------------------------------
  async signUp(
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    organizationName?: string
  ) {
    const resolvedOrg = organizationName || ROLE_DEFAULT_ORGS[role];

    // Ensure client has fetched runtime auth config if not initialized at build time
    let client = getSupabase();
    if (!client) {
      client = await initSupabaseClient();
    }

    if (client && isSupabaseConfigured) {
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              organization_name: resolvedOrg,
            },
          },
        });
        if (error) throw new Error(error.message);

        if (data.session?.access_token) {
          setAuthToken(data.session.access_token);
          if (isBrowserRuntime) {
            try {
              const synced = await backendFetch<UserProfile>(
                '/auth/sync-profile',
                { method: 'POST' },
                true
              );
              activeUser = synced;
              currentRole = synced.role;
              currentOrg = synced.organization_name;
              safeStorage.setItem('bp360_active_role', currentRole);
              safeStorage.setItem('bp360_active_org', currentOrg);
              await this.fetchOrganizations().catch(() => {});
            } catch {
              // Profile will sync on next authenticated call
            }
          }
        } else if (data.user) {
          activeUser = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: fullName,
            role,
            organization_id: `org-${role.toLowerCase()}`,
            organization_name: resolvedOrg,
          };
          currentRole = role;
          currentOrg = resolvedOrg;
          safeStorage.setItem('bp360_active_role', currentRole);
          safeStorage.setItem('bp360_active_org', currentOrg);
        }
        return data;
      } catch (clientErr: any) {
        // If client-side direct request fails due to browser restrictions, attempt backend signup proxy
        if (
          isBrowserRuntime &&
          (clientErr.message?.includes('fetch') ||
            clientErr.message?.includes('network') ||
            clientErr.message?.includes('Failed to fetch'))
        ) {
          try {
            const backendRes = await backendFetch<{ user: any; session: any; profile: UserProfile }>(
              '/auth/signup',
              {
                method: 'POST',
                body: JSON.stringify({ email, password, fullName, role, organization: resolvedOrg }),
              }
            );
            if (backendRes.session?.access_token) {
              setAuthToken(backendRes.session.access_token);
            }
            if (backendRes.profile) {
              activeUser = backendRes.profile;
              currentRole = backendRes.profile.role;
              currentOrg = backendRes.profile.organization_name;
              safeStorage.setItem('bp360_active_role', currentRole);
              safeStorage.setItem('bp360_active_org', currentOrg);
            }
            return backendRes;
          } catch {
            throw clientErr;
          }
        }
        throw clientErr;
      }
    }

    // Try backend signup endpoint if server environment has credentials configured
    if (isBrowserRuntime) {
      try {
        const backendRes = await backendFetch<{ user: any; session: any; profile: UserProfile }>(
          '/auth/signup',
          {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName, role, organization: resolvedOrg }),
          }
        );
        if (backendRes.session?.access_token) {
          setAuthToken(backendRes.session.access_token);
        }
        if (backendRes.profile) {
          activeUser = backendRes.profile;
          currentRole = backendRes.profile.role;
          currentOrg = backendRes.profile.organization_name;
          safeStorage.setItem('bp360_active_role', currentRole);
          safeStorage.setItem('bp360_active_org', currentOrg);
        }
        return backendRes;
      } catch (backendErr: any) {
        if (!backendErr.message?.includes('503') && !backendErr.message?.includes('not configured')) {
          throw backendErr;
        }
      }
    }

    throw new Error(
      'Supabase Auth is not configured in this environment. Please configure SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in Google AI Studio environment settings.'
    );
  },

  async signIn(email: string, password: string) {
    let client = getSupabase();
    if (!client) {
      client = await initSupabaseClient();
    }

    if (client && isSupabaseConfigured) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw new Error(error.message);

        if (data.session?.access_token) {
          setAuthToken(data.session.access_token);
          if (isBrowserRuntime) {
            const synced = await backendFetch<UserProfile>(
              '/auth/sync-profile',
              { method: 'POST' },
              true
            );
            activeUser = synced;
            currentRole = synced.role;
            currentOrg = synced.organization_name;
            safeStorage.setItem('bp360_active_role', currentRole);
            safeStorage.setItem('bp360_active_org', currentOrg);
          }
        }
        return data;
      } catch (clientErr: any) {
        if (
          isBrowserRuntime &&
          (clientErr.message?.includes('fetch') ||
            clientErr.message?.includes('network') ||
            clientErr.message?.includes('Failed to fetch'))
        ) {
          const backendRes = await backendFetch<{ user: any; session: any; profile: UserProfile }>(
            '/auth/signin',
            {
              method: 'POST',
              body: JSON.stringify({ email, password }),
            }
          );
          if (backendRes.session?.access_token) {
            setAuthToken(backendRes.session.access_token);
          }
          if (backendRes.profile) {
            activeUser = backendRes.profile;
            currentRole = backendRes.profile.role;
            currentOrg = backendRes.profile.organization_name;
            safeStorage.setItem('bp360_active_role', currentRole);
            safeStorage.setItem('bp360_active_org', currentOrg);
          }
          return backendRes;
        }
        throw clientErr;
      }
    }

    // Try backend signin endpoint if server has credentials
    if (isBrowserRuntime) {
      try {
        const backendRes = await backendFetch<{ user: any; session: any; profile: UserProfile }>(
          '/auth/signin',
          {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          }
        );
        if (backendRes.session?.access_token) {
          setAuthToken(backendRes.session.access_token);
        }
        if (backendRes.profile) {
          activeUser = backendRes.profile;
          currentRole = backendRes.profile.role;
          currentOrg = backendRes.profile.organization_name;
          safeStorage.setItem('bp360_active_role', currentRole);
          safeStorage.setItem('bp360_active_org', currentOrg);
        }
        return backendRes;
      } catch (backendErr: any) {
        if (!backendErr.message?.includes('503') && !backendErr.message?.includes('not configured')) {
          throw backendErr;
        }
      }
    }

    throw new Error(
      'Supabase Auth is not configured in this environment. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in Google AI Studio environment settings.'
    );
  },

  async signOut() {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore signOut network errors
      }
    }
    activeUser = null;
    currentRole = 'PUBLIC';
    currentOrg = 'Anonymous Citizen';
    setAuthToken('');
    safeStorage.setItem('bp360_active_role', 'PUBLIC');
    safeStorage.setItem('bp360_active_org', 'Anonymous Citizen');
  },

  async resetPassword(email: string) {
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      if (error) throw new Error(error.message);
      return { message: 'Password recovery instructions sent.' };
    }
    throw new Error('Supabase Auth is not configured in this environment.');
  },

  async switchRole(role: UserRole, organization?: string) {
    if (role === 'ADMINISTRATOR' && currentRole !== 'ADMINISTRATOR') {
      throw new Error(
        'Privilege escalation denied: You cannot switch to Administrator without existing administrator credentials.'
      );
    }

    if (isBrowserRuntime) {
      // Clear any active Supabase Auth session before switching demo persona
      if (supabase && isSupabaseConfigured) {
        await supabase.auth.signOut().catch(() => {});
      }
      const data = await backendFetch<{
        access_token: string;
        token_type: string;
        role: UserRole;
        organization: string;
        user?: UserProfile;
      }>(
        '/auth/switch-role',
        {
          method: 'POST',
          body: JSON.stringify({ role, organization }),
        },
        false
      );

      currentRole = data.role;
      currentOrg = data.organization;
      setAuthToken(data.access_token);
      safeStorage.setItem('bp360_active_role', currentRole);
      safeStorage.setItem('bp360_active_org', currentOrg);
      activeUser = data.user || {
        id: `usr-${role.toLowerCase()}`,
        email: `${role.toLowerCase()}@batterypass360.eu`,
        full_name: `${role.replace(/_/g, ' ')} Operator`,
        role: currentRole,
        organization_id: `org-${role.toLowerCase()}`,
        organization_name: currentOrg,
      };
      return data;
    }

    currentRole = role;
    currentOrg = organization || ROLE_DEFAULT_ORGS[role] || 'Unknown Organization';
    safeStorage.setItem('bp360_active_role', currentRole);
    safeStorage.setItem('bp360_active_org', currentOrg);
    const localToken = `session-${role.toLowerCase()}-${Date.now()}`;
    setAuthToken(localToken);
    activeUser = {
      id: `usr-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@batterypass360.eu`,
      full_name: `${role.replace(/_/g, ' ')} Operator`,
      role: currentRole,
      organization_id: `org-${role.toLowerCase()}`,
      organization_name: currentOrg,
    };
    return {
      access_token: localToken,
      token_type: 'bearer',
      role: currentRole,
      organization: currentOrg,
    };
  },

  async getMe(): Promise<UserProfile> {
    if (isBrowserRuntime && currentRole !== 'PUBLIC') {
      try {
        const profile = await backendFetch<UserProfile>('/auth/me', {}, true);
        activeUser = profile;
        currentRole = profile.role;
        currentOrg = profile.organization_name;
        safeStorage.setItem('bp360_active_role', currentRole);
        safeStorage.setItem('bp360_active_org', currentOrg);
        return profile;
      } catch {
        // Fallback to local persona summary if unauthenticated PUBLIC visitor
      }
    }

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
    if (isBrowserRuntime) {
      const q =
        statusFilter && statusFilter !== 'ALL'
          ? `?status=${encodeURIComponent(statusFilter)}`
          : '';
      return backendFetch<PassportSummary[]>(`/passports${q}`);
    }
    return batteryRepository.listPassports(statusFilter);
  },

  async getPassport(id: string): Promise<BatteryPassport> {
    if (isBrowserRuntime) {
      return backendFetch<BatteryPassport>(`/passports/${encodeURIComponent(id)}`);
    }
    const passport = await batteryRepository.getPassport(id);
    if (!passport) throw new Error(`Battery passport '${id}' not found`);
    return passport;
  },

  async createPassport(payload: any): Promise<BatteryPassport> {
    if (isBrowserRuntime) {
      return backendFetch<BatteryPassport>(
        '/passports',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        true
      );
    }
    return batteryRepository.createPassport(payload, {
      role: currentRole,
      organization: currentOrg,
    });
  },

  async updateTelemetry(id: string, telemetry: any): Promise<BatteryPassport> {
    if (isBrowserRuntime) {
      return backendFetch<BatteryPassport>(
        `/passports/${encodeURIComponent(id)}/telemetry`,
        {
          method: 'PATCH',
          body: JSON.stringify(telemetry),
        },
        true
      );
    }
    return batteryRepository.updateTelemetry(id, telemetry, {
      role: currentRole,
      organization: currentOrg,
    });
  },

  // --------------------------------------------------------------------------
  // Custody & Transfers
  // --------------------------------------------------------------------------
  async getCustodyEvents(batteryId: string): Promise<CustodyEvent[]> {
    if (isBrowserRuntime) {
      return backendFetch<CustodyEvent[]>(`/custody/${encodeURIComponent(batteryId)}`);
    }
    return batteryRepository.getCustodyEvents(batteryId);
  },

  async appendCustodyEvent(batteryId: string, event: any): Promise<CustodyEvent> {
    if (isBrowserRuntime) {
      return backendFetch<CustodyEvent>(
        `/custody/${encodeURIComponent(batteryId)}/events`,
        {
          method: 'POST',
          body: JSON.stringify(event),
        },
        true
      );
    }
    return batteryRepository.appendCustodyEvent(batteryId, event);
  },

  async listTransfers(): Promise<CustodyTransfer[]> {
    if (isBrowserRuntime) {
      return backendFetch<CustodyTransfer[]>('/custody-transfers');
    }
    return batteryRepository.listCustodyTransfers();
  },

  async createTransfer(payload: {
    battery_id: string;
    receiver_org_id: string;
    receiver_org_name: string;
    transfer_type: string;
    notes?: string;
  }): Promise<CustodyTransfer> {
    if (isBrowserRuntime) {
      return backendFetch<CustodyTransfer>(
        '/custody-transfers',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        true
      );
    }
    return batteryRepository.createCustodyTransfer(
      {
        ...payload,
        sender_org_name: currentOrg,
      },
      {
        role: currentRole,
        organization: currentOrg,
      }
    );
  },

  async acceptTransfer(transferId: string, notes?: string): Promise<CustodyTransfer> {
    if (isBrowserRuntime) {
      return backendFetch<CustodyTransfer>(
        `/custody-transfers/${encodeURIComponent(transferId)}/accept`,
        {
          method: 'POST',
          body: JSON.stringify({ notes }),
        },
        true
      );
    }
    return batteryRepository.acceptCustodyTransfer(transferId, notes, {
      role: currentRole,
      organization: currentOrg,
    });
  },

  async rejectTransfer(transferId: string, reason: string): Promise<CustodyTransfer> {
    if (isBrowserRuntime) {
      return backendFetch<CustodyTransfer>(
        `/custody-transfers/${encodeURIComponent(transferId)}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        },
        true
      );
    }
    return batteryRepository.rejectCustodyTransfer(transferId, reason, {
      role: currentRole,
      organization: currentOrg,
    });
  },

  // --------------------------------------------------------------------------
  // Verification & Tamper Evidence
  // --------------------------------------------------------------------------
  async verifyPublic(batteryId: string): Promise<PublicVerification> {
    if (isBrowserRuntime) {
      return backendFetch<PublicVerification>(`/verify/${encodeURIComponent(batteryId)}`);
    }
    return batteryRepository.verifyPublic(batteryId);
  },

  async verifyAuditTrail(batteryId: string): Promise<AuditVerification> {
    if (isBrowserRuntime) {
      return backendFetch<AuditVerification>(
        `/verify/${encodeURIComponent(batteryId)}/audit-trail`
      );
    }
    return batteryRepository.verifyAuditTrail(batteryId);
  },

  getQrCodeUrl(batteryId: string) {
    return `/verify/${batteryId}`;
  },

  // --------------------------------------------------------------------------
  // Disposition & Second-Life
  // --------------------------------------------------------------------------
  async getDispositionDecision(batteryId: string): Promise<DispositionDecision> {
    if (isBrowserRuntime) {
      return backendFetch<DispositionDecision>(`/decisions/${encodeURIComponent(batteryId)}`);
    }
    return batteryRepository.getDispositionDecision(batteryId);
  },

  // --------------------------------------------------------------------------
  // Organizations
  // --------------------------------------------------------------------------
  async fetchOrganizations(): Promise<Organization[]> {
    if (isBrowserRuntime) {
      const orgs = await backendFetch<Organization[]>('/organizations');
      cachedOrganizations = orgs;
      return orgs;
    }
    return cachedOrganizations;
  },

  listOrganizations(): Organization[] {
    return cachedOrganizations;
  },

  // --------------------------------------------------------------------------
  // QpiAI Engines & Execution Records
  // --------------------------------------------------------------------------
  async runQpiAIOpt(
    batteryIds: string[],
    mode: 'platform' | 'local' = 'platform'
  ): Promise<QpiAIOptResponse> {
    if (isBrowserRuntime) {
      return backendFetch<QpiAIOptResponse>(
        '/qpiai/opt/allocate',
        {
          method: 'POST',
          body: JSON.stringify({ battery_ids: batteryIds, mode }),
        },
        true
      );
    }

    const batteryData = [];
    for (const id of batteryIds) {
      const p = await batteryRepository.getPassport(id);
      if (p) {
        batteryData.push({
          battery_id: p.battery_id,
          state_of_health_pct: p.health_state.state_of_health_pct,
          cycle_count: p.health_state.cycle_count,
          total_co2_kg_per_kwh: p.carbon_footprint.total_co2_kg_per_kwh,
        });
      }
    }
    return QpiAIOptEngine.solveAllocation(
      batteryData,
      ['stationary_bess', 'cell_reconditioning', 'deep_recycling'],
      { mode }
    );
  },

  async runQpiAIQuantum(
    batteryId: string,
    cathode: string,
    soh: number,
    cycles: number,
    backend?: string,
    shots: number = 1024
  ): Promise<QpiAIQuantumResponse> {
    if (isBrowserRuntime) {
      return backendFetch<QpiAIQuantumResponse>(
        '/qpiai/quantum/simulate-cathode',
        {
          method: 'POST',
          body: JSON.stringify({
            battery_id: batteryId,
            cathode_material: cathode,
            state_of_health_pct: soh,
            cycle_count: cycles,
            ...(backend ? { backend } : {}),
            shots,
          }),
        },
        true
      );
    }

    return QpiAIQuantumEngine.simulateCathodeDegradation(
      batteryId,
      cathode,
      soh,
      cycles,
      backend,
      { shots }
    );
  },
};
