import type { CustodyEvent } from '../types/index.ts';

export const GENESIS_PREV_HASH = '0'.repeat(64);

// Pure JS SHA-256 implementation for synchronous and deterministic hashing
function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // Encode UTF-8
  const utf8Bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    let charcode = ascii.charCodeAt(i);
    if (charcode < 0x80) utf8Bytes.push(charcode);
    else if (charcode < 0x800) {
      utf8Bytes.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8Bytes.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (ascii.charCodeAt(i) & 0x3ff));
      utf8Bytes.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }

  const bitLength = utf8Bytes.length * 8;
  utf8Bytes.push(0x80);
  while ((utf8Bytes.length % 64) !== 56) {
    utf8Bytes.push(0);
  }

  for (let i = 0; i < 4; i++) {
    utf8Bytes.push((0 >>> (24 - i * 8)) & 0xff);
  }
  for (let i = 0; i < 4; i++) {
    utf8Bytes.push((bitLength >>> (24 - i * 8)) & 0xff);
  }

  for (let i = 0; i < utf8Bytes.length; i += 4) {
    words.push(
      (utf8Bytes[i] << 24) |
      (utf8Bytes[i + 1] << 16) |
      (utf8Bytes[i + 2] << 8) |
      utf8Bytes[i + 3]
    );
  }

  const w = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    const chunk = words.slice(i, i + 16);
    let [a, b, c, d, e, f, g, h] = hash;

    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = chunk[j];
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
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

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (let i = 0; i < 8; i++) {
    result += ('00000000' + (hash[i] >>> 0).toString(16)).slice(-8);
  }

  return result;
}

export function canonicalJsonDumps(data: any): string {
  if (data === null || data === undefined) return 'null';
  if (typeof data !== 'object') return JSON.stringify(data);

  if (Array.isArray(data)) {
    return '[' + data.map(canonicalJsonDumps).join(',') + ']';
  }

  const keys = Object.keys(data).sort();
  const pairs = keys.map(k => `${JSON.stringify(k)}:${canonicalJsonDumps(data[k])}`);
  return '{' + pairs.join(',') + '}';
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
  const payloadStr = canonicalJsonDumps(payload);
  const blockContent = `${prevHash}|${batteryId}|${eventType}|${timestamp}|${actorId}|${payloadStr}`;
  return sha256Sync(blockContent);
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

    // Recalculate content hash
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
