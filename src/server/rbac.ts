import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/index.ts';

const SECRET_KEY = process.env.SECRET_KEY || 'batterypass-360-dev-secret-key';
const EXPIRE_MINUTES = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES) || 1440;

export const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  MANUFACTURER: new Set([
    'passport:create',
    'passport:read',
    'passport:update_specs',
    'custody:append_manufacture',
    'audit:read',
    'qpiai:opt:run',
    'qpiai:quantum:run',
  ]),
  OEM: new Set([
    'passport:read',
    'passport:attach_vehicle',
    'custody:append_oem',
    'audit:read',
  ]),
  FLEET_OPERATOR: new Set([
    'passport:read',
    'passport:update_telemetry',
    'custody:append_telemetry',
    'custody:append_transfer',
    'audit:read',
    'qpiai:opt:run',
  ]),
  RECYCLER: new Set([
    'passport:read',
    'passport:mark_eol',
    'passport:mark_recycled',
    'custody:append_recycling',
    'audit:read',
    'qpiai:opt:run',
  ]),
  REGULATOR_AUDITOR: new Set([
    'passport:read',
    'audit:read',
    'audit:verify',
    'compliance:audit',
  ]),
  PUBLIC: new Set([
    'passport:read_public',
    'audit:verify',
  ]),
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.has(permission) : false;
}

export interface TokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  org: string;
  name: string;
  exp: number;
}

export const DEMO_USERS: Record<
  string,
  { user_id: string; role: UserRole; org: string; name: string }
> = {
  manufacturer: {
    user_id: 'USR-MFG-01',
    role: 'MANUFACTURER',
    org: 'QuantumVolt Gigafactory',
    name: 'Elena Rostova (Lead Cell Engineer)',
  },
  oem: {
    user_id: 'USR-OEM-01',
    role: 'OEM',
    org: 'Apex Motors AG',
    name: 'Marcus Vance (Vehicle Assembly Director)',
  },
  fleet: {
    user_id: 'USR-FLEET-01',
    role: 'FLEET_OPERATOR',
    org: 'Apex EV Mobility Fleet',
    name: 'Sophie Chen (Fleet Operations Manager)',
  },
  recycler: {
    user_id: 'USR-REC-01',
    role: 'RECYCLER',
    org: 'EcoRecycle Metals Recovery',
    name: 'Dr. Klaus Weber (Circular Metallurgy Lead)',
  },
  auditor: {
    user_id: 'USR-AUD-01',
    role: 'REGULATOR_AUDITOR',
    org: 'EU Metrology & Battery Authority',
    name: 'Jean-Luc Dubois (Chief Regulatory Inspector)',
  },
};

export const ROLE_PERSONA_MAP: Record<
  UserRole,
  { uid: string; defaultOrg: string; name: string }
> = {
  MANUFACTURER: {
    uid: 'USR-MFG-01',
    defaultOrg: 'QuantumVolt Gigafactory',
    name: 'Elena Rostova (Lead Cell Engineer)',
  },
  OEM: {
    uid: 'USR-OEM-01',
    defaultOrg: 'Apex Motors AG',
    name: 'Marcus Vance (Vehicle Assembly Director)',
  },
  FLEET_OPERATOR: {
    uid: 'USR-FLEET-01',
    defaultOrg: 'Apex EV Mobility Fleet',
    name: 'Sophie Chen (Fleet Operations Manager)',
  },
  RECYCLER: {
    uid: 'USR-REC-01',
    defaultOrg: 'EcoRecycle Metals Recovery',
    name: 'Dr. Klaus Weber (Circular Metallurgy Lead)',
  },
  REGULATOR_AUDITOR: {
    uid: 'USR-AUD-01',
    defaultOrg: 'EU Metrology & Battery Authority',
    name: 'Jean-Luc Dubois (Chief Inspector)',
  },
  PUBLIC: {
    uid: 'USR-PUB-01',
    defaultOrg: 'Public Citizen / Consumer',
    name: 'Anonymous Citizen',
  },
};

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function createAccessToken(data: Omit<TokenPayload, 'exp'>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + EXPIRE_MINUTES * 60;
  const payload = base64UrlEncode(JSON.stringify({ ...data, exp }));
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

export function decodeAccessToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${payload}`).digest()
    );
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function extractBearerUser(req: Request): TokenPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return decodeAccessToken(token);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = extractBearerUser(req);
  if (!user) {
    res.status(401).json({ detail: 'Authentication credentials required' });
    return;
  }
  (req as any).currentUser = user;
  next();
}

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = extractBearerUser(req);
    if (!user) {
      res.status(401).json({ detail: 'Authentication credentials required' });
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        detail: `Access forbidden: Role '${user.role}' is not authorized. Required one of: [${allowedRoles.map(r => `'${r}'`).join(', ')}]`,
      });
      return;
    }
    (req as any).currentUser = user;
    next();
  };
}
