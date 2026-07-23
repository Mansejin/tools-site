import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Board } from './Board';
import { GameOverOverlay } from './GameOverOverlay';
import {
  ChessEngine,
  ENGINE_STRENGTHS,
  sideToColor,
  uciToMove,
  type EngineStrength,
} from '../lib/engine';
import { lastMoveSquares } from '../lib/chessUtils';
import { useProgressStore } from '../lib/progress';
import type { DrillFeedback, RepertoireLine, Side } from '../types';

type GameResult = {
  kind: 'win' | 'lose' | 'draw';
  reason: string;
};

type Props = {
  line: RepertoireLine;
  onExit: () => void;
};

type Mode = 'drill' | 'play' | 'done';

export function DrillSession({ line, onExit }: Props) {
  const recordDrill = useProgressStore((s) => s.recordDrill);
  const engineRef = useRef<ChessEngine | null>(null);
  const chessRef = useRef(new Chess());
  const plyRef = useRef(0);
  const completingRef = useRef(false);

  const [mode, setMode] = useState<Mode>('drill');
  const [ply, setPly] = useState(0);
  const [fen, setFen] = useState(() => new Chess().fen());
  const [feedback, setFeedback] = useState<DrillFeedback | null>(null);
  const [wrongPlies, setWrongPlies] = useState<number[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [engineBusy, setEngineBusy] = useState(false);
  const [engineInfo, setEngineInfo] = useState('엔진 준비 중…');
  const [strength, setStrength] = useState<EngineStrength>('medium');
  const [status, setStatus] = useState('');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [boardEpoch, setBoardEpoch] = useState(0);
  const [highlight, setHighlight] = useState<{
    from?: Square;
    to?: Square;
    wrong?: Square;
  }>({});

  const userColor = sideToColor(line.side);
  const orientation = line.side;

  const syncPly = (next: number) => {
    plyRef.current = next;
    setPly(next);
  };

  const refreshBoard = () => {
    setFen(chessRef.current.fen());
    setBoardEpoch((n) => n + 1);
  };

  useEffect(() => {
    const eng = new ChessEngine();
    engineRef.current = eng;
    eng.setStrength(strength);
    void eng.init().then(() => {
      setEngineInfo(
        eng.mode === 'stockfish'
          ? `Stockfish · ${eng.strengthLabel}`
          : `연습 봇 · ${eng.strengthLabel}`,
      );
    });
    return () => eng.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setStrength(strength);
    if (engineRef.current?.mode) {
      setEngineInfo(
        `${engineRef.current.mode === 'stockfish' ? 'Stockfish' : '연습 봇'} · ${ENGINE_STRENGTHS[strength].label}`,
      );
    }
  }, [strength]);

  const playBookMove = (label: string) => {
    const chess = chessRef.current;
    const idx = plyRef.current;
    if (idx >= line.moves.length) return false;
    const expected = line.moves[idx]!;
    const m = chess.move(expected);
    if (!m) return false;
    syncPly(idx + 1);
    refreshBoard();
    setFeedback({ kind: 'ok', message: `${label}: ${expected}` });
    setHighlight({});
    return true;
  };

  const maybeCompleteDrill = (nextPly: number, wrongs: number[], usedHint: boolean) => {
    if (nextPly < line.moves.length || completingRef.current) return;
    completingRef.current = true;
    const perfect = wrongs.length === 0 && !usedHint;
    recordDrill(line.id, perfect, wrongs);
    setMode('done');
    setFeedback({
      kind: 'complete',
      message: perfect
        ? '완벽! 이론 라인을 끝까지 맞췄어요.'
        : '라인 완료. 틀린 수만 다시 보면 더 좋아져요.',
    });
  };

  const scheduleOpponent = () => {
    window.setTimeout(() => {
      if (modeRef.current !== 'drill') return;
      const chess = chessRef.current;
      if (chess.turn() === userColor) return;
      if (plyRef.current >= line.moves.length) {
        maybeCompleteDrill(plyRef.current, wrongRef.current, hintRef.current);
        return;
      }
      playBookMove('상대');
      window.setTimeout(() => {
        maybeCompleteDrill(plyRef.current, wrongRef.current, hintRef.current);
      }, 0);
    }, 320);
  };

  const modeRef = useRef(mode);
  const wrongRef = useRef(wrongPlies);
  const hintRef = useRef(hintUsed);
  modeRef.current = mode;
  wrongRef.current = wrongPlies;
  hintRef.current = hintUsed;

  // If user is Black, White plays first from the book
  useEffect(() => {
    completingRef.current = false;
    if (line.side === 'black') {
      const t = window.setTimeout(() => scheduleOpponent(), 400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.id]);

  const lastMove = useMemo(() => {
    if (mode === 'play') {
      const hist = chessRef.current.history({ verbose: true });
      const m = hist[hist.length - 1];
      return m ? { from: m.from, to: m.to } : null;
    }
    return lastMoveSquares(line.moves, Math.min(ply, line.moves.length));
  }, [mode, line.moves, ply, boardEpoch]);

  const resetDrill = () => {
    completingRef.current = false;
    chessRef.current = new Chess();
    syncPly(0);
    setWrongPlies([]);
    setHintUsed(false);
    setFeedback(null);
    setHighlight({});
    setStatus('');
    setGameResult(null);
    setMode('drill');
    refreshBoard();
    if (line.side === 'black') {
      window.setTimeout(() => scheduleOpponent(), 400);
    }
  };

  const finishGame = (chess: Chess) => {
    if (chess.isCheckmate()) {
      const userWon = chess.turn() !== userColor;
      setGameResult({
        kind: userWon ? 'win' : 'lose',
        reason: '체크메이트',
      });
      setStatus(userWon ? '체크메이트 — 승리!' : '체크메이트 — 패배');
    } else if (chess.isStalemate()) {
      setGameResult({ kind: 'draw', reason: '스테일메이트' });
      setStatus('스테일메이트 — 무승부');
    } else if (chess.isDraw()) {
      setGameResult({ kind: 'draw', reason: '무승부' });
      setStatus('무승부');
    }
  };

  const rematchFromBook = async () => {
    // Rebuild position at end of book line, then play again
    const chess = new Chess();
    for (const san of line.moves) {
      if (!chess.move(san)) break;
    }
    chessRef.current = chess;
    syncPly(line.moves.length);
    setGameResult(null);
    setHighlight({});
    setStatus('이론 끝 — 이제 엔진과 이어서 두세요.');
    setMode('play');
    modeRef.current = 'play';
    refreshBoard();
    await maybeEngineMove();
  };

  const maybeEngineMove = async () => {
    const chess = chessRef.current;
    if (chess.isGameOver()) {
      finishGame(chess);
      return;
    }
    if (chess.turn() === userColor) return;
    const eng = engineRef.current;
    if (!eng) return;
    setEngineBusy(true);
    try {
      const uci = await eng.getBestMove(chess.fen());
      const { from, to, promotion } = uciToMove(uci);
      const m = chess.move({ from, to, promotion: promotion ?? undefined });
      if (m) {
        refreshBoard();
        setStatus(`엔진: ${m.san}`);
        if (chess.isGameOver()) finishGame(chess);
      }
    } finally {
      setEngineBusy(false);
    }
  };

  const startPlay = async () => {
    setMode('play');
    modeRef.current = 'play';
    setFeedback(null);
    setStatus('이론 끝 — 이제 엔진과 이어서 두세요.');
    setHighlight({});
    await maybeEngineMove();
  };

  const onMove = (from: Square, to: Square): boolean => {
    const chess = chessRef.current;

    if (modeRef.current === 'drill') {
      if (chess.turn() !== userColor) return false;
      const idx = plyRef.current;
      if (idx >= line.moves.length) return false;

      const expectedSan = line.moves[idx]!;
      const attempt = chess.move({ from, to, promotion: 'q' });
      if (!attempt) return false;

      if (normalizeSan(attempt.san) !== normalizeSan(expectedSan)) {
        chess.undo();
        const nextWrong = [...wrongRef.current, idx];
        setWrongPlies(nextWrong);
        wrongRef.current = nextWrong;
        setFeedback({
          kind: 'wrong',
          message: `아니에요. 책의 수는 ${expectedSan}`,
          expectedSan,
        });
        setHighlight({ wrong: to });
        window.setTimeout(() => {
          const m = chess.move(expectedSan);
          if (!m) return;
          syncPly(idx + 1);
          refreshBoard();
          setHighlight({ from: m.from, to: m.to });
          setFeedback({
            kind: 'hint',
            message: `정답 ${expectedSan}을(를) 두었습니다. 이어서!`,
            expectedSan,
          });
          scheduleOpponent();
          maybeCompleteDrill(plyRef.current, wrongRef.current, hintRef.current);
        }, 650);
        return false;
      }

      // Correct — keep the move (already applied). Re-apply as book SAN if notation differs slightly.
      if (normalizeSan(attempt.san) === normalizeSan(expectedSan) && attempt.san !== expectedSan) {
        chess.undo();
        chess.move(expectedSan);
      }
      syncPly(idx + 1);
      refreshBoard();
      setFeedback({ kind: 'ok', message: `좋아요! ${expectedSan}` });
      setHighlight({});
      scheduleOpponent();
      maybeCompleteDrill(plyRef.current, wrongRef.current, hintRef.current);
      return true;
    }

    if (modeRef.current === 'play') {
      if (engineBusy || chess.turn() !== userColor) return false;
      const m = chess.move({ from, to, promotion: 'q' });
      if (!m) return false;
      refreshBoard();
      setStatus(`나: ${m.san}`);
      if (chess.isGameOver()) {
        finishGame(chess);
        return true;
      }
      void maybeEngineMove();
      return true;
    }

    return false;
  };

  const showHint = () => {
    if (modeRef.current !== 'drill' || plyRef.current >= line.moves.length) return;
    if (chessRef.current.turn() !== userColor) return;
    setHintUsed(true);
    hintRef.current = true;
    const expected = line.moves[plyRef.current]!;
    const tmp = new Chess(chessRef.current.fen());
    const m = tmp.move(expected);
    if (!m) return;
    setFeedback({ kind: 'hint', message: `힌트: ${expected}`, expectedSan: expected });
    setHighlight({ from: m.from, to: m.to });
  };

  const progressPct = Math.min(100, Math.round((ply / line.moves.length) * 100));
  const canMove =
    !gameResult &&
    ((mode === 'drill' && chessRef.current.turn() === userColor) ||
      (mode === 'play' && !engineBusy && chessRef.current.turn() === userColor));

  return (
    <div className="animate-in grid gap-6 lg:grid-cols-[1fr_minmax(260px,340px)] items-start">
      <div className="space-y-4">
        <div className="relative w-full max-w-[min(92vw,560px)] mx-auto">
          <Board
            fen={fen}
            orientation={orientation}
            allowMove={canMove}
            onMove={onMove}
            highlight={highlight}
            lastMove={lastMove}
          />
          {gameResult && (
            <GameOverOverlay
              result={gameResult.kind}
              reason={gameResult.reason}
              onRematch={() => void rematchFromBook()}
              onHome={onExit}
            />
          )}
        </div>
        <div className="h-1.5 rounded-full bg-[var(--bg2)] overflow-hidden max-w-[560px] mx-auto">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${mode === 'play' || mode === 'done' ? 100 : progressPct}%` }}
          />
        </div>
      </div>

      <aside className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--bg2)]/70 p-4">
        <div>
          <button
            type="button"
            onClick={onExit}
            className="text-sm text-[var(--muted)] hover:text-[var(--ink)] mb-2"
          >
            ← 목록
          </button>
          <h2 className="display text-2xl leading-tight">{line.titleKo}</h2>
          <p className="mono text-xs text-[var(--muted)] mt-1">
            {line.eco} · {line.side === 'white' ? '백' : '흑'} · {ply}/{line.moves.length}
          </p>
        </div>

        <ul className="text-sm text-[var(--muted)] space-y-1.5">
          {line.ideas.map((idea) => (
            <li key={idea} className="flex gap-2">
              <span className="text-[var(--accent)]">·</span>
              <span>{idea}</span>
            </li>
          ))}
        </ul>

        {feedback && (
          <div
            className={`rounded-xl px-3 py-2 text-sm ${
              feedback.kind === 'wrong'
                ? 'bg-[var(--bad)]/15 text-[var(--bad)]'
                : feedback.kind === 'complete'
                  ? 'bg-[var(--good)]/15 text-[var(--good)]'
                  : 'bg-[var(--panel)] text-[var(--ink)]'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {status && <p className="text-sm text-[var(--muted)]">{status}</p>}

        {mode === 'drill' && (
          <div className="flex flex-wrap gap-2">
            <Btn onClick={showHint}>힌트</Btn>
            <Btn onClick={resetDrill} muted>
              다시
            </Btn>
          </div>
        )}

        {mode === 'done' && (
          <div className="space-y-3">
            <p className="text-sm">이론 끝. 실전처럼 엔진과 이어서 두어볼까요?</p>
            <div className="flex flex-wrap gap-2">
              {(['easy', 'medium', 'hard'] as EngineStrength[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrength(s)}
                  className={`mono text-xs px-2.5 py-1.5 rounded-lg border ${
                    strength === s
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--muted)]'
                  }`}
                >
                  {ENGINE_STRENGTHS[s].label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => void startPlay()} primary>
                엔진과 이어치기
              </Btn>
              <Btn onClick={resetDrill}>다시 드릴</Btn>
            </div>
            <p className="text-[11px] text-[var(--muted)]">{engineInfo}</p>
          </div>
        )}

        {mode === 'play' && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted)]">
              {engineBusy ? '엔진 생각 중…' : engineInfo}
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={resetDrill} muted>
                드릴로 돌아가기
              </Btn>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function normalizeSan(san: string) {
  return san.replace(/=/g, '').replace(/[+#]/g, '');
}

function Btn({
  children,
  onClick,
  primary,
  muted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm px-3.5 py-2 rounded-xl border transition-colors ${
        primary
          ? 'bg-[var(--accent)] text-[#1a1510] border-[var(--accent)] font-semibold'
          : muted
            ? 'border-[var(--line)] text-[var(--muted)]'
            : 'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)]'
      }`}
    >
      {children}
    </button>
  );
}

export function catalogToLine(
  opening: { eco: string; name: string; moves: string[] },
  side: Side,
): RepertoireLine {
  return {
    id: `catalog-${side}-${opening.eco}-${opening.name}`,
    side,
    titleKo: opening.name,
    titleEn: opening.name,
    why: '카탈로그에서 고른 오프닝입니다.',
    ideas: ['메인 아이디어를 스스로 정리해보세요', '틀린 수를 기록해 반복'],
    eco: opening.eco,
    openingName: opening.name,
    pgn: '',
    moves: opening.moves,
  };
}
