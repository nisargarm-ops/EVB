import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole, UserProfile } from '../types/index.ts';

export interface AuthenticatedActor {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  organization_name: string;
  auth_source: 'supabase_jwks' | 'supabase_auth' | 'server_jwt';
}

export interface AuthRequest extends Request {
  actor?: AuthenticatedActor;
}

export const ROLE_DEFAULT_ORGS: Record<UserRole, { id: string; name: string; fullName: string; email: string }> = {
  MANUFACTURER: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'QuantumVolt Gigafactory',
    fullName: 'Elena Rostova',
    email: 'manufacturer@quantumvolt.de',
  },
  OEM: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Apex Motors AG',
    fullName: 'Marcus Weber',
    email: 'oem-admin@apexmotors.de',
  },
  FLEET_OPERATOR: {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Apex EV Mobility Fleet',
    fullName: 'Sophie Laurent',
    email: 'fleet-manager@apexfleet.de',
  },
  SERVICE_CENTER: {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Berlin Battery Care',
    fullName: 'Hans Becker',
    email: 'service-lead@berlinbatterycare.de',
  },
  REMANUFACTURER: {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Nordic Remanufacturing Hub',
    fullName: 'Lars Lindqvist',
    email: 'reman-eng@nordicreman.se',
  },
  RECYCLER: {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'EcoRecycle Metals Recovery',
    fullName: 'Camille Dubois',
    email: 'recycler@ecorecycle.fr',
  },
  REGULATOR_AUDITOR: {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'EU Metrology Authority',
    fullName: 'Dr. Aris Thorne',
    email: 'auditor@metrology.europa.eu',
  },
  ADMINISTRATOR: {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'BatteryPass 360 Governance',
    fullName: 'System Administrator',
    email: 'admin@batterypass360.eu',
  },
  PUBLIC: {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Anonymous Citizen',
    fullName: 'Public Verifier',
    email: 'public@batterypass360.eu',
  },
};

export const ROLE_PROFILE_UUIDS: Record<UserRole, string> = {
  MANUFACTURER: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  OEM: 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  FLEET_OPERATOR: 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  SERVICE_CENTER: 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  REMANUFACTURER: 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  RECYCLER: 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  REGULATOR_AUDITOR: 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ADMINISTRATOR: 'a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  PUBLIC: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
};

export function normalizeUserRole(raw?: string | null): UserRole {
  if (!raw) return 'PUBLIC';
  const clean = String(raw).trim().toUpperCase().replace(/-/g, '_');
  if (clean === 'AUDITOR' || clean === 'REGULATOR' || clean === 'EU_AUDITOR') {
    return 'REGULATOR_AUDITOR';
  }
  const valid: UserRole[] = [
    'MANUFACTURER',
    'OEM',
    'FLEET_OPERATOR',
    'SERVICE_CENTER',
    'REMANUFACTURER',
    'RECYCLER',
    'REGULATOR_AUDITOR',
    'ADMINISTRATOR',
    'PUBLIC',
  ];
  return valid.includes(clean as UserRole) ? (clean as UserRole) : 'PUBLIC';
}

export function roleToDbProfileRole(role: UserRole): string {
  if (role === 'REGULATOR_AUDITOR') return 'auditor';
  return role.toLowerCase();
}

function getSecretKey(): string {
  return process.env.SECRET_KEY || 'bp360-dev-jwt-signing-secret-9f8e7d6c5b4a3210fedcba9876543210';
}

function base64UrlEncode(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToBuffer(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64');
}

export function issueServerJwt(actor: Omit<AuthenticatedActor, 'auth_source'>, expiresMinutes = 1440): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: actor.id,
      email: actor.email,
      full_name: actor.full_name,
      role: actor.role,
      organization_id: actor.organization_id,
      organization_name: actor.organization_name,
      iat: nowSec,
      exp: nowSec + expiresMinutes * 60,
      iss: 'BatteryPass 360',
    })
  );
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', getSecretKey()).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${sig}`;
}

export function verifyServerJwt(token: string): AuthenticatedActor | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(base64UrlDecodeToBuffer(headerB64).toString('utf8'));
    if (header.alg !== 'HS256') return null;

    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', getSecretKey()).update(`${headerB64}.${payloadB64}`).digest()
    );
    const sigBuf = Buffer.from(sigB64);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecodeToBuffer(payloadB64).toString('utf8'));
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowSec) {
      return null;
    }

    const role = normalizeUserRole(payload.role);
    const defaults = ROLE_DEFAULT_ORGS[role];
    return {
      id: payload.sub || ROLE_PROFILE_UUIDS[role],
      email: payload.email || defaults.email,
      full_name: payload.full_name || defaults.fullName,
      role,
      organization_id: payload.organization_id || defaults.id,
      organization_name: payload.organization_name || payload.organization || defaults.name,
      auth_source: 'server_jwt',
    };
  } catch {
    return null;
  }
}

// Cached JWKS keys fetched from SUPABASE_JWKS_URL
interface CachedJwks {
  fetchedAt: number;
  keys: Array<Record<string, any>>;
}
let jwksCache: CachedJwks | null = null;

