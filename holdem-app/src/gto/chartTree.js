/**
 * Preflop action-tree navigator for charts (GTOW-style drill-down).
 * Uses existing freqs/packs — not a full solver tree.
 */
import { seatsForPlayers } from './solutionEngine.js';

const PF_LABEL = {
  open: 'RFI',
  vs_open: 'vs 오픈',
  vs_3bet: 'vs 3벳',
  vs_4bet: 'vs 4벳',
  vs_limp: 'vs 림프',
};

const ACT_LABEL = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  shove: 'All-in',
};

function shortStack(cfg) {
  return cfg.stack <= 20 || cfg.solution === 'spin' || cfg.format === 'hu' || cfg.players === 2;
}

export function rootNode(cfg) {
  const seats = seatsForPlayers(cfg.players);
  return {
    seat: seats[0],
    pfAction: 'open',
    opener: null,
    threeBettor: null,
    terminal: null,
  };
}

export function pfLabel(pf) {
  return PF_LABEL[pf] || pf;
}

export function actionLabel(id, node) {
  if (id === 'raise' && node?.pfAction === 'vs_open') return '3bet';
  if (id === 'raise' && node?.pfAction === 'vs_3bet') return '4bet';
  if (id === 'raise' && node?.pfAction === 'vs_4bet') return '5bet';
  return ACT_LABEL[id] || id;
}

export function nodeTitle(node, cfg) {
  if (node.terminal) {
    const t = {
      walk: 'BB 워크 · 핸드 종료',
      open_takes: '오픈 승리 · 핸드 종료',
      to_flop: '콜 → 포스트플랍 (차트 없음)',
      '3bet_takes': '3벳 승리 · 핸드 종료',
      '4bet_takes': '4벳 승리 · 핸드 종료',
      '5bet': '5벳 라인 · 핸드 종료',
    };
    return t[node.terminal] || '프리플랍 종료';
  }
  let s = `${node.seat} · ${pfLabel(node.pfAction)}`;
  if (node.pfAction === 'vs_open' && node.opener) s += ` · ${node.opener} 오픈`;
  if (node.pfAction === 'vs_3bet' && node.threeBettor) s += ` · ${node.threeBettor} 3벳`;
  if (node.pfAction === 'vs_4bet') s += ` · ${node.opener} 4벳`;
  return `${s} · ${cfg.stack}bb`;
}

export function availableActions(node, cfg) {
  if (node.terminal) return [];
  const short = shortStack(cfg);
  if (node.pfAction === 'open') {
    return short
      ? [
          { id: 'fold', label: 'Fold' },
          { id: 'shove', label: 'All-in' },
        ]
      : [
          { id: 'fold', label: 'Fold' },
          { id: 'raise', label: 'Raise' },
        ];
  }
  if (node.pfAction === 'vs_open') {
    return short
      ? [
          { id: 'fold', label: 'Fold' },
          { id: 'call', label: 'Call' },
          { id: 'shove', label: 'All-in' },
        ]
      : [
          { id: 'fold', label: 'Fold' },
          { id: 'call', label: 'Call' },
          { id: 'raise', label: '3bet' },
        ];
  }
  if (node.pfAction === 'vs_3bet' || node.pfAction === 'vs_4bet') {
    return [
      { id: 'fold', label: 'Fold' },
      { id: 'call', label: 'Call' },
      { id: 'raise', label: node.pfAction === 'vs_3bet' ? '4bet' : '5bet' },
    ];
  }
  return [
    { id: 'fold', label: 'Fold' },
    { id: 'raise', label: 'Raise' },
  ];
}

export function advance(node, actionId, cfg) {
  if (node.terminal) return node;
  const seats = seatsForPlayers(cfg.players);
  const i = seats.indexOf(node.seat);
  const nextSeat = i >= 0 && i + 1 < seats.length ? seats[i + 1] : null;
  const done = (terminal) => ({ ...node, terminal });

  if (node.pfAction === 'open') {
    if (actionId === 'fold') {
      if (!nextSeat || nextSeat === 'BB') return done('walk');
      return {
        seat: nextSeat,
        pfAction: 'open',
        opener: null,
        threeBettor: null,
        terminal: null,
      };
    }
    // raise / shove
    if (!nextSeat) return done('open_takes');
    return {
      seat: nextSeat,
      pfAction: 'vs_open',
      opener: node.seat,
      threeBettor: null,
      terminal: null,
    };
  }

  if (node.pfAction === 'vs_open') {
    if (actionId === 'fold') {
      if (!nextSeat) return done('open_takes');
      return {
        seat: nextSeat,
        pfAction: 'vs_open',
        opener: node.opener,
        threeBettor: null,
        terminal: null,
      };
    }
    if (actionId === 'call') return done('to_flop');
    // 3bet / shove → back to opener
    return {
      seat: node.opener,
      pfAction: 'vs_3bet',
      opener: node.opener,
      threeBettor: node.seat,
      terminal: null,
    };
  }

  if (node.pfAction === 'vs_3bet') {
    if (actionId === 'fold') return done('3bet_takes');
    if (actionId === 'call') return done('to_flop');
    return {
      seat: node.threeBettor,
      pfAction: 'vs_4bet',
      opener: node.opener,
      threeBettor: node.threeBettor,
      terminal: null,
    };
  }

  if (node.pfAction === 'vs_4bet') {
    if (actionId === 'fold') return done('4bet_takes');
    if (actionId === 'call') return done('to_flop');
    return done('5bet');
  }

  return done('to_flop');
}

export function crumbLabel(node, actionId) {
  if (!actionId) return `${node.seat} ${pfLabel(node.pfAction)}`;
  return `${node.seat} ${actionLabel(actionId, node)}`;
}
