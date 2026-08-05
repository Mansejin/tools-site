/**
 * Map unlocked solution settings → strategy frequencies + training scenarios.
 * Sources: HU Nash push/fold, 6-max RFI; ICM/event = tighter heuristic.
 */

import { isShove, isCall, handFromGrid, GRID_RANKS } from './pushfoldNash.js';
import { RFI_CHARTS, cellAction } from './rfiCharts.js';
import { packFrequencies, packSummary } from './myPack.js';

function tightness(format) {
  if (format === 'icm') return 0.72;
  if (format === 'event') return 0.85;
  return 1;
}

function effectiveStack(stack, format) {
  return Math.max(1, Math.round(stack * tightness(format)));
}

function isHuLike(cfg) {
  return cfg.format === 'hu' || cfg.solution === 'hu_sng' || cfg.players === 2;
}

function isShort(cfg) {
  return cfg.stack <= 25 || cfg.solution === 'spin';
}

function rfiPosForPlayers(players) {
  if (players <= 3) return ['BTN', 'SB'];
  if (players <= 5) return ['CO', 'BTN', 'SB'];
  if (players <= 7) return ['MP', 'CO', 'BTN', 'SB'];
  return ['UTG', 'MP', 'CO', 'BTN', 'SB'];
}

export function positionsFor(cfg) {
  if (isHuLike(cfg) || (isShort(cfg) && cfg.stack <= 20)) {
    return [
      { id: 'SB', label: 'SB 잼' },
      { id: 'BB', label: 'BB 콜' },
    ];
  }
  return rfiPosForPlayers(cfg.players).map((id) => ({ id, label: `${id} RFI` }));
}

export function engineMeta(cfg) {
  const pack = packSummary();
  const packNote = pack ? ` · 내 팩「${pack.name}」${pack.nHands}핸드` : '';
  if (isHuLike(cfg) || isShort(cfg)) {
    return {
      mode: 'nash_pushfold',
      note:
        (cfg.stack > 25
          ? `딥스택 푸시/폴드는 25bb Nash로 클램프.`
          : `헤즈업 Nash 푸시/폴드${cfg.format === 'icm' ? ' + ICM 타이트닝' : ''}.`) + packNote,
      fidelity:
        pack || (cfg.stack <= 25 && (cfg.format === 'chipev' || cfg.format === 'hu'))
          ? pack
            ? 'pack'
            : 'exact'
          : 'approx',
      pack,
    };
  }
  return {
    mode: 'rfi',
    note: `6-max RFI · ${cfg.players}인 매핑${cfg.betSize === 'multi' ? ' · 혼합빈도' : ''}.${packNote}`,
    fidelity: pack ? 'pack' : 'approx',
    pack,
  };
}

const PREMIUM_3BET = new Set([
  'AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'KQs',
]);
const STRONG_CALL = new Set([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'ATs',
  'KQs', 'KJs', 'QJs', 'JTs', 'AJo', 'KQo',
]);
const FOURBET = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);

function norm(freqs) {
  const keys = ['fold', 'call', 'raise', 'shove'];
  let s = 0;
  const out = {};
  for (const k of keys) {
    out[k] = Math.max(0, freqs[k] || 0);
    s += out[k];
  }
  if (s <= 0) return { fold: 100, call: 0, raise: 0, shove: 0 };
  for (const k of keys) out[k] = Math.round((out[k] / s) * 100);
  // fix rounding to 100
  const diff = 100 - keys.reduce((a, k) => a + out[k], 0);
  out.fold += diff;
  return out;
}

function openSize(cfg) {
  return cfg.betSize === 'multi' ? 2.5 : 2.2;
}

function threeBetTo(cfg) {
  return cfg.betSize === 'multi' ? 9 : 8;
}

/** Primary label for charts */
export function actionFor(cfg, hand, spot = {}) {
  const f = strategyFrequencies(cfg, hand, spot);
  let best = 'fold';
  let max = -1;
  for (const k of ['shove', 'raise', 'call', 'fold']) {
    if ((f[k] || 0) > max) {
      max = f[k];
      best = k;
    }
  }
  if (best === 'raise' && f.raise === f.fold && f.raise > 0) return 'mixed';
  return best;
}

/**
 * Frequency map 0–100 summing ~100.
 * spot: { pos, pfAction }
 */
