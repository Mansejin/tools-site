/**
 * Pub turbo 15bb push ranges (앞이 모두 폴드) — 바이블 하드코딩 기준.
 */

const RANKS = 'AKQJT98765432';
const RI = Object.fromEntries([...RANKS].map((r, i) => [r, i]));

function pairPlus(from) {
  return [...RANKS].slice(0, RI[from] + 1).map((r) => r + r);
}

function suitedAx(fromLo = '2') {
  return [...RANKS].slice(1, RI[fromLo] + 1).map((r) => `A${r}s`);
}

function offsuitAx(fromLo) {
  return [...RANKS].slice(1, RI[fromLo] + 1).map((r) => `A${r}o`);
}

function suitedKx(fromLo = '2') {
  return [...RANKS].slice(2, RI[fromLo] + 1).map((r) => `K${r}s`);
}

function offsuitKx(fromLo) {
  return [...RANKS].slice(2, RI[fromLo] + 1).map((r) => `K${r}o`);
}

function broadwaySuited() {
  const b = 'AKQJT';
  const out = [];
  for (let i = 0; i < b.length; i++) {
    for (let j = i + 1; j < b.length; j++) out.push(`${b[i]}${b[j]}s`);
  }
  return out;
}

function allSuited() {
  const out = [];
  for (let i = 0; i < 13; i++) {
    for (let j = i + 1; j < 13; j++) out.push(`${RANKS[i]}${RANKS[j]}s`);
  }
  return out;
}

function faceCards() {
  // 모든 A/K/Q/J (페어·수티드·오프수트)
  const faces = 'AKQJ';
  const out = [];
  for (const a of faces) {
    out.push(a + a);
    for (const b of RANKS) {
      if (RI[b] <= RI[a]) continue;
      out.push(`${a}${b}s`, `${a}${b}o`);
    }
  }
  return out;
}

function setOf(...lists) {
  return new Set(lists.flat());
}

export const PUB_PUSH = {
  UTG: setOf(pairPlus('7'), ['ATs', 'AJs', 'AQs', 'AKs', 'AQo', 'AKo', 'KQs']),
  MP: setOf(pairPlus('5'), suitedAx('2'), offsuitAx('9'), broadwaySuited()),
  CO: setOf(pairPlus('5'), suitedAx('2'), offsuitAx('9'), broadwaySuited()),
  BTN: setOf(
    pairPlus('2'),
    suitedAx('2'),
    offsuitAx('2'),
    ['AA'],
    suitedKx('2'),
    offsuitKx('9'),
    ['J9s', 'JTs', 'JJs'],
  ),
  SB: setOf(pairPlus('2'), faceCards(), allSuited()),
};

export const PUB_CALL = {
  UTG: setOf(pairPlus('9'), ['AQs', 'AKs', 'AKo', 'AQo', 'KQs']),
  MP: setOf(pairPlus('8'), ['ATs', 'AJs', 'AQs', 'AKs', 'AQo', 'AKo', 'KQs', 'KJs', 'QJs']),
  CO: setOf(pairPlus('8'), ['ATs', 'AJs', 'AQs', 'AKs', 'AQo', 'AKo', 'KQs', 'KJs', 'QJs']),
  BTN: setOf(
    pairPlus('7'),
    suitedAx('9'),
    offsuitAx('T'),
    ['KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'AKo', 'AQo', 'KQo'],
  ),
  BB: setOf(pairPlus('7'), suitedAx('T'), offsuitAx('Q'), ['KQs', 'KJs', 'QJs', 'AKo', 'AQo']),
};

export const DRILL_POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB'];

export function normalizeHand(raw) {
  if (!raw || raw.length < 2) return null;
  const a = raw[0].toUpperCase();
  const b = raw[1].toUpperCase();
  const s = (raw[2] || '').toLowerCase();
  if (!(a in RI) || !(b in RI)) return null;
  if (a === b) return a + b;
  const [hi, lo] = RI[a] <= RI[b] ? [a, b] : [b, a];
  if (s === 's' || s === 'o') return hi + lo + s;
  return null;
}

export function shouldPush(hand, pos) {
  const h = normalizeHand(hand);
  if (!h) return false;
  return (PUB_PUSH[pos] || PUB_PUSH.UTG).has(h);
}

export function shouldCallShove(hand, pos = 'BB') {
  const h = normalizeHand(hand);
  if (!h) return false;
  return (PUB_CALL[pos] || PUB_CALL.BB).has(h);
}

export function randomHand() {
  const ranks = [...RANKS];
  const i = Math.floor(Math.random() * 13);
  const j = Math.floor(Math.random() * 13);
  if (i === j) return ranks[i] + ranks[j];
  const [hi, lo] = i < j ? [ranks[i], ranks[j]] : [ranks[j], ranks[i]];
  return hi + lo + (Math.random() < 0.5 ? 's' : 'o');
}

export function randomPosition(list = DRILL_POSITIONS) {
  return list[Math.floor(Math.random() * list.length)];
}

const WRONG_KEY = 'holdem-bible-wrongs';

export function loadWrongs() {
  try {
    return JSON.parse(localStorage.getItem(WRONG_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveWrong(item) {
  const list = loadWrongs().filter(
    (w) => !(w.hand === item.hand && w.pos === item.pos && w.kind === item.kind),
  );
  list.unshift({ ...item, at: Date.now() });
  localStorage.setItem(WRONG_KEY, JSON.stringify(list.slice(0, 50)));
}

export function clearWrongs() {
  localStorage.removeItem(WRONG_KEY);
}

export function removeWrong(hand, pos, kind) {
  const list = loadWrongs().filter(
    (w) => !(w.hand === hand && w.pos === pos && w.kind === kind),
  );
  localStorage.setItem(WRONG_KEY, JSON.stringify(list));
}
