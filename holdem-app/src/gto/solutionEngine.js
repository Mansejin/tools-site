/**
 * Map unlocked solution settings → playable strategy.
 * Sources: HU Nash push/fold (≤25bb exact table; deeper uses clamp),
 * 6-max RFI (Pekarstas), ICM/event as tightened Nash heuristic.
 */

import { isShove, isCall, handFromGrid, GRID_RANKS } from './pushfoldNash.js';
import { RFI_CHARTS, cellAction } from './rfiCharts.js';

/** How much tighter than chip-EV Nash (threshold multiplier). */
function tightness(format) {
  if (format === 'icm') return 0.72;
  if (format === 'event') return 0.85;
  return 1;
}

function effectiveStack(stack, format) {
  // ICM/Event: behave as if shorter (tighter)
  return Math.max(1, Math.round(stack * tightness(format)));
}

function isHuLike(cfg) {
  return cfg.format === 'hu' || cfg.solution === 'hu_sng' || cfg.players === 2;
}

function isShort(cfg) {
  return cfg.stack <= 25 || cfg.solution === 'spin';
}

/** RFI position set for N-max. */
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
  if (isHuLike(cfg) || isShort(cfg)) {
    const mode = 'nash_pushfold';
    const note =
      cfg.stack > 25
        ? `딥스택 푸시/폴드는 25bb Nash로 클램프 (공개 표 한계).`
        : `헤즈업 Nash 푸시/폴드${cfg.format === 'icm' ? ' + ICM 타이트닝' : ''}.`;
    return { mode, note, fidelity: cfg.stack <= 25 && (cfg.format === 'chipev' || cfg.format === 'hu') ? 'exact' : 'approx' };
  }
  return {
    mode: 'rfi',
    note: `6-max RFI 차트 기준 · ${cfg.players}인 테이블에 포지션 매핑${cfg.betSize === 'multi' ? ' (멀티사이즈는 혼합빈도 표시)' : ''}.`,
    fidelity: 'approx',
  };
}

/**
 * Action for a hand under current solution + spot.
 * spot: { pos: 'SB'|'BB'|'UTG'|... }
 * returns: 'shove'|'call'|'raise'|'fold'|'mixed'
 */
export function actionFor(cfg, hand, spot = {}) {
  const pos = spot.pos || positionsFor(cfg)[0].id;
  const meta = engineMeta(cfg);

  if (meta.mode === 'nash_pushfold') {
    const eff = effectiveStack(Math.min(cfg.stack, 25), cfg.format);
    if (pos === 'BB') return isCall(hand, eff) ? 'call' : 'fold';
    return isShove(hand, eff) ? 'shove' : 'fold';
  }

  // RFI / open
  const chart = RFI_CHARTS[pos] || RFI_CHARTS.UTG;
  const a = cellAction(chart, hand);
  if (a === 'mixed') return cfg.betSize === 'multi' ? 'mixed' : 'raise';
  if (a === 'raise' || a === 'allin') return a === 'allin' ? 'shove' : 'raise';
  if (a === 'call') return 'call';
  return 'fold';
}

/** GTO Wizard–style 2-way quiz: correct binary decision for spot. */
export function correctBinary(cfg, hand, spot) {
  const a = actionFor(cfg, hand, spot);
  return a !== 'fold';
}

export function randomSpot(cfg) {
  const positions = positionsFor(cfg);
  const pos = positions[Math.floor(Math.random() * positions.length)].id;
  // weight in-range-ish by sampling until ~40% chance of interesting hands
  let hand = handFromGrid(Math.floor(Math.random() * 13), Math.floor(Math.random() * 13));
  for (let i = 0; i < 4; i++) {
    const h = handFromGrid(Math.floor(Math.random() * 13), Math.floor(Math.random() * 13));
    if (correctBinary(cfg, h, { pos }) || Math.random() < 0.35) {
      hand = h;
      break;
    }
    hand = h;
  }
  return { pos, hand };
}

export function gridGetter(cfg, spot) {
  const pos = spot?.pos || positionsFor(cfg)[0].id;
  return (hand) => actionFor(cfg, hand, { pos });
}

export { GRID_RANKS, handFromGrid };