export function strategyFrequencies(cfg, hand, spot = {}) {
  const pf = spot.pfAction || 'open';
  const pos = spot.pos || 'BTN';
  const stack = cfg.stack;
  const short = stack <= 20;

  // Personal pack wins when the hand is defined for this spot
  const packed = packFrequencies(hand, { pfAction: pf, pos }, stack);
  if (packed) return packed;

  const mode = isHuLike(cfg) || isShort(cfg) ? 'nash_pushfold' : 'rfi';

  // Face 3-bet / 4-bet / squeeze as aggressor
  if (['vs_3bet', 'vs_4bet', 'vs_5bet', 'vs_squeeze', 'vs_raise_call'].includes(pf)) {
    if (FOURBET.has(hand) || (short && PREMIUM_3BET.has(hand))) {
      return norm({ shove: short || pf !== 'vs_3bet' ? 85 : 40, raise: short ? 0 : 45, call: 10, fold: 5 });
    }
    if (STRONG_CALL.has(hand)) {
      return norm({ call: 55, fold: 35, raise: 10, shove: 0 });
    }
    return norm({ fold: 90, call: 10 });
  }

  // BB / blinds defending vs open / limp / iso
  if (['vs_open', 'vs_limp', 'vs_iso'].includes(pf) || pos === 'BB') {
    if (mode === 'nash_pushfold' || short) {
      const eff = effectiveStack(Math.min(stack, 25), cfg.format);
      if (isCall(hand, eff)) {
        if (isShove(hand, Math.min(eff, 12)) && stack <= 15) return norm({ shove: 70, call: 25, fold: 5 });
        return norm({ call: 75, fold: 15, raise: 10 });
      }
      if (PREMIUM_3BET.has(hand)) return norm({ raise: 60, call: 25, fold: 15 });
      return norm({ fold: 100 });
    }
    // deep BB vs open
    if (PREMIUM_3BET.has(hand)) return norm({ raise: 55, call: 35, fold: 10 });
    if (STRONG_CALL.has(hand) || cellAction(RFI_CHARTS.BTN, hand) !== 'fold') {
      return norm({ call: 70, fold: 20, raise: 10 });
    }
    return norm({ fold: 92, call: 8 });
  }

  // Open / RFI / from start / all
  if (mode === 'nash_pushfold' || short) {
    const eff = effectiveStack(Math.min(stack, 25), cfg.format);
    if (isShove(hand, eff)) return norm({ shove: 100 });
    return norm({ fold: 100 });
  }

  const chart = RFI_CHARTS[pos] || RFI_CHARTS.UTG;
  const a = cellAction(chart, hand);
  if (a === 'mixed') return norm({ raise: 50, fold: 50 });
  if (a === 'raise' || a === 'allin') {
    if (stack <= 30 && (a === 'allin' || PREMIUM_3BET.has(hand))) return norm({ shove: 35, raise: 65 });
    return norm({ raise: 100 });
  }
  if (a === 'call') return norm({ call: 100 });
  return norm({ fold: 100 });
}

export function scoreChoice(freqs, choice) {
  const f = freqs[choice] || 0;
  const best = Math.max(freqs.fold || 0, freqs.call || 0, freqs.raise || 0, freqs.shove || 0);
  if (f <= 0) return { grade: 'blunder', label: '실수', pts: 0, freq: 0 };
  if (f >= best) return { grade: 'best', label: '최적', pts: 100, freq: f };
  if (f >= 25) return { grade: 'good', label: '적절', pts: f, freq: f };
  return { grade: 'meh', label: '부정확', pts: f, freq: f };
}

export function correctBinary(cfg, hand, spot) {
  const f = strategyFrequencies(cfg, hand, spot);
  return (f.call || 0) + (f.raise || 0) + (f.shove || 0) >= (f.fold || 0);
}

const ORDER_9 = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function seatsForPlayers(n) {
  if (n <= 2) return ['SB', 'BB'];
  if (n <= 3) return ['BTN', 'SB', 'BB'];
  if (n <= 6) return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  return ORDER_9.slice(0, n);
}

function mapHeroSeat(hero) {
  if (hero === 'UTG1' || hero === 'LJ' || hero === 'HJ') return 'MP';
  return hero;
}

/**
 * Build a GTOW-like scenario (action line, pot, available buttons).
 */
