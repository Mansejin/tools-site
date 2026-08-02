/**
 * 6-max RFI charts (Pekarstas), extracted from AHTOOOXA/poker-charts (MIT)
 * https://github.com/AHTOOOXA/poker-charts
 *
 * Sparse maps: unlisted hands = fold.
 * Cell: 'raise' | 'call' | 'allin' | 'fold' | [action, action] (mixed ~50/50)
 */

export const RFI_CHARTS = {
  UTG: {
    '22': ['raise', 'fold'], '33': ['raise', 'fold'], '44': ['raise', 'fold'], '55': 'raise', '66': 'raise',
    '77': 'raise', '87s': ['raise', 'fold'], '88': 'raise', '98s': 'raise', '99': 'raise', A2s: 'raise',
    A3s: 'raise', A4s: 'raise', A5s: 'raise', A6s: 'raise', A7s: 'raise', A8s: 'raise', A9s: 'raise',
    AA: 'raise', AJo: 'raise', AJs: 'raise', AKo: 'raise', AKs: 'raise', AQo: 'raise', AQs: 'raise',
    ATo: ['raise', 'fold'], ATs: 'raise', JJ: 'raise', JTs: 'raise', KJs: 'raise', KK: 'raise',
    KQo: 'raise', KQs: 'raise', KTs: 'raise', QJs: 'raise', QQ: 'raise', QTs: 'raise', T9s: 'raise',
    TT: 'raise',
  },
  MP: {
    '22': ['raise', 'fold'], '33': 'raise', '44': 'raise', '55': 'raise', '65s': 'raise', '66': 'raise',
    '76s': 'raise', '77': 'raise', '87s': 'raise', '88': 'raise', '98s': 'raise', '99': 'raise', A2s: 'raise',
    A3s: 'raise', A4s: 'raise', A5s: 'raise', A6s: 'raise', A7s: 'raise', A8s: 'raise', A9s: 'raise',
    AA: 'raise', AJo: 'raise', AJs: 'raise', AKo: 'raise', AKs: 'raise', AQo: 'raise', AQs: 'raise',
    ATo: 'raise', ATs: 'raise', J9s: 'raise', JJ: 'raise', JTs: 'raise', K8s: 'raise', K9s: 'raise',
    KJo: 'raise', KJs: 'raise', KK: 'raise', KQo: 'raise', KQs: 'raise', KTs: 'raise', Q9s: 'raise',
    QJs: 'raise', QQ: 'raise', QTs: 'raise', T8s: ['raise', 'fold'], T9s: 'raise', TT: 'raise',
  },
  CO: {
    '22': 'raise', '33': 'raise', '44': 'raise', '54s': 'raise', '55': 'raise', '64s': 'raise', '65s': 'raise',
    '66': 'raise', '75s': 'raise', '76s': 'raise', '77': 'raise', '86s': 'raise', '87s': 'raise', '88': 'raise',
    '97s': 'raise', '98s': 'raise', '99': 'raise', A2s: 'raise', A3s: 'raise', A4s: 'raise', A5s: 'raise',
    A6s: 'raise', A7s: 'raise', A8s: 'raise', A9o: ['raise', 'fold'], A9s: 'raise', AA: 'raise',
    AJo: 'raise', AJs: 'raise', AKo: 'raise', AKs: 'raise', AQo: 'raise', AQs: 'raise', ATo: 'raise',
    ATs: 'raise', J7s: 'raise', J8s: 'raise', J9s: 'raise', JJ: 'raise', JTo: 'raise', JTs: 'raise',
    K5s: ['raise', 'fold'], K6s: 'raise', K7s: 'raise', K8s: 'raise', K9s: 'raise', KJo: 'raise',
    KJs: 'raise', KK: 'raise', KQo: 'raise', KQs: 'raise', KTo: 'raise', KTs: 'raise', Q8s: 'raise',
    Q9s: 'raise', QJo: 'raise', QJs: 'raise', QQ: 'raise', QTo: 'raise', QTs: 'raise', T7s: 'raise',
    T8s: 'raise', T9o: ['raise', 'fold'], T9s: 'raise', TT: 'raise',
  },
  BTN: {
    '22': 'raise', '33': 'raise', '43s': ['raise', 'fold'], '44': 'raise', '53s': ['raise', 'fold'], '54s': 'raise',
    '55': 'raise', '63s': ['raise', 'fold'], '64s': 'raise', '65s': 'raise', '66': 'raise', '74s': ['raise', 'fold'],
    '75s': 'raise', '76s': 'raise', '77': 'raise', '85s': ['raise', 'fold'], '86s': 'raise', '87s': 'raise',
    '88': 'raise', '96s': 'raise', '97s': 'raise', '98o': 'raise', '98s': 'raise', '99': 'raise', A2s: 'raise',
    A3s: 'raise', A4o: 'raise', A4s: 'raise', A5o: 'raise', A5s: 'raise', A6o: 'raise', A6s: 'raise',
    A7o: 'raise', A7s: 'raise', A8o: 'raise', A8s: 'raise', A9o: 'raise', A9s: 'raise', AA: 'raise',
    AJo: 'raise', AJs: 'raise', AKo: 'raise', AKs: 'raise', AQo: 'raise', AQs: 'raise', ATo: 'raise',
    ATs: 'raise', J5s: 'raise', J6s: 'raise', J7s: 'raise', J8o: 'raise', J8s: 'raise', J9o: 'raise',
    J9s: 'raise', JJ: 'raise', JTo: 'raise', JTs: 'raise', K2s: 'raise', K3s: 'raise', K4s: 'raise',
    K5s: 'raise', K6s: 'raise', K7s: 'raise', K8o: ['raise', 'fold'], K8s: 'raise', K9o: 'raise',
    K9s: 'raise', KJo: 'raise', KJs: 'raise', KK: 'raise', KQo: 'raise', KQs: 'raise', KTo: 'raise',
    KTs: 'raise', Q2s: 'raise', Q3s: 'raise', Q4s: 'raise', Q5s: 'raise', Q6s: 'raise', Q7s: 'raise',
    Q8o: 'raise', Q8s: 'raise', Q9o: 'raise', Q9s: 'raise', QJo: 'raise', QJs: 'raise', QQ: 'raise',
    QTo: 'raise', QTs: 'raise', T6s: 'raise', T7s: 'raise', T8o: 'raise', T8s: 'raise', T9o: 'raise',
    T9s: 'raise', TT: 'raise',
  },
  SB: {
    '22': 'raise', '33': 'raise', '43s': 'raise', '44': 'raise', '53s': 'raise', '54s': 'raise', '55': 'raise',
    '64s': 'raise', '65s': 'raise', '66': 'raise', '75s': 'raise', '76s': 'raise', '77': 'raise', '86s': 'raise',
    '87s': 'raise', '88': 'raise', '96s': 'raise', '97s': 'raise', '98o': 'raise', '98s': 'raise', '99': 'raise',
    A2s: 'raise', A3s: 'raise', A4o: 'raise', A4s: 'raise', A5o: 'raise', A5s: 'raise', A6o: 'raise',
    A6s: 'raise', A7o: 'raise', A7s: 'raise', A8o: 'raise', A8s: 'raise', A9o: 'raise', A9s: 'raise',
    AA: 'raise', AJo: 'raise', AJs: 'raise', AKo: 'raise', AKs: 'raise', AQo: 'raise', AQs: 'raise',
    ATo: 'raise', ATs: 'raise', J5s: 'raise', J6s: 'raise', J7s: 'raise', J8o: 'raise', J8s: 'raise',
    J9o: 'raise', J9s: 'raise', JJ: 'raise', JTo: 'raise', JTs: 'raise', K2s: 'raise', K3s: 'raise',
    K4s: 'raise', K5s: 'raise', K6s: 'raise', K7s: 'raise', K8o: ['raise', 'fold'], K8s: 'raise',
    K9o: 'raise', K9s: 'raise', KJo: 'raise', KJs: 'raise', KK: 'raise', KQo: 'raise', KQs: 'raise',
    KTo: 'raise', KTs: 'raise', Q3s: 'raise', Q4s: 'raise', Q5s: 'raise', Q6s: 'raise', Q7s: 'raise',
    Q8o: 'raise', Q8s: 'raise', Q9o: 'raise', Q9s: 'raise', QJo: 'raise', QJs: 'raise', QQ: 'raise',
    QTo: 'raise', QTs: 'raise', T6s: 'raise', T7s: 'raise', T8o: 'raise', T8s: 'raise', T9o: 'raise',
    T9s: 'raise', TT: 'raise',
  },
};

export const RFI_POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB'];

/** Primary action for coloring: raise | mixed | fold */
export function cellAction(chart, hand) {
  const cell = chart[hand];
  if (!cell) return 'fold';
  if (Array.isArray(cell)) return 'mixed';
  if (cell === 'allin' || cell === 'raise') return 'raise';
  if (cell === 'call') return 'call';
  return 'fold';
}

export function countInRange(chart) {
  return Object.keys(chart).length;
}
