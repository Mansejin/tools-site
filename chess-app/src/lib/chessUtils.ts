import { Chess, type Square } from 'chess.js';

/** Apply SAN move list from start; return FEN after `ply` half-moves. */
export function fenAfterMoves(moves: string[], ply: number): string {
  const chess = new Chess();
  for (let i = 0; i < ply && i < moves.length; i++) {
    const m = chess.move(moves[i]!);
    if (!m) break;
  }
  return chess.fen();
}

export function applySans(moves: string[]): Chess {
  const chess = new Chess();
  for (const san of moves) {
    if (!chess.move(san)) break;
  }
  return chess;
}

export function lastMoveSquares(
  moves: string[],
  ply: number,
): { from: Square; to: Square } | null {
  if (ply <= 0) return null;
  const chess = new Chess();
  let last: { from: Square; to: Square } | null = null;
  for (let i = 0; i < ply && i < moves.length; i++) {
    const m = chess.move(moves[i]!);
    if (!m) break;
    last = { from: m.from, to: m.to };
  }
  return last;
}

export function formatMoveList(moves: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const n = Math.floor(i / 2) + 1;
    const w = moves[i];
    const b = moves[i + 1];
    parts.push(b ? `${n}. ${w} ${b}` : `${n}. ${w}`);
  }
  return parts.join('  ');
}