export function buildScenario(cfg, setup, hand) {
  const hero = setup.hero || 'BTN';
  const pf = setup.pfAction || 'open';
  const seats = seatsForPlayers(cfg.players);
  const openBb = openSize(cfg);
  const stack = cfg.stack;
  const lines = [];
  let pot = 1.5; // SB+BB
  let toCall = 0;
  let raiseTo = openBb;
  let villain = 'CO';

  const before = (seat) => {
    const i = seats.indexOf(seat);
    return i < 0 ? [] : seats.slice(0, i);
  };

  if (pf === 'open' || pf === 'from_start' || pf === 'all') {
    for (const s of before(hero)) {
      if (s === 'SB' || s === 'BB') continue;
      lines.push({ seat: s, text: '폴드' });
    }
    if (hero === 'SB') {
      lines.push({ seat: '히어로 SB', text: '액션 (오픈?)' });
      toCall = 0.5;
      pot = 1.5;
    } else if (hero === 'BB') {
      lines.push({ seat: 'SB', text: '폴드' });
      lines.push({ seat: '히어로 BB', text: '옵션 체크/오픈' });
      toCall = 0;
    } else {
      lines.push({ seat: `히어로 ${hero}`, text: '액션 (오픈?)' });
      toCall = 0;
    }
    raiseTo = openBb;
  } else if (pf === 'vs_open' || pf === 'vs_limp' || pf === 'vs_iso') {
    const openers = seats.filter((s) => s !== 'BB' && s !== hero);
    villain = openers[Math.floor(Math.random() * openers.length)] || 'CO';
    for (const s of before(villain)) {
      if (s === 'SB' || s === 'BB') continue;
      lines.push({ seat: s, text: '폴드' });
    }
    if (pf === 'vs_limp') {
      lines.push({ seat: villain, text: '림프 (1bb)' });
      pot = 2.5;
      toCall = 1;
      raiseTo = 4;
    } else {
      lines.push({ seat: villain, text: `오픈 ${openBb}bb` });
      pot = 1.5 + openBb;
      toCall = openBb - (hero === 'SB' ? 0.5 : hero === 'BB' ? 1 : 0);
      if (toCall < 0) toCall = openBb;
      raiseTo = threeBetTo(cfg);
    }
    for (const s of seats) {
      if (s === villain || s === hero) continue;
      if (ORDER_9.indexOf(s) > ORDER_9.indexOf(villain) && ORDER_9.indexOf(s) < ORDER_9.indexOf(hero)) {
        lines.push({ seat: s, text: '폴드' });
      }
    }
    lines.push({ seat: `히어로 ${hero}`, text: '당신 차례' });
  } else {
    // vs 3bet / 4bet path: hero opened, villain 3bet
    villain = hero === 'BTN' ? 'BB' : 'BTN';
    lines.push({ seat: `히어로 ${hero}`, text: `오픈 ${openBb}bb` });
    pot = 1.5 + openBb;
    const three = threeBetTo(cfg);
    lines.push({ seat: villain, text: pf === 'vs_squeeze' ? `스퀴즈 ${three + 3}bb` : `3벳 ${three}bb` });
    pot = 1.5 + openBb + three;
    toCall = three - openBb;
    raiseTo = Math.min(stack, three * 2.4);
    lines.push({ seat: `히어로 ${hero}`, text: '당신 차례' });
  }

  const enginePos =
    pf.startsWith('vs_') && (pf === 'vs_open' || pf === 'vs_limp' || pf === 'vs_iso')
      ? hero === 'SB'
        ? 'SB'
        : 'BB'
      : mapHeroSeat(hero);

  const freqs = strategyFrequencies(cfg, hand, { pos: enginePos, pfAction: pf });
  const available = ['fold'];
  if (toCall > 0.05) available.push('call');
  // limp-check option for BB without toCall in open case treated as check -> fold button stays, add raise
  if (toCall <= 0.05 && (pf === 'open' || pf === 'from_start' || pf === 'all') && hero === 'BB') {
    // check is free = map to "call" as check
    available.push('call');
  }
  if (stack > toCall + 0.5) available.push('raise');
  if (stack <= 40 || freqs.shove > 0 || stack <= 20) available.push('shove');

  // ensure unique
  const uniq = [...new Set(available)];

  // Seat board state for live table (GTOW-style)
  const betBySeat = {};
  const folded = new Set();
  for (const l of lines) {
    const seat = String(l.seat).replace(/^히어로\s+/, '');
    if (l.text.startsWith('폴드')) folded.add(seat);
    const m = l.text.match(/(?:오픈|림프|3벳|스퀴즈|레이즈)\s*([\d.]+)?/);
    if (m) betBySeat[seat] = Number(m[1] || (l.text.includes('림프') ? 1 : openBb));
  }
  if (hero === 'BB') betBySeat.BB = betBySeat.BB ?? 1;
  if (hero === 'SB' || seats.includes('SB')) betBySeat.SB = betBySeat.SB ?? 0.5;

  const tableSeats = seats.map((id) => ({
    id,
    stack: Math.round((stack - (betBySeat[id] || 0)) * 10) / 10,
    bet: betBySeat[id] || 0,
    folded: folded.has(id) && id !== hero,
    isHero: id === hero,
    isDealer: id === 'BTN' || (seats.length <= 2 && id === 'SB'),
    isActive: id === hero,
  }));

  const titleBits = [];
  if (pf === 'vs_open' || pf === 'vs_limp' || pf === 'vs_iso') titleBits.push(`${hero} vs. ${villain}`);
  else if (pf.startsWith('vs_')) titleBits.push(`${hero} vs ${villain}`);
  else titleBits.push(hero);
  const pfLabel =
    {
      open: '오픈',
      vs_open: 'vs 오픈',
      vs_3bet: 'vs 3벳',
      vs_4bet: 'vs 4벳',
      vs_5bet: 'vs 5벳',
      vs_raise_call: 'vs 레이즈-콜',
      vs_squeeze: 'vs 스퀴즈',
      vs_limp: 'vs 림프',
      vs_iso: 'vs 고립',
      from_start: '처음부터',
      all: '모두',
    }[pf] || pf;
  titleBits.push(pfLabel, `${stack}bb`);

  const spotHistory = lines.map((l, i) => {
    const seat = String(l.seat).replace(/^히어로\s+/, '');
    const fold = l.text.includes('폴드');
    const call = l.text.includes('콜') || l.text.includes('체크');
    const allin = l.text.includes('올인');
    const raiseM = l.text.match(/(?:오픈|림프|3벳|스퀴즈|레이즈)\s*([\d.]+)?/);
    const raise = !!raiseM;
    const raiseAmt = raiseM?.[1] || (l.text.includes('림프') ? '1' : String(openBb));
    const isHeroLine = String(l.seat).startsWith('히어로') || i === lines.length - 1;
    return {
      seat,
      stack: seat === 'SB' && !raise && !allin ? Math.round((stack - 0.5) * 10) / 10 : stack,
      active: isHeroLine && i === lines.length - 1,
      actions: isHeroLine && i === lines.length - 1
        ? [
            { id: 'fold', label: 'Fold', taken: false },
            { id: 'call', label: 'Call', taken: false },
            { id: 'raise', label: `Raise ${raiseTo}`, taken: false },
            { id: 'shove', label: `Allin ${stack}`, taken: false },
          ]
        : [
            { id: 'fold', label: 'Fold', taken: fold },
            ...(call ? [{ id: 'call', label: 'Call', taken: true }] : []),
            { id: 'raise', label: raise ? `Raise ${raiseAmt}` : `Raise ${openBb}`, taken: raise },
            { id: 'shove', label: `Allin ${stack}`, taken: allin },
          ],
    };
  });

  return {
    hand,
    hero,
    villain,
    pfAction: pf,
    enginePos,
    lines,
    title: titleBits.join(', '),
    tableSeats,
    spotHistory,
    pot: Math.round(pot * 10) / 10,
    potOdds: toCall > 0 ? Math.round((toCall / (pot + toCall)) * 1000) / 10 : 0,
    toCall: Math.round(Math.max(0, toCall) * 10) / 10,
    raiseTo: Math.round(raiseTo * 10) / 10,
    openBb,
    stack,
    effective: stack - (hero === 'BB' ? 1 : hero === 'SB' ? 0.5 : 0),
    freqs,
    available: uniq,
    labels: {
      fold: 'Fold',
      call:
        toCall <= 0.05
          ? hero === 'BB' && (pf === 'open' || pf === 'from_start' || pf === 'all')
            ? 'Check'
            : 'Call'
          : `Call`,
      callDetail: toCall > 0.05 ? `${Math.round(toCall * 10) / 10}` : '',
      raise: 'Raise',
      raiseDetail: `${Math.round(raiseTo * 10) / 10}`,
      shove: 'Allin',
      shoveDetail: `${stack}`,
    },
  };
}

