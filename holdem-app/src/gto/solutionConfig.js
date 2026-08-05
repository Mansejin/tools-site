/** GTO Wizard–style solution picker config (all options unlocked). */

export const SOLUTIONS = [
  { id: 'cash', label: '캐시' },
  { id: 'mtt', label: 'MTT' },
  { id: 'spin', label: '스핀 & 고' },
  { id: 'hu_sng', label: 'Hu 싯앤고' },
];

export const FORMATS = [
  { id: 'hu', label: '헤즈업' },
  { id: 'chipev', label: '칩EV' },
  { id: 'icm', label: 'ICM' },
  { id: 'event', label: '이벤트' },
];

export const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9];

export const BET_SIZES = [
  { id: 'single', label: '단일 사이즈' },
  { id: 'multi', label: '멀티 사이즈' },
];

/** Average stacks offered in GTOW-style picker (bb). */
export const STACK_OPTIONS = [
  200, 160, 130, 100, 80, 70, 60, 55, 50, 45, 40, 38, 35, 32, 30, 28, 26, 25, 22, 20,
  19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];

export const DEFAULT_SOLUTION = {
  solution: 'mtt',
  format: 'chipev',
  players: 8,
  betSize: 'single',
  stack: 15,
};

const KEY = 'holdem-solution-v1';

export function loadSolution() {
  try {
    return { ...DEFAULT_SOLUTION, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SOLUTION };
  }
}

export function saveSolution(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export function summaryLabel(s) {
  const sol = SOLUTIONS.find((x) => x.id === s.solution)?.label || s.solution;
  const fmt = FORMATS.find((x) => x.id === s.format)?.label || s.format;
  return `${sol} · ${fmt} · ${s.players}인 · ${s.stack}bb · ${s.betSize === 'multi' ? '멀티' : '단일'}`;
}
