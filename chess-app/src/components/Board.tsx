import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { neoPieces } from '../lib/neoPieces';

/** Chess.com default green board */
const LIGHT = '#eeeed2';
const DARK = '#769656';
const LAST = 'rgba(155, 199, 0, 0.41)';
const HINT = 'rgba(255, 255, 0, 0.45)';
const WRONG = 'rgba(235, 97, 80, 0.65)';
const SELECT = 'rgba(255, 255, 0, 0.55)';
const CHECK = 'rgba(235, 97, 80, 0.72)';
const DOT = 'rgba(0, 0, 0, 0.25)';

type Props = {
  fen: string;
  orientation: 'white' | 'black';
  allowMove: boolean;
  onMove: (from: Square, to: Square) => boolean;
  highlight?: { from?: Square; to?: Square; wrong?: Square };
  lastMove?: { from: Square; to: Square } | null;
};

export function Board({
  fen,
  orientation,
  allowMove,
  onMove,
  highlight,
  lastMove,
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const clickGuard = useRef(0);
  const selectedRef = useRef<Square | null>(null);
  const legalRef = useRef(new Map<string, boolean>());

  useEffect(() => {
    setSelected(null);
    selectedRef.current = null;
  }, [fen, allowMove]);

  const chess = useMemo(() => new Chess(fen), [fen]);

  const legalByTo = useMemo(() => {
    if (!selected || !allowMove) return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    for (const m of chess.moves({ square: selected, verbose: true })) {
      map.set(m.to, Boolean(m.captured));
    }
    return map;
  }, [chess, selected, allowMove]);

  selectedRef.current = selected;
  legalRef.current = legalByTo;

  const checkedKing = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === turn) return cell.square;
      }
    }
    return null;
  }, [chess]);

  const overlayColor = (sq: string): string | null => {
    if (highlight?.wrong === sq) return WRONG;
    if (highlight?.from === sq || highlight?.to === sq) return HINT;
    if (checkedKing === sq) return CHECK;
    if (selected === sq) return SELECT;
    if (lastMove && (lastMove.from === sq || lastMove.to === sq)) return LAST;
    return null;
  };

  const trySelectOrMove = (sq: Square) => {
    if (!allowMove) return;

    const now = performance.now();
    if (now - clickGuard.current < 40) return;
    clickGuard.current = now;

    const piece = chess.get(sq);
    const cur = selectedRef.current;
    const legal = legalRef.current;

    if (cur) {
      if (sq === cur) {
        setSelected(null);
        return;
      }
      if (legal.has(sq)) {
        onMove(cur, sq);
        setSelected(null);
        return;
      }
      if (piece && piece.color === chess.turn()) {
        setSelected(sq);
        return;
      }
      setSelected(null);
      return;
    }

    if (piece && piece.color === chess.turn()) {
      setSelected(sq);
    }
  };

  const options = useMemo(
    () => ({
      id: 'opening-drill-board',
      position: fen,
      boardOrientation: orientation,
      allowDragging: allowMove,
      showNotation: true,
      animationDurationInMs: 150,
      pieces: neoPieces,
      boardStyle: {
        borderRadius: '4px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
        border: '2px solid #312e2b',
        width: '100%',
      } as React.CSSProperties,
      lightSquareStyle: { backgroundColor: LIGHT },
      darkSquareStyle: { backgroundColor: DARK },
      darkSquareNotationStyle: {
        color: LIGHT,
        fontSize: '0.72rem',
        fontWeight: 600,
      },
      lightSquareNotationStyle: {
        color: DARK,
        fontSize: '0.72rem',
        fontWeight: 600,
      },
      alphaNotationStyle: { margin: '0 0 1px 2px' },
      numericNotationStyle: { margin: '1px 2px 0 0' },
      squareRenderer: ({
        square,
        children,
      }: {
        square: string;
        children?: React.ReactNode;
      }) => {
        const tint = overlayColor(square);
        const isLegal = legalByTo.has(square);
        const isCapture = legalByTo.get(square) === true;
        return (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {tint && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: tint,
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}
            <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
              {children}
            </div>
            {isLegal && !isCapture && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              >
                <span
                  style={{
                    width: '32%',
                    height: '32%',
                    borderRadius: '50%',
                    background: DOT,
                  }}
                />
              </div>
            )}
            {isLegal && isCapture && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: '4%',
                  borderRadius: '50%',
                  boxShadow: `inset 0 0 0 7px ${DOT}`,
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />
            )}
          </div>
        );
      },
      onPieceDrop: ({
        sourceSquare,
        targetSquare,
      }: {
        sourceSquare: string;
        targetSquare: string | null;
      }) => {
        if (!allowMove || !targetSquare) return false;
        setSelected(null);
        return onMove(sourceSquare as Square, targetSquare as Square);
      },
      onSquareClick: ({ square }: { square: string }) => {
        trySelectOrMove(square as Square);
      },
      onPieceClick: ({ square }: { square: string | null }) => {
        if (!square) return;
        trySelectOrMove(square as Square);
      },
    }),
    [
      fen,
      orientation,
      allowMove,
      onMove,
      legalByTo,
      selected,
      chess,
      highlight,
      lastMove,
      checkedKing,
    ],
  );

  return (
    <div className="chesscom-board w-full max-w-[min(92vw,560px)] mx-auto aspect-square relative">
      <Chessboard options={options} />
    </div>
  );
}
