/**
 * Stockfish WASM via CDN (GPL-3.0).
 * Lite single-thread build — enough for ~800–1200 practice with Skill Level.
 * Falls back to a tiny piece-square minimax if CDN/worker fails.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

export type EngineStrength = 'easy' | 'medium' | 'hard';

const STRENGTH: Record<
  EngineStrength,
  { skill: number; depth: number; movetime: number; label: string }
> = {
  easy: { skill: 3, depth: 6, movetime: 400, label: '쉬움 (~700)' },
  medium: { skill: 6, depth: 8, movetime: 700, label: '보통 (~900)' },
  hard: { skill: 10, depth: 10, movetime: 1000, label: '세게 (~1100)' },
};

const STOCKFISH_CDN =
  'https://cdn.jsdelivr.net/npm/stockfish@17.1.0/src/stockfish-nnue-17-lite-single.js';

type Waiter = {
  pred: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (err: Error) => void;
};

export class ChessEngine {
  private worker: Worker | null = null;
  private ready = false;
  private usingStockfish = false;
  private waiters: Waiter[] = [];
  private strength: EngineStrength = 'medium';

  get mode() {
    return this.usingStockfish ? 'stockfish' : 'fallback';
  }

  get strengthLabel() {
    return STRENGTH[this.strength].label;
  }

  setStrength(s: EngineStrength) {
    this.strength = s;
  }

  async init(): Promise<void> {
    if (this.ready) return;
    try {
      await this.initStockfish();
      this.usingStockfish = true;
    } catch {
      this.usingStockfish = false;
    }
    this.ready = true;
  }

  private async initStockfish(): Promise<void> {
    const src = await fetch(STOCKFISH_CDN).then((r) => {
      if (!r.ok) throw new Error('cdn fetch failed');
      return r.text();
    });
    const blob = new Blob([src], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    this.worker = worker;

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data);
      const still: Waiter[] = [];
      for (const w of this.waiters) {
        if (w.pred(line)) w.resolve(line);
        else still.push(w);
      }
      this.waiters = still;
    };

    worker.onerror = () => {
      for (const w of this.waiters) w.reject(new Error('worker error'));
      this.waiters = [];
    };

    this.post('uci');
    await this.waitFor((l) => l === 'uciok', 8000);
    this.post('isready');
    await this.waitFor((l) => l === 'readyok', 8000);
  }

  private post(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private waitFor(pred: (line: string) => boolean, ms: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.resolve !== resolve);
        reject(new Error('engine timeout'));
      }, ms);
      this.waiters.push({
        pred,
        resolve: (line) => {
          clearTimeout(t);
          resolve(line);
        },
        reject: (err) => {
          clearTimeout(t);
          reject(err);
        },
      });
    });
  }

  async getBestMove(fen: string): Promise<string> {
    await this.init();
    if (this.usingStockfish && this.worker) {
      try {
        return await this.stockfishMove(fen);
      } catch {
        this.usingStockfish = false;
      }
    }
    return fallbackMove(fen, this.strength);
  }

  private async stockfishMove(fen: string): Promise<string> {
    const cfg = STRENGTH[this.strength];
    this.post('ucinewgame');
    this.post(`setoption name Skill Level value ${cfg.skill}`);
    this.post(`position fen ${fen}`);
    this.post(`go depth ${cfg.depth} movetime ${cfg.movetime}`);
    const line = await this.waitFor((l) => l.startsWith('bestmove '), 12000);
    const uci = line.split(/\s+/)[1];
    if (!uci || uci === '(none)') throw new Error('no move');
    return uci;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}

const PIECE_VAL: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

function evaluate(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const v = PIECE_VAL[cell.type];
      score += cell.color === 'w' ? v : -v;
    }
  }
  // Mobility nudge
  const turn = chess.turn();
  const moves = chess.moves().length;
  score += turn === 'w' ? moves * 2 : -moves * 2;
  return score;
}

function fallbackMove(fen: string, strength: EngineStrength): string {
  const chess = new Chess(fen);
  const depth = strength === 'easy' ? 1 : strength === 'medium' ? 2 : 2;
  const maximizing = chess.turn() === 'w';
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return '0000';

  // Easy: sometimes pick random legal move
  if (strength === 'easy' && Math.random() < 0.35) {
    const m = moves[Math.floor(Math.random() * moves.length)]!;
    return m.from + m.to + (m.promotion ?? '');
  }

  let best = moves[0]!;
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const m of moves) {
    chess.move(m);
    const score =
      depth <= 1
        ? evaluate(chess)
        : minimax(chess, depth - 1, -Infinity, Infinity, !maximizing);
    chess.undo();
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best.from + best.to + (best.promotion ?? '');
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (depth === 0 || chess.isGameOver()) {
    if (chess.isCheckmate()) return maximizing ? -50000 : 50000;
    return evaluate(chess);
  }
  const moves = chess.moves({ verbose: true });
  if (maximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      chess.move(m);
      const ev = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  }
  let minEval = Infinity;
  for (const m of moves) {
    chess.move(m);
    const ev = minimax(chess, depth - 1, alpha, beta, true);
    chess.undo();
    minEval = Math.min(minEval, ev);
    beta = Math.min(beta, ev);
    if (beta <= alpha) break;
  }
  return minEval;
}

export function uciToMove(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } {
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
  return { from, to, promotion };
}

export function sideToColor(side: 'white' | 'black'): Color {
  return side === 'white' ? 'w' : 'b';
}

export const ENGINE_STRENGTHS = STRENGTH;
