/**
 * Quick sanity checks for audio↔beat mapping (no test runner required).
 * Run: node scripts/check-audio-sync.mjs
 */
import { createRequire } from 'node:module';

// Compile-free reimplementation of critical math for CI smoke
function msAtBeat(beat, tempoMap, defaultBpm) {
  if (beat <= 0) return 0;
  const sorted = [...tempoMap].sort((a, b) => a.beat - b.beat);
  let t = 0;
  let cursor = 0;
  let bpm = defaultBpm;
  for (const point of sorted.filter((p) => p.beat > 0)) {
    if (point.beat >= beat) break;
    t += (point.beat - cursor) * (60_000 / bpm);
    cursor = point.beat;
    bpm = point.bpm;
  }
  t += (beat - cursor) * (60_000 / bpm);
  return t;
}

function idealMsBetween(from, to, work) {
  return msAtBeat(to, work.tempoMap, work.bpm) - msAtBeat(from, work.tempoMap, work.bpm);
}

function effectiveAnchors(work) {
  const start = {
    id: '__sync_start',
    beat: work.syncStartBeat ?? 0,
    audioMs: Math.max(0, work.audioOffsetMs ?? 0),
  };
  const rest = (work.syncAnchors ?? []).filter((a) => Math.abs(a.beat - start.beat) > 0.05);
  return [start, ...rest].sort((a, b) => a.beat - b.beat);
}

function audioMsAtBeat(beat, work) {
  const anchors = effectiveAnchors(work);
  if (anchors.length === 1) {
    return anchors[0].audioMs + idealMsBetween(anchors[0].beat, beat, work);
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (beat > b.beat + 1e-9 && i < anchors.length - 2) continue;
    if (beat < a.beat && i === 0) {
      const ideal = idealMsBetween(a.beat, b.beat, work);
      const ratio = ideal > 0 ? (b.audioMs - a.audioMs) / ideal : 1;
      return a.audioMs - idealMsBetween(beat, a.beat, work) * ratio;
    }
    if (beat <= b.beat || i === anchors.length - 2) {
      const ideal = idealMsBetween(a.beat, b.beat, work);
      const actual = b.audioMs - a.audioMs;
      if (ideal <= 1e-6) {
        const t = (beat - a.beat) / Math.max(1e-9, b.beat - a.beat);
        return a.audioMs + t * actual;
      }
      return a.audioMs + idealMsBetween(a.beat, beat, work) * (actual / ideal);
    }
  }
  return anchors.at(-1).audioMs;
}

const work = {
  bpm: 120,
  tempoMap: [{ id: '0', beat: 0, bpm: 120 }],
  audioOffsetMs: 2000,
  syncStartBeat: 0,
  syncAnchors: [
    { id: 'a', beat: 16, audioMs: 2000 + 8000 }, // 16 beats @120 = 8s after offset
    { id: 'b', beat: 32, audioMs: 2000 + 16000 },
  ],
};

const cases = [
  [0, 2000],
  [16, 10000],
  [32, 18000],
  [8, 6000],
];

let failed = 0;
for (const [beat, expect] of cases) {
  const got = audioMsAtBeat(beat, work);
  const ok = Math.abs(got - expect) < 1;
  console.log(`${ok ? 'OK' : 'FAIL'} beat ${beat} → ${got.toFixed(1)} (expect ${expect})`);
  if (!ok) failed++;
}

// Offset-only (no extra anchors): beat 0 @ offset, beat 8 @ offset+4s
const plain = {
  bpm: 120,
  tempoMap: [{ id: '0', beat: 0, bpm: 120 }],
  audioOffsetMs: 1500,
  syncStartBeat: 0,
  syncAnchors: [],
};
const p0 = audioMsAtBeat(0, plain);
const p8 = audioMsAtBeat(8, plain);
console.log(`${Math.abs(p0 - 1500) < 1 ? 'OK' : 'FAIL'} offset beat0 → ${p0}`);
console.log(`${Math.abs(p8 - 5500) < 1 ? 'OK' : 'FAIL'} offset beat8 → ${p8}`);
if (Math.abs(p0 - 1500) >= 1 || Math.abs(p8 - 5500) >= 1) failed++;

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll audio sync smoke checks passed');