export function randomSpot(cfg, setup = {}) {
  const hero = setup.hero || 'BTN';
  const pf = setup.pfAction || 'open';
  const enginePos =
    pf.startsWith('vs_') && !['vs_3bet', 'vs_4bet', 'vs_5bet', 'vs_squeeze', 'vs_raise_call'].includes(pf)
      ? hero === 'SB'
        ? 'SB'
        : 'BB'
      : mapHeroSeat(hero);

  let hand = handFromGrid(Math.floor(Math.random() * 13), Math.floor(Math.random() * 13));
  for (let i = 0; i < 6; i++) {
    const h = handFromGrid(Math.floor(Math.random() * 13), Math.floor(Math.random() * 13));
    const f = strategyFrequencies(cfg, h, { pos: enginePos, pfAction: pf });
    const mix = Object.values(f).filter((x) => x >= 20).length >= 2;
    const interesting = (f.fold || 0) < 95 && (f.fold || 0) > 5;
    if (mix || interesting || Math.random() < 0.25) {
      hand = h;
      break;
    }
    hand = h;
  }
  return buildScenario(cfg, { hero, pfAction: pf }, hand);
}

export function gridGetter(cfg, spot) {
  const pos = spot?.pos || positionsFor(cfg)[0].id;
  return (hand) => actionFor(cfg, hand, { pos, pfAction: spot?.pfAction });
}

export { GRID_RANKS, handFromGrid };
