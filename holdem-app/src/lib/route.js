const STREAK_KEY = 'holdem-bible-streak';

const TAB_IDS = new Set(['practice', 'charts', 'more']);
const LEGACY = {
  home: 'practice',
  quiz: 'practice',
  gto: 'charts',
  tools: 'more',
  turbo: 'more',
  mtt: 'more',
  hu: 'more',
  guide: 'more',
};

export function readRoute() {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get('tab');
  const tab = TAB_IDS.has(raw) ? raw : LEGACY[raw] || 'practice';
  const mode = p.get('mode') || null;
  return { tab, mode };
}

export function buildQuery({ tab = 'practice', mode } = {}) {
  const p = new URLSearchParams();
  if (tab && tab !== 'practice') p.set('tab', tab);
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
