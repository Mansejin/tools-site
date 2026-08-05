/**
 * Personal strategy pack — paste Pio/GTO+/hand-edited freqs.
 * Spot key: `${pfAction}|${pos}|${stackOrStar}` e.g. open|BTN|* , vs_open|BB|100
 * Hand values: { fold, call, raise, shove } (0–100; missing keys = 0). Sparse OK.
 * ponytail: localStorage only; Synced cloud packs if multi-device matters.
 */

import { handFromGrid, GRID_RANKS } from './pushfoldNash.js';
import { RFI_CHARTS, RFI_POSITIONS, cellAction } from './rfiCharts.js';

const KEY = 'holdem-my-pack-v1';

const EMPTY = { v: 1, name: '', note: '', spots: {} };

export function loadPack() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.spots !== 'object') return null;
    return p;
  } catch {
    return null;
  }
}

export function savePack(pack) {
  if (!pack || !pack.spots) {
    localStorage.removeItem(KEY);
    return null;
  }
  const clean = {
    v: 1,
    name: String(pack.name || '내 솔루션'),
    note: String(pack.note || ''),
    spots: pack.spots,
  };
  localStorage.setItem(KEY, JSON.stringify(clean));
  return clean;
}

export function clearPack() {
  localStorage.removeItem(KEY);
}

export function packSummary(pack = loadPack()) {
  if (!pack?.spots) return null;
  const nSpots = Object.keys(pack.spots).length;
  const nHands = Object.values(pack.spots).reduce(
    (a, s) => a + (s && typeof s === 'object' ? Object.keys(s).length : 0),
    0,
  );
  return { name: pack.name || '내 솔루션', nSpots, nHands };
}

function stackKeys(pf, pos, stack) {
  const s = Math.round(Number(stack) || 0);
  return [`${pf}|${pos}|${s}`, `${pf}|${pos}|*`, `${pf}|*|${s}`, `*|${pos}|*`, `${pf}|*|*`];
}

/** Return normalized freqs or null to fall back to built-in engine. */
export function packFrequencies(hand, spot = {}, stack = 100) {
  const pack = loadPack();
  if (!pack?.spots) return null;
  const pf = spot.pfAction || 'open';
  const pos = spot.pos || 'BTN';
  for (const k of stackKeys(pf, pos, stack)) {
    const cell = pack.spots[k]?.[hand];
    if (!cell || typeof cell !== 'object') continue;
    const keys = ['fold', 'call', 'raise', 'shove'];
    let sum = 0;
    const out = {};
    for (const a of keys) {
      out[a] = Math.max(0, Number(cell[a]) || 0);
      sum += out[a];
    }
    if (sum <= 0) continue;
    for (const a of keys) out[a] = Math.round((out[a] / sum) * 100);
    out.fold += 100 - keys.reduce((t, a) => t + out[a], 0);
    return out;
  }
  return null;
}

function freqsFromRfiCell(hand, pos) {
  const a = cellAction(RFI_CHARTS[pos] || RFI_CHARTS.UTG, hand);
  if (a === 'mixed') return { raise: 50, fold: 50, call: 0, shove: 0 };
  if (a === 'raise' || a === 'allin') return { raise: 100, fold: 0, call: 0, shove: 0 };
  if (a === 'call') return { call: 100, fold: 0, raise: 0, shove: 0 };
  return { fold: 100, call: 0, raise: 0, shove: 0 };
}

/** Starter pack from MIT RFI charts — editable base for personal use. */
export function makeRfiStarterPack() {
  const spots = {};
  for (const pos of RFI_POSITIONS) {
    const hands = {};
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const h = handFromGrid(r, c);
        hands[h] = freqsFromRfiCell(h, pos);
      }
    }
    spots[`open|${pos}|*`] = hands;
  }
  return {
    v: 1,
    name: '공개 RFI 스타터',
    note: 'Pekarstas/AHTOOOXA RFI (MIT). Pio·GTO+ 결과로 스팟을 덮어쓰세요.',
    spots,
  };
}

export function examplePackDoc() {
  return {
    v: 1,
    name: '예시',
    note: 'spot 키 = pfAction|포지션|스택(* = 전체). 핸드만 적어도 됨.',
    spots: {
      'open|BTN|*': {
        AA: { raise: 100 },
        AKs: { raise: 100 },
        '72o': { fold: 100 },
        '98s': { raise: 40, fold: 60 },
      },
      'vs_open|BB|100': {
        AA: { raise: 70, call: 30 },
        AKs: { raise: 55, call: 45 },
        '22': { call: 80, fold: 20 },
      },
    },
  };
}

export { GRID_RANKS };
