import crypto from 'node:crypto';
import type { CustodyEvent } from '../types/index.ts';

export const GENESIS_PREV_HASH = '0'.repeat(64);

function sortObjectKeys(val: any): any {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sortObjectKeys);
  }
  const sortedKeys = Object.keys(val).sort();
  const out: Record<string, any> = {};
  for (const key of sortedKeys) {
    out[key] = sortObjectKeys(val[key]);
  }
  return out;
}

export function canonicalJsonDumps(data: any): string {
  return JSON.stringify(sortObjectKeys(data));
}

export function generateImmutableBatteryId(
  manufacturer: string,
  serialNumber: string,
  chemistry: string,
  manufactureDate: string
): { did: string; shortId: string } {
  const rawMaterial = `${manufacturer.trim().toUpperCase()}:${serialNumber.trim()}:${chemistry.trim().toUpperCase()}:${manufactureDate.trim()}`;
  const digest = crypto.createHash('sha256').update(rawMaterial, 'utf8').digest('hex');
  const did = `did:battery:sha256:${digest}`;
  const cleanChem = chemistry.replace(/[\s-]/g, '').toUpperCase().slice(0, 4);
  const shortId = `BAT-${cleanChem}-${digest.slice(0, 8).toUpperCase()}`;
  return { did, shortId };
}

export function calculateEventHash(
  prevHash: string,
  batteryId: string,
  eventType: string,
  timestamp: string,
  actorId: string,
  payload: Record<string, any>
): string {
  const payloadStr = canonicalJsonDumps(payload ?? {});
  const blockContent = `${prevHash}|${batteryId}|${eventType}|${timestamp}|${actorId}|${payloadStr}`;
  return crypto.createHash('sha256').update(blockContent, 'utf8').digest('hex');
}

export function verifyChainIntegrity(events: CustodyEvent[]): {
  isValid: boolean;
  errorMessage: string | null;
  tamperedIndex: number | null;
} {
  if (!events || events.length === 0) {
    return { isValid: true, errorMessage: null, tamperedIndex: null };
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const prevHash = event.prev_hash;
    const storedHash = event.hash;
    const batteryId = event.battery_id;
    const eventType = String(event.event_type);
    const timestamp = String(event.timestamp);
    const actorId = event.actor_id;
    const payload = event.payload ?? {};

    if (i === 0) {
      if (prevHash !== GENESIS_PREV_HASH) {
        return {
          isValid: false,
          errorMessage: `Genesis block at index 0 has invalid prev_hash: ${prevHash} (expected ${GENESIS_PREV_HASH})`,
          tamperedIndex: 0,
        };
      }
    } else {
      const expectedPrev = events[i - 1].hash;
      if (prevHash !== expectedPrev) {
        return {
          isValid: false,
          errorMessage: `Block ${i} broken link: prev_hash (${prevHash}) does not match Block ${i - 1} hash (${expectedPrev})`,
          tamperedIndex: i,
        };
      }
    }

    const recalculatedHash = calculateEventHash(
      prevHash,
      batteryId,
      eventType,
      timestamp,
      actorId,
      payload
    );

    if (recalculatedHash !== storedHash) {
      return {
        isValid: false,
        errorMessage: `Tampering detected at block ${i}! Recalculated hash ${recalculatedHash} != stored hash ${storedHash}`,
        tamperedIndex: i,
      };
    }
  }

  return { isValid: true, errorMessage: null, tamperedIndex: null };
}
