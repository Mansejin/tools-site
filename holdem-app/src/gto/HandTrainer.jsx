import { useEffect, useMemo, useState } from 'react';
import { Settings2, CheckCircle2, XCircle, Spade } from 'lucide-react';
import SolutionPicker from '../gto/SolutionPicker.jsx';
import { loadSolution, saveSolution, summaryLabel } from '../gto/solutionConfig.js';
import {
  actionFor,
  correctBinary,
  engineMeta,
  randomSpot,
  positionsFor,
} from '../gto/solutionEngine.js';
import { touchStreak } from '../lib/route.js';
import { recordAnswer } from '../lib/practiceStats.js';

function rankSuitCards(hand) {
  // visual: show two card faces from combo string like AKs / 72o / TT
  const r1 = hand[0];
  const r2 = hand[1];
  const suited = hand.endsWith('s');
  const pair = r1 === r2;
  const suits = pair ? ['♠', '♥'] : suited ? ['♠', '♠'] : ['♠', '♥'];
  return [
    { r: r1, s: suits[0] },
    { r: r2, s: suits[1] },
  ];
}

function PlayingCard({ r, s }) {
  const red = s === '♥' || s === '♦';
  return (
    <div
      className={`flex h-24 w-16 flex-col justify-between rounded-xl border-2 bg-white p-2 shadow-lg sm:h-28 sm:w-20 ${
        red ? 'border-red-200 text-red-600' : 'border-zinc-200 text-zinc-900'
      }`}
    >
      <span className="text-lg font-bold leading-none sm:text-xl">{r}</span>
      <span className="self-end text-2xl leading-none">{s}</span>
    </div>
  );
}

export default function HandTrainer() {
  const [cfg, setCfg] = useState(() => loadSolution());
  const [draft, setDraft] = useState(cfg);
  const [picker, setPicker] = useState(false);
  const [spot, setSpot] = useState(() => randomSpot(loadSolution()));
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({ ok: 0, n: 0 });

  const meta = useMemo(() => engineMeta(cfg), [cfg]);
  const gtoAction = actionFor(cfg, spot.hand, spot);
  const yesLabel =
    gtoAction === 'call' || spot.pos === 'BB'
      ? '콜 / 공격'
      : gtoAction === 'raise'
        ? '레이즈'
        : '푸시 / 공격';

  function next() {
    setFeedback(null);
    setSpot(randomSpot(cfg));
  }

  function answer(aggressive) {
    if (feedback) return;
    const correct = aggressive === correctBinary(cfg, spot.hand, spot);
    setFeedback({ correct, aggressive });
    touchStreak();
    recordAnswer(correct, 'drill');
    setStats((s) => ({ ok: s.ok + (correct ? 1 : 0), n: s.n + 1 }));
  }

  useEffect(() => {
    setSpot(randomSpot(cfg));
    setFeedback(null);
  }, [cfg]);

  const cards = rankSuitCards(spot.hand);
  const posLabel = positionsFor(cfg).find((p) => p.id === spot.pos)?.label || spot.pos;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">GTO 연습</h2>
          <p className="mt-0.5 text-xs text-muted">{summaryLabel(cfg)}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(cfg);
            setPicker(true);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-felt-3 px-3 text-sm text-ink"
        >
          <Settings2 size={15} />
          솔루션
        </button>
      </div>

      <p className="text-[11px] text-muted">
        {meta.fidelity === 'exact' ? '정확' : '근사'} · {meta.note} · 정답{' '}
        <span className="text-gold">
          {stats.n ? Math.round((stats.ok / stats.n) * 100) : 0}%
        </span>{' '}
        ({stats.ok}/{stats.n})
      </p>

      <div className="rounded-2xl border border-white/10 bg-felt-3 p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted">
          <Spade size={14} className="text-gold" />
          <span>
            {cfg.stack}bb · {posLabel} · 프리플랍
          </span>
        </div>

        <div className="mb-6 flex justify-center gap-3">
          {cards.map((c, i) => (
            <PlayingCard key={i} r={c.r} s={c.s} />
          ))}
        </div>

        <p className="mb-2 text-center text-sm text-muted">
          핸드 <span className="font-semibold text-ink">{spot.hand}</span>
        </p>
        <h3 className="mb-6 text-center text-xl font-semibold text-ink">어떻게 할까?</h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!!feedback}
            onClick={() => answer(true)}
            className="min-h-14 rounded-xl bg-casino-green text-base font-bold text-white active:brightness-95 disabled:opacity-50"
          >
            {yesLabel}
          </button>
          <button
            type="button"
            disabled={!!feedback}
            onClick={() => answer(false)}
            className="min-h-14 rounded-xl border border-white/15 bg-felt text-base font-bold text-ink active:bg-felt-2 disabled:opacity-50"
          >
            폴드
          </button>
        </div>
      </div>

      {feedback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-felt-3 p-5 shadow-2xl">
            <div
              className={`mb-3 flex items-center gap-2 text-lg font-bold ${
                feedback.correct ? 'text-casino-green-bright' : 'text-rose-300'
              }`}
            >
              {feedback.correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              {feedback.correct ? '정답' : '오답'}
            </div>
            <p className="mb-1 text-sm text-gold">
              GTO: {gtoAction.toUpperCase()} · {spot.hand} @ {spot.pos}
            </p>
            <p className="mb-5 text-sm text-muted">
              {cfg.stack}bb {summaryLabel(cfg)} 기준. {meta.note}
            </p>
            <button
              type="button"
              onClick={next}
              className="w-full min-h-12 rounded-xl bg-casino-green-bright text-base font-semibold text-felt"
            >
              다음 핸드
            </button>
          </div>
        </div>
      )}

      {picker && (
        <SolutionPicker
          value={draft}
          onChange={setDraft}
          onClose={() => setPicker(false)}
          onApply={(s) => setCfg(saveSolution(s))}
        />
      )}
    </div>
  );
}
