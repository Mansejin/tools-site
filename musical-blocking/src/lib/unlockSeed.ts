import sealed from '../generated/sealedSeed.json';

export interface SeedPayload {
  version: number;
  title: string;
  bpm: number;
  beatsPerBar: number;
  roles: string[];
  script: string;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: asBufferSource(salt),
      iterations: 250_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

/** Decrypt sealed seed. Throws if PIN is wrong. */
export async function unlockSeed(pin: string): Promise<SeedPayload> {
  const salt = b64ToBytes(sealed.salt);
  const iv = b64ToBytes(sealed.iv);
  const tag = b64ToBytes(sealed.tag);
  const data = b64ToBytes(sealed.data);
  const cipher = new Uint8Array(data.length + tag.length);
  cipher.set(data, 0);
  cipher.set(tag, data.length);

  const key = await deriveKey(pin.trim(), salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asBufferSource(iv) },
    key,
    asBufferSource(cipher),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as SeedPayload;
}
