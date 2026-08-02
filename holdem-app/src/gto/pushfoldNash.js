/**
 * Short-stack HU Nash push/fold thresholds.
 * Adapted from hellomate2/gto-poker-overlay (MIT)
 * https://github.com/hellomate2/gto-poker-overlay
 *
 * Hand is in shove/call range at stack S iff S <= threshold(hand).
 */

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const MIN_PUSHFOLD_BB = 1;
export const MAX_PUSHFOLD_BB = 25;
const ALWAYS = Infinity;

const SHOVE_THRESHOLD = {
  AA: ALWAYS, KK: ALWAYS, QQ: ALWAYS, JJ: ALWAYS, TT: ALWAYS,
  '99': ALWAYS, '88': ALWAYS, '77': ALWAYS, '66': ALWAYS, '55': ALWAYS,
  '44': ALWAYS, '33': ALWAYS, '22': ALWAYS,
  AKs: ALWAYS, AQs: ALWAYS, AJs: ALWAYS, ATs: ALWAYS, A9s: ALWAYS,
  A8s: ALWAYS, A7s: ALWAYS, A6s: ALWAYS, A5s: ALWAYS, A4s: ALWAYS,
  A3s: ALWAYS, A2s: ALWAYS,
  AKo: ALWAYS, AQo: ALWAYS, AJo: ALWAYS, ATo: ALWAYS, A9o: 25,
  A8o: 25, A7o: 22, A6o: 19, A5o: 25, A4o: 22, A3o: 20, A2o: 19,
  KQs: ALWAYS, KJs: ALWAYS, KTs: ALWAYS, K9s: ALWAYS, K8s: 25,
  K7s: 25, K6s: 25, K5s: 25, K4s: 24, K3s: 23, K2s: 22,
  KQo: ALWAYS, KJo: 25, KTo: 25, K9o: 22, K8o: 16, K7o: 14,
  K6o: 12, K5o: 11, K4o: 10, K3o: 9, K2o: 9,
  QJs: ALWAYS, QTs: ALWAYS, Q9s: 25, Q8s: 25, Q7s: 18,
  Q6s: 17, Q5s: 16, Q4s: 15, Q3s: 14, Q2s: 13,
  QJo: 25, QTo: 25, Q9o: 16, Q8o: 11, Q7o: 8, Q6o: 7,
  Q5o: 6, Q4o: 5, Q3o: 4, Q2o: 4,
  JTs: ALWAYS, J9s: 25, J8s: 25, J7s: 18, J6s: 12,
  J5s: 11, J4s: 10, J3s: 9, J2s: 8,
  JTo: 25, J9o: 15, J8o: 10, J7o: 7, J6o: 4,
  J5o: 4, J4o: 3, J3o: 3, J2o: 3,
  T9s: 25, T8s: 25, T7s: 18, T6s: 13, T5s: 8,
  T4s: 6, T3s: 5, T2s: 5,
  T9o: 15, T8o: 9, T7o: 6, T6o: 4, T5o: 3, T4o: 2, T3o: 2, T2o: 2,
  '98s': 25, '97s': 20, '96s': 13, '95s': 8, '94s': 4, '93s': 3, '92s': 3,
  '98o': 12, '97o': 7, '96o': 4, '95o': 3, '94o': 2, '93o': 2, '92o': 2,
  '87s': 22, '86s': 16, '85s': 10, '84s': 5, '83s': 3, '82s': 2,
  '87o': 9, '86o': 5, '85o': 3, '84o': 2, '83o': 2, '82o': 2,
  '76s': 20, '75s': 14, '74s': 7, '73s': 4, '72s': 2,
  '76o': 7, '75o': 4, '74o': 2, '73o': 2, '72o': 2,
  '65s': 18, '64s': 11, '63s': 5, '62s': 3,
  '65o': 5, '64o': 3, '63o': 2, '62o': 2,
  '54s': 16, '53s': 9, '52s': 4,
  '54o': 4, '53o': 2, '52o': 2,
  '43s': 8, '42s': 4, '43o': 2, '42o': 2,
  '32s': 3, '32o': 2,
};

