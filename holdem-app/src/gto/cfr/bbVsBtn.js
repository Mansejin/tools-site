/**
 * Mini chance-sampled CFR: HU SB open vs BB (BTN-open abstraction).
 * Terminal showdown uses strength→sigmoid equity (not full card runouts).
 * ponytail: abstract EV, upgrade to WASM Postflop / TexasSolver for real trees.
 */

import { handFromGrid } from '../pushfoldNash.js';

const OPEN = 2.5;
const THREE = 8.5;
const STACK = 100;

const HANDS = [];
for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) HANDS.push(handFromGrid(r, c));

const RANK_V = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };

function strength(hand) {
  const a = RANK_V[hand[0]];
  const b = RANK_V[hand[1]];
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const pair = hand[0] === hand[1];
  const suited = hand.endsWith('s');
  const gap = hi - lo;
  let s = hi * 2 + lo * 0.35;
  if (pair) s = hi * 6.5 + 8;
  if (suited) s += 2.2;
  if (!pair && gap <= 1) s += 1.8;
  else if (!pair && gap === 2) s += 0.8;
  if ((hi === 14 || hi === 13) && !pair) s += 1.5;
  return s;
}

function equity(h0, h1) {
  const d = strength(h0) - strength(h1);
  return 1 / (1 + Math.exp(-d / 9));
}

function randHand(avoid) {
  for (let i = 0; i < 12; i++) {
    const h = HANDS[(Math.random() * 169) | 0];
    if (h !== avoid) return h;
  }
  return HANDS[0] === avoid ? HANDS[1] : HANDS[0];
}

function regretMatch(regrets, n) {
  const strat = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = regrets[i] > 0 ? regrets[i] : 0;
    strat[i] = v;
    sum += v;
  }
  if (sum <= 0) {
    const u = 1 / n;
    for (let i = 0; i < n; i++) strat[i] = u;
    return strat;
  }
  for (let i = 0; i < n; i++) strat[i] /= sum;
  return strat;
}

