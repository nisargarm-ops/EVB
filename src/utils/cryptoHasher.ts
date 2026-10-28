/**
 * Cryptographic SHA-256 hashing & tamper-evident chain verification utilities
 * Perfectly mirrors Python hashlib.sha256 and backend/app/core/hasher.py
 */

export const GENESIS_PREV_HASH = "0".repeat(64);

// Clean, standard pure TypeScript SHA-256 implementation
function sha256Sync(input: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const maxWord = Math.pow(2, 32);
  const words: number[] = [];
  const bitLength = input.length * 8;

  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  let padded = input + '\x80';
  while ((padded.length % 64) !== 56) {
    padded += '\x00';
  }

  for (let i = 0; i < padded.length; i++) {
    const byte = padded.charCodeAt(i);
    const wordIdx = i >> 2;
    words[wordIdx] = (words[wordIdx] || 0) | (byte << ((3 - (i % 4)) * 8));
  }

  words[padded.length >> 2] = (bitLength / maxWord) | 0;
  words[(padded.length >> 2) + 1] = bitLength;

  const W: number[] = new Array(64);
  for (let chunk = 0; chunk < words.length; chunk += 16) {
    for (let i = 0; i < 16; i++) {
      W[i] = words[chunk + i] || 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }

    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;

    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }

  const toHex = (n: number) => ((n >>> 0).toString(16).padStart(8, '0'));
  return (toHex(H0) + toHex(H1) + toHex(H2) + toHex(H3) + toHex(H4) + toHex(H5) + toHex(H6) + toHex(H7)).toLowerCase();
}

export function canonicalJsonDumps(data: any): string {
  if (data === null || data === undefined) return 'null';
  if (typeof data !== 'object') return JSON.stringify(data);
  if (Array.isArray(data)) {
    return '[' + data.map(canonicalJsonDumps).join(',') + ']';
  }
  const keys = Object.keys(data).sort();
  return '{' + keys.map(k => `${JSON.stringify(k)}:${canonicalJsonDumps(data[k])}`).join(',') + '}';
}

export function generateImmutableBatteryId(
  manufacturer: string,
  serialNumber: string,
  chemistry: string,
  manufactureDate: string
): { did: string; shortId: string } {
  const rawMaterial = `${manufacturer.trim().toUpperCase()}:${serialNumber.trim()}:${chemistry.trim().toUpperCase()}:${manufactureDate.trim()}`;
  const digest = sha256Sync(rawMaterial);
  const did = `did:battery:sha256:${digest}`;

  const cleanChem = chemistry.replace(/\s+/g, '').replace(/-/g, '').toUpperCase().slice(0, 4);
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
  const payloadStr = canonicalJsonDumps(payload);
  const blockContent = `${prevHash}|${batteryId}|${eventType}|${timestamp}|${actorId}|${payloadStr}`;
  return sha256Sync(blockContent);
}

export function verifyChainIntegrity(
  events: Array<{
    prev_hash: string;
    hash: string;
    battery_id: string;
    event_type: string;
    timestamp: string;
    actor_id: string;
    payload: Record<string, any>;
  }>
): { isValid: boolean; errorMessage: string | null; tamperedIndex: number | null } {
  if (!events || events.length === 0) {
    return { isValid: true, errorMessage: null, tamperedIndex: null };
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const prevHash = event.prev_hash;
    const storedHash = event.hash;
    const batteryId = event.battery_id;
    const eventType = event.event_type;
    const timestamp = String(event.timestamp);
    const actorId = event.actor_id;
    const payload = event.payload || {};

    // Genesis block check
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

    // Recalculate content hash check
    const recalculated = calculateEventHash(prevHash, batteryId, eventType, timestamp, actorId, payload);
    if (recalculated !== storedHash) {
      return {
        isValid: false,
        errorMessage: `Tampering detected at block ${i}! Recalculated hash ${recalculated} != stored hash ${storedHash}`,
        tamperedIndex: i,
      };
    }
  }

  return { isValid: true, errorMessage: null, tamperedIndex: null };
}