const CALL_THRESHOLD = {
  AA: ALWAYS, KK: ALWAYS, QQ: ALWAYS, JJ: ALWAYS, TT: ALWAYS,
  '99': ALWAYS, '88': ALWAYS, '77': 25, '66': 25, '55': 25,
  '44': 22, '33': 20, '22': 18,
  AKs: ALWAYS, AQs: ALWAYS, AJs: ALWAYS, ATs: ALWAYS, A9s: 25,
  A8s: 25, A7s: 25, A6s: 22, A5s: 25, A4s: 24, A3s: 23, A2s: 22,
  AKo: ALWAYS, AQo: ALWAYS, AJo: 25, ATo: 25, A9o: 22,
  A8o: 18, A7o: 16, A6o: 13, A5o: 15, A4o: 13, A3o: 12, A2o: 11,
  KQs: ALWAYS, KJs: 25, KTs: 25, K9s: 22, K8s: 17,
  K7s: 15, K6s: 13, K5s: 12, K4s: 11, K3s: 10, K2s: 10,
  KQo: 25, KJo: 22, KTo: 20, K9o: 14, K8o: 9, K7o: 7,
  K6o: 5, K5o: 5, K4o: 4, K3o: 4, K2o: 3,
  QJs: 25, QTs: 25, Q9s: 18, Q8s: 13, Q7s: 9,
  Q6s: 8, Q5s: 7, Q4s: 6, Q3s: 5, Q2s: 5,
  QJo: 18, QTo: 15, Q9o: 9, Q8o: 6, Q7o: 4, Q6o: 3,
  Q5o: 3, Q4o: 2, Q3o: 2, Q2o: 2,
  JTs: 25, J9s: 18, J8s: 13, J7s: 9, J6s: 6,
  J5s: 5, J4s: 4, J3s: 4, J2s: 3,
  JTo: 14, J9o: 8, J8o: 5, J7o: 3, J6o: 2,
  J5o: 2, J4o: 2, J3o: 2, J2o: 2,
  T9s: 18, T8s: 13, T7s: 9, T6s: 6, T5s: 4, T4s: 3, T3s: 2, T2s: 2,
  T9o: 8, T8o: 5, T7o: 3, T6o: 2, T5o: 2, T4o: 2,
  '98s': 13, '97s': 9, '96s': 6, '95s': 4, '94s': 2, '93s': 2,
  '98o': 5, '97o': 3, '96o': 2, '95o': 2,
  '87s': 11, '86s': 8, '85s': 5, '84s': 3, '83s': 2,
  '87o': 4, '86o': 2, '85o': 2,
  '76s': 9, '75s': 6, '74s': 3, '73s': 2,
  '76o': 3, '75o': 2,
  '65s': 8, '64s': 5, '63s': 2, '65o': 2,
  '54s': 7, '53s': 3, '52s': 2,
  '43s': 3, '42s': 2, '32s': 2,
};

export function allHandNames() {
  const names = [];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    for (let j = RANKS.length - 1; j >= 0; j--) {
      if (i === j) names.push(`${RANKS[i]}${RANKS[j]}`);
      else if (i > j) names.push(`${RANKS[i]}${RANKS[j]}s`);
      else names.push(`${RANKS[j]}${RANKS[i]}o`);
    }
  }
  return names;
}

function clampStack(bb) {
  if (bb < MIN_PUSHFOLD_BB) return MIN_PUSHFOLD_BB;
  if (bb > MAX_PUSHFOLD_BB) return MAX_PUSHFOLD_BB;
  return bb;
}

export function isShove(hand, effStackBB) {
  return clampStack(effStackBB) <= (SHOVE_THRESHOLD[hand] ?? 0);
}

export function isCall(hand, effStackBB) {
  return clampStack(effStackBB) <= (CALL_THRESHOLD[hand] ?? 0);
}

export function handFromGrid(row, col) {
  const hi = RANKS[12 - row];
  const lo = RANKS[12 - col];
  if (row === col) return `${hi}${lo}`;
  if (col > row) return `${hi}${lo}s`;
  return `${lo}${hi}o`;
}

export const GRID_RANKS = [...RANKS].reverse(); // A..2