function avgStrat(sum, n) {
  const out = new Float64Array(n);
  let t = 0;
  for (let i = 0; i < n; i++) t += sum[i];
  if (t <= 0) {
    for (let i = 0; i < n; i++) out[i] = 1 / n;
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = sum[i] / t;
  return out;
}

function key(seat, hand, node) {
  return `${seat}|${hand}|${node}`;
}

/**
 * Utility for player 0 (SB/BTN opener), in bb.
 * Nodes: sb_root, bb_vs, sb_vs3, bb_vs_jam
 */
function createSolver() {
  const regret = new Map();
  const stratSum = new Map();

  function get(k, n) {
    let r = regret.get(k);
    if (!r) {
      r = new Float64Array(n);
      regret.set(k, r);
      stratSum.set(k, new Float64Array(n));
    }
    return r;
  }

  function showdown(pot, invest0, invest1, h0, h1) {
    const eq = equity(h0, h1);
    // chip EV for p0 relative to start-of-hand (blinds already posted: p0=0.5 p1=1)
    // pot contains all chips; winner takes pot; utility = pot*eq - invest0 (approx expected)
    return pot * eq - invest0;
  }

  /** @returns util for player 0 */
  function traverse(node, h0, h1, p0, p1, updatePlayer) {
    if (node === 'sb_fold') {
      // SB folds: loses 0.5, BB wins
      return -0.5;
    }
    if (node === 'bb_fold_open') {
      // BB folds to open: SB wins pot 1.5+2? SB invested OPEN, BB invested 1
      // SB profit = +1 (bb dead blind)
      return +1;
    }
    if (node === 'sd_open') {
      // BB called open. pot = 1.5 + OPEN + (OPEN-1) = OPEN*2 + 0.5? 
      // blinds 1.5, SB to OPEN total so adds OPEN-0.5, BB adds OPEN-1
      const invest0 = OPEN;
      const invest1 = OPEN;
      const pot = invest0 + invest1;
      return showdown(pot, invest0, invest1, h0, h1);
    }
    if (node === 'sb_fold_3') {
      // SB folds to 3bet: loses OPEN, BB wins
      return -OPEN;
    }
    if (node === 'bb_fold_jam') {
      // BB folds to jam: SB wins pot built to THREE? jam is all-in STACK
      // After 3bet to THREE, SB jams STACK. BB folds → SB wins THREE + blinds structure
      // SB invested STACK at fold time... BB had put THREE. SB profit ≈ THREE (BB's 3bet) roughly -OPEN wait
      // invest1=THREE, invest0 was THREE then jam more - if BB folds to jam, SB wins pot = 1.5-ish + THREE from BB + OPEN already...
      // Simplify: pot when BB faces jam = STACK + THREE, BB folds → SB gets +THREE (their 3bet) net of...
      return +(THREE - OPEN); // crude: pick up BB's 3bet excess over open
    }
    if (node === 'sd_3bet_call') {
      const invest0 = THREE;
      const invest1 = THREE;
      const pot = invest0 + invest1;
      return showdown(pot, invest0, invest1, h0, h1);
    }
    if (node === 'sd_jam') {
      const invest0 = STACK;
      const invest1 = STACK;
      const pot = invest0 + invest1;
      return showdown(pot, invest0, invest1, h0, h1);
    }

    // Decision nodes
    if (node === 'sb_root') {
      const acts = ['F', 'R'];
      const k = key('SB', h0, node);
      const r = get(k, 2);
      const strat = regretMatch(r, 2);
      if (updatePlayer === 0) {
        const ss = stratSum.get(k);
        for (let i = 0; i < 2; i++) ss[i] += p0 * strat[i];
      }
      const utils = new Float64Array(2);
      utils[0] = traverse('sb_fold', h0, h1, p0 * strat[0], p1, updatePlayer);
      utils[1] = traverse('bb_vs', h0, h1, p0 * strat[1], p1, updatePlayer);
      let nodeUtil = 0;
      for (let i = 0; i < 2; i++) nodeUtil += strat[i] * utils[i];
      if (updatePlayer === 0) {
        for (let i = 0; i < 2; i++) r[i] += p1 * (utils[i] - nodeUtil);
      }
      return nodeUtil;
    }

    if (node === 'bb_vs') {
      const acts = ['F', 'C', 'R'];
      const k = key('BB', h1, node);
      const r = get(k, 3);
      const strat = regretMatch(r, 3);
      if (updatePlayer === 1) {
        const ss = stratSum.get(k);
        for (let i = 0; i < 3; i++) ss[i] += p1 * strat[i];
      }
      // utils for p0; when updating p1, regrets use -util
      const uF = traverse('bb_fold_open', h0, h1, p0, p1 * strat[0], updatePlayer);
      const uC = traverse('sd_open', h0, h1, p0, p1 * strat[1], updatePlayer);
      const uR = traverse('sb_vs3', h0, h1, p0, p1 * strat[2], updatePlayer);
      const utils = [uF, uC, uR];
      let nodeUtil = 0;
      for (let i = 0; i < 3; i++) nodeUtil += strat[i] * utils[i];
      if (updatePlayer === 1) {
        for (let i = 0; i < 3; i++) r[i] += p0 * (-utils[i] - -nodeUtil);
      }
      return nodeUtil;
    }

    if (node === 'sb_vs3') {
      const k = key('SB', h0, node);
      const r = get(k, 3);
      const strat = regretMatch(r, 3);
      if (updatePlayer === 0) {
        const ss = stratSum.get(k);
        for (let i = 0; i < 3; i++) ss[i] += p0 * strat[i];
      }
      const uF = traverse('sb_fold_3', h0, h1, p0 * strat[0], p1, updatePlayer);
      const uC = traverse('sd_3bet_call', h0, h1, p0 * strat[1], p1, updatePlayer);
      const uJ = traverse('bb_vs_jam', h0, h1, p0 * strat[2], p1, updatePlayer);
      const utils = [uF, uC, uJ];
      let nodeUtil = 0;
      for (let i = 0; i < 3; i++) nodeUtil += strat[i] * utils[i];
      if (updatePlayer === 0) {
        for (let i = 0; i < 3; i++) r[i] += p1 * (utils[i] - nodeUtil);
      }
      return nodeUtil;
    }

    if (node === 'bb_vs_jam') {
      const k = key('BB', h1, node);
      const r = get(k, 2);
      const strat = regretMatch(r, 2);
      if (updatePlayer === 1) {
        const ss = stratSum.get(k);
        for (let i = 0; i < 2; i++) ss[i] += p1 * strat[i];
      }
      const uF = traverse('bb_fold_jam', h0, h1, p0, p1 * strat[0], updatePlayer);
      const uC = traverse('sd_jam', h0, h1, p0, p1 * strat[1], updatePlayer);
      const utils = [uF, uC];
      let nodeUtil = 0;
      for (let i = 0; i < 2; i++) nodeUtil += strat[i] * utils[i];
      if (updatePlayer === 1) {
        for (let i = 0; i < 2; i++) r[i] += p0 * (-utils[i] - -nodeUtil);
      }
      return nodeUtil;
    }

    return 0;
  }

  function iterate(n) {
    for (let t = 0; t < n; t++) {
      const h0 = randHand(null);
      const h1 = randHand(h0);
      traverse('sb_root', h0, h1, 1, 1, 0);
      traverse('sb_root', h0, h1, 1, 1, 1);
    }
  }

  function toPack() {
    const openBtn = {};
    const vsOpenBb = {};
    for (const h of HANDS) {
      const sbRoot = avgStrat(stratSum.get(key('SB', h, 'sb_root')) || new Float64Array(2), 2);
      const bbVs = avgStrat(stratSum.get(key('BB', h, 'bb_vs')) || new Float64Array(3), 3);
      // open|BTN|* — Raise vs Fold
      openBtn[h] = {
        fold: Math.round(sbRoot[0] * 100),
        raise: Math.round(sbRoot[1] * 100),
        call: 0,
        shove: 0,
      };
      // vs_open|BB|* — Fold / Call / Raise (3bet); no shove at this node
      vsOpenBb[h] = {
        fold: Math.round(bbVs[0] * 100),
        call: Math.round(bbVs[1] * 100),
        raise: Math.round(bbVs[2] * 100),
        shove: 0,
      };
      // fix rounding
      const fix = (o, keys) => {
        let s = keys.reduce((a, k) => a + o[k], 0);
        o.fold += 100 - s;
      };
      fix(openBtn[h], ['fold', 'raise', 'call', 'shove']);
      fix(vsOpenBb[h], ['fold', 'call', 'raise', 'shove']);
    }
    return {
      v: 1,
      name: '미니 CFR · BB vs 오픈',
      note: `chance-sampled CFR ${OPEN}/${THREE}/${STACK}bb · strength equity 근사. 실솔버 아님.`,
      spots: {
        'open|BTN|*': openBtn,
        'open|SB|*': openBtn,
        'vs_open|BB|*': vsOpenBb,
      },
    };
  }

  return { iterate, toPack };
}

/** Run solver; yield to UI every chunk. */
export async function solveBbVsBtnPack(iterations = 80000, onProgress) {
  const solver = createSolver();
  const chunk = 4000;
  let done = 0;
  while (done < iterations) {
    const n = Math.min(chunk, iterations - done);
    solver.iterate(n);
    done += n;
    onProgress?.(done / iterations);
    await new Promise((r) => setTimeout(r, 0));
  }
  return solver.toPack();
}