async function getSupabaseJwks(): Promise<Array<Record<string, any>>> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < 5 * 60 * 1000) {
    return jwksCache.keys;
  }
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const jwksUrl =
    (process.env.SUPABASE_JWKS_URL || '').trim() ||
    (supabaseUrl ? `${supabaseUrl}/auth/v1/.well-known/jwks.json` : '');

  if (!jwksUrl) return [];

  const res = await fetch(jwksUrl);
  if (!res.ok) return [];
  const data = (await res.json()) as { keys?: Array<Record<string, any>> };
  const keys = Array.isArray(data.keys) ? data.keys : [];
  jwksCache = { fetchedAt: now, keys };
  return keys;
}

export async function verifySupabaseJwksToken(token: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(base64UrlDecodeToBuffer(headerB64).toString('utf8'));
    if (!header.alg || header.alg === 'HS256' || header.alg === 'none') {
      return null;
    }

    const keys = await getSupabaseJwks();
    if (keys.length === 0) return null;

    const matchingKey = header.kid
      ? keys.find((k) => k.kid === header.kid)
      : keys[0];
    if (!matchingKey) return null;

    const publicKey = crypto.createPublicKey({
      key: matchingKey as crypto.JsonWebKey,
      format: 'jwk',
    });

    const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
    const signature = base64UrlDecodeToBuffer(sigB64);

    let verified = false;
    if (header.alg === 'ES256') {
      verified = crypto.verify(
        'sha256',
        signingInput,
        { key: publicKey, dsaEncoding: 'ieee-p1363' },
        signature
      );
    } else if (header.alg === 'RS256') {
      verified = crypto.verify('RSA-SHA256', signingInput, publicKey, signature);
    }

    if (!verified) return null;

    const payload = JSON.parse(base64UrlDecodeToBuffer(payloadB64).toString('utf8'));
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createAuthMiddleware(
  resolveSupabaseActor: (
    userId: string,
    email: string,
    metadata: Record<string, any>,
    rawToken?: string
  ) => Promise<AuthenticatedActor | null>
) {
  async function extractActor(req: Request): Promise<{ actor: AuthenticatedActor | null; invalidToken: boolean }> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { actor: null, invalidToken: false };
    }
    const token = authHeader.slice(7).trim();
    if (!token || token.startsWith('jwt-') || token.startsWith('token-session-') || token === 'mock-jwt-token-bp360') {
      return { actor: null, invalidToken: true };
    }

    // 1. Check server-signed HS256 JWT (issued by /api/v1/auth/switch-role in dev)
    const serverActor = verifyServerJwt(token);
    if (serverActor) {
      return { actor: serverActor, invalidToken: false };
    }

    // 2. Check Supabase asymmetric JWT via SUPABASE_JWKS_URL
    const jwksPayload = await verifySupabaseJwksToken(token);
    if (jwksPayload && jwksPayload.sub) {
      const resolved = await resolveSupabaseActor(
        String(jwksPayload.sub),
        String(jwksPayload.email || ''),
        (jwksPayload.user_metadata as Record<string, any>) || {}
      );
      if (resolved) {
        return { actor: { ...resolved, auth_source: 'supabase_jwks' }, invalidToken: false };
      }
    }

    // 3. Fallback: verify symmetric/opaque Supabase session token via Supabase Auth API
    const viaAuthApi = await resolveSupabaseActor('', '', {}, token);
    if (viaAuthApi) {
      return { actor: { ...viaAuthApi, auth_source: 'supabase_auth' }, invalidToken: false };
    }

    return { actor: null, invalidToken: true };
  }

  const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { actor, invalidToken } = await extractActor(req);
    if (invalidToken) {
      res.status(401).json({
        detail: 'Authentication token could not be verified. Invalid or expired signature.',
      });
      return;
    }
    if (actor) {
      req.actor = actor;
    }
    next();
  };

  const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { actor } = await extractActor(req);
    if (!actor) {
      res.status(401).json({
        detail: 'Authentication credentials were not provided or are invalid.',
      });
      return;
    }
    req.actor = actor;
    next();
  };

  const requireRoles = (allowedRoles: UserRole[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      const { actor } = await extractActor(req);
      if (!actor) {
        res.status(401).json({
          detail: 'Authentication credentials were not provided or are invalid.',
        });
        return;
      }
      if (actor.role !== 'ADMINISTRATOR' && !allowedRoles.includes(actor.role)) {
        res.status(403).json({
          detail: `Access denied. User role '${actor.role}' is not authorized for this resource. Required roles: [${allowedRoles.join(', ')}]`,
        });
        return;
      }
      req.actor = actor;
      next();
    };
  };

  return { optionalAuth, requireAuth, requireRoles, extractActor };
}

export function actorToProfile(actor: AuthenticatedActor): UserProfile {
  return {
    id: actor.id,
    email: actor.email,
    full_name: actor.full_name,
    role: actor.role,
    organization_id: actor.organization_id,
    organization_name: actor.organization_name,
  };
}
