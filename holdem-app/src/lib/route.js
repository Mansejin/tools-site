const STREAK_KEY = 'holdem-bible-streak';

const TAB_IDS = new Set(['home', 'turbo', 'mtt', 'hu', 'gto', 'tools', 'quiz']);
const TOOL_IDS = new Set(['timer', 'lookup', 'bubble', 'roi', 'sheet', 'glossary', 'settings']);

export function readRoute() {
  const p = new URLSearchParams(window.location.search);
  const tab = TAB_IDS.has(p.get('tab')) ? p.get('tab') : 'home';
  const tool = TOOL_IDS.has(p.get('tool')) ? p.get('tool') : 'timer';
  const hand = (p.get('hand') || '').trim() || null;
  const pos = (p.get('pos') || '').trim().toUpperCase() || null;
  const mode = p.get('mode') || null;
  return { tab, tool, hand, pos, mode };
}

/** Build query string; omit defaults to keep links short. */
export function buildQuery({ tab = 'home', tool, hand, pos, mode } = {}) {
  const p = new URLSearchParams();
  if (tab && tab !== 'home') p.set('tab', tab);
  if (tab === 'tools' && tool && tool !== 'timer') p.set('tool', tool);
  if (hand) p.set('hand', hand);
  if (pos) p.set('pos', pos);
  if (mode) p.set('mode', mode);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function writeRoute(state, { replace = true } = {}) {
  const q = buildQuery(state);
  const url = `${window.location.pathname}${q}${window.location.hash}`;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

export function shareUrl(state) {
  return `${window.location.origin}${window.location.pathname}${buildQuery(state)}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function readStreak() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Call once per day when user practices or opens home. Returns { count, touched }. */
export function touchStreak() {
  const today = todayKey();
  const prev = readStreak();
  if (prev.last === today) return { count: prev.count || 1, touched: false };
  const count = prev.last === yesterdayKey() ? (prev.count || 0) + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ last: today, count }));
  return { count, touched: true };
}

export function streakCount() {
  const s = readStreak();
  if (!s.last) return 0;
  if (s.last === todayKey() || s.last === yesterdayKey()) return s.count || 0;
  return 0;
}
