/**
 * Encrypt private StageCue seed (PBKDF2 + AES-GCM) for browser unlock.
 */
import { createCipheriv, randomBytes, pbkdf2Sync } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pin = process.env.STAGECUE_PIN || 'hongryeon10';
const scriptPath =
  process.env.STAGECUE_SCRIPT ||
  '/home/ubuntu/.cursor/projects/workspace/uploads/stagecue-number-10.txt';

const script = readFileSync(scriptPath, 'utf8');
const seed = {
  version: 1,
  title: '10. 홍련',
  bpm: 170,
  beatsPerBar: 4,
  roles: ['홍련', '바리', '강림', '월직', '일직'],
  script,
};

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(pin, salt, 250_000, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const plaintext = Buffer.from(JSON.stringify(seed), 'utf8');
const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();

const payload = {
  v: 1,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  tag: tag.toString('base64'),
  data: enc.toString('base64'),
};

const outDir = join(root, 'src', 'generated');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'sealedSeed.json'), JSON.stringify(payload));
console.log('OK sealed seed · pin chars', pin.length, '· script', script.length);
