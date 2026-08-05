import { useEffect, useState } from 'react';
import {
  Settings2,
  CheckCircle2,
  XCircle,
  Play,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';
import SolutionPicker from './SolutionPicker.jsx';
import { loadSolution, saveSolution, summaryLabel } from './solutionConfig.js';
import { engineMeta, randomSpot, scoreChoice } from './solutionEngine.js';
import { touchStreak } from '../lib/route.js';
import { recordAnswer } from '../lib/practiceStats.js';

const SEATS_9 = [
  { id: 'UTG', label: 'UTG', angle: -110 },
  { id: 'UTG1', label: 'UTG1', angle: -70 },
  { id: 'LJ', label: 'LJ', angle: -30 },
  { id: 'HJ', label: 'HJ', angle: 10 },
  { id: 'CO', label: 'CO', angle: 50 },
  { id: 'BTN', label: 'BTN', angle: 90 },
  { id: 'SB', label: 'SB', angle: 130 },
  { id: 'BB', label: 'BB', angle: 170 },
];

const START_POINTS = [
  { id: 'preflop', label: '프리플랍' },
  { id: 'flop', label: '플랍' },
  { id: 'custom', label: '직접 설정' },
];

const PF_ACTIONS = [
  { id: 'all', label: '모두' },
  { id: 'open', label: '오픈' },
  { id: 'vs_open', label: 'vs 오픈' },
  { id: 'vs_3bet', label: 'vs 3벳' },
  { id: 'vs_4bet', label: 'vs 4벳' },
  { id: 'vs_5bet', label: 'vs 5벳' },
  { id: 'vs_raise_call', label: 'vs 레이즈-콜' },
  { id: 'vs_squeeze', label: 'vs 스퀴즈' },
  { id: 'vs_limp', label: 'vs 림프' },
  { id: 'vs_iso', label: 'vs 고립' },
  { id: 'from_start', label: '처음부터' },
];

const TRAIN_KEY = 'holdem-train-setup-v1';

function loadTrainSetup() {
  try {
    return {
      hero: 'BTN',
      start: 'preflop',
      pfAction: 'open',
      ...JSON.parse(localStorage.getItem(TRAIN_KEY) || '{}'),
    };
  } catch {
    return { hero: 'BTN', start: 'preflop', pfAction: 'open' };
  }
}

function saveTrainSetup(s) {
  localStorage.setItem(TRAIN_KEY, JSON.stringify(s));
  return s;
}

function rankSuitCards(hand) {
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
      className={`flex h-24 w-[4.25rem] flex-col justify-between rounded-xl border-2 bg-white p-2 shadow-lg sm:h-28 sm:w-20 ${
        red ? 'border-red-200 text-red-600' : 'border-zinc-200 text-zinc-900'
      }`}
    >
      <span className="text-lg font-bold leading-none sm:text-xl">{r}</span>
      <span className="self-end text-2xl leading-none">{s}</span>
    </div>
  );
}

function FreqBars({ freqs, picked }) {
  const rows = [
    { id: 'fold', label: '폴드', color: 'bg-zinc-400' },
    { id: 'call', label: '콜/체크', color: 'bg-sky-400' },
    { id: 'raise', label: '레이즈', color: 'bg-casino-green-bright' },
    { id: 'shove', label: '올인', color: 'bg-rose-400' },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-xs">
          <span className={`w-14 shrink-0 ${picked === r.id ? 'font-bold text-ink' : 'text-muted'}`}>
            {r.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${r.color}`}
              style={{ width: `${freqs[r.id] || 0}%` }}
            />
          </div>
          <span className="w-8 text-right tabular-nums text-muted">{freqs[r.id] || 0}%</span>
        </div>
      ))}
    </div>
  );
}

function TableSetup({ hero, onHero, players }) {
  const visible = SEATS_9.filter((s) => {
    if (players <= 2) return s.id === 'SB' || s.id === 'BB';
    if (players <= 3) return ['BTN', 'SB', 'BB'].includes(s.id);
    if (players <= 6) return !['UTG1', 'LJ'].includes(s.id);
    return true;
  });

  return (
    <div className="relative mx-auto aspect-[1.6/1] w-full max-w-lg">
      <div className="absolute inset-[18%] rounded-[50%] border-2 border-casino-green/40 bg-gradient-to-b from-[#1a3d2e] to-[#0f241a] shadow-inner" />
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex h-9 w-7 items-center justify-center rounded-md border border-white/15 bg-felt-3 text-[10px] text-muted"
          >
            ♠
          </div>
        ))}
      </div>
      {visible.map((seat) => {
        const rad = ((seat.angle - 90) * Math.PI) / 180;
        const x = 50 + Math.cos(rad) * 42;
        const y = 50 + Math.sin(rad) * 38;
        const active = hero === seat.id;
        return (
          <button
            key={seat.id}
            type="button"
            onClick={() => onHero(seat.id)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-[11px] font-bold transition sm:h-12 sm:w-12 ${
              active
                ? 'bg-casino-green-bright text-felt ring-2 ring-white/40'
                : 'border border-white/20 bg-felt-3 text-muted hover:text-ink'
            }`}
          >
            {seat.label}
            {seat.id === 'BTN' && (
              <span className="absolute -bottom-1 rounded-full bg-white px-1 text-[8px] font-bold text-felt">
                D
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SetupScreen({ cfg, setup, setSetup, onStart, onOpenSolution }) {
  return (
    <div className="space-y-5">
      <TableSetup
        hero={setup.hero}
        onHero={(hero) => setSetup(saveTrainSetup({ ...setup, hero }))}
        players={cfg.players}
      />

      <div className="space-y-4 rounded-2xl border border-white/10 bg-felt-3/80 p-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">솔루션</p>
          <button
            type="button"
            onClick={onOpenSolution}
            className="flex min-h-12 w-full items-center justify-between rounded-xl border border-white/12 bg-felt px-3 text-left text-sm text-ink"
          >
            <span className="truncate">{summaryLabel(cfg)}</span>
            <Settings2 size={16} className="shrink-0 text-muted" />
          </button>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">시작 지점</p>
          <div className="flex gap-1 rounded-xl border border-white/8 bg-felt p-1">
            {START_POINTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSetup(saveTrainSetup({ ...setup, start: s.id }))}
                className={`min-h-10 flex-1 rounded-lg text-xs font-medium sm:text-sm ${
                  setup.start === s.id ? 'bg-felt-4 text-ink' : 'text-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {setup.start !== 'preflop' && (
            <p className="mt-1.5 text-[11px] text-amber-200/90">
              공개 DB는 프리플랍 중심 — 연습은 프리플랍 노드로 진행합니다.
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">프리플랍 행동</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {PF_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSetup(saveTrainSetup({ ...setup, pfAction: a.id }))}
                className={`min-h-10 rounded-lg px-1 text-[11px] font-medium sm:text-xs ${
                  setup.pfAction === a.id
                    ? 'bg-casino-green text-white'
                    : 'border border-white/10 text-muted'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenSolution}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-white/12 px-3 text-sm text-muted"
        >
          <SlidersHorizontal size={15} />
          모든 설정
        </button>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-casino-green-bright text-base font-bold text-felt"
        >
          <Play size={18} fill="currentColor" />
          연습 시작하기
        </button>
      </div>
    </div>
  );
}

function DrillScreen({ cfg, setup, onExit }) {
  const [scene, setScene] = useState(() => randomSpot(cfg, setup));
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({ pts: 0, n: 0, best: 0 });
  const meta = engineMeta(cfg);

  function deal() {
    setFeedback(null);
    setScene(randomSpot(cfg, setup));
  }

  function pick(action) {
    if (feedback) return;
    const scored = scoreChoice(scene.freqs, action);
    setFeedback({ action, ...scored });
    touchStreak();
    recordAnswer(scored.grade === 'best' || scored.grade === 'good', 'drill');
    setStats((s) => ({
      pts: s.pts + scored.pts,
      n: s.n + 1,
      best: s.best + (scored.grade === 'best' ? 1 : 0),
    }));
  }

  useEffect(() => {
    deal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, setup.hero, setup.pfAction]);

  const cards = rankSuitCards(scene.hand);
  const avg = stats.n ? Math.round(stats.pts / stats.n) : 0;
  const gradeColor =
    feedback?.grade === 'best'
      ? 'text-casino-green-bright'
      : feedback?.grade === 'good'
        ? 'text-sky-300'
        : feedback?.grade === 'meh'
          ? 'text-amber-300'
          : 'text-rose-300';

  const btnClass = (id) => {
    const base =
      'min-h-14 rounded-xl px-2 text-sm font-bold transition disabled:opacity-40 sm:text-base';
    if (id === 'fold') return `${base} border border-white/15 bg-felt text-ink`;
    if (id === 'call') return `${base} bg-sky-700 text-white`;
    if (id === 'raise') return `${base} bg-casino-green text-white`;
    return `${base} bg-rose-700 text-white`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onExit} className="text-sm text-muted hover:text-ink">
          ← 설정
        </button>
        <p className="truncate text-xs text-muted">
          점수 {avg} · 최적 {stats.best}/{stats.n || 0}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-felt-3 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {cfg.stack}bb · {scene.hero} · 팟 {scene.pot}bb
          </span>
          <span className="truncate text-[11px]">{summaryLabel(cfg)}</span>
        </div>

        {/* Action history */}
        <div className="mb-4 max-h-28 space-y-1 overflow-y-auto rounded-xl bg-felt/80 px-3 py-2 text-xs">
          {scene.lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="font-medium text-gold-soft">{l.seat}</span>
              <span className="text-muted">{l.text}</span>
            </div>
          ))}
        </div>

        <div className="mb-4 flex justify-center gap-3">
          {cards.map((c, i) => (
            <PlayingCard key={i} r={c.r} s={c.s} />
          ))}
        </div>

        <p className="mb-1 text-center text-lg font-semibold text-ink">{scene.hand}</p>
        <p className="mb-5 text-center text-sm text-muted">
          스택 {scene.stack}bb
          {scene.toCall > 0 ? ` · 콜까지 ${scene.toCall}bb` : ''}
        </p>

        <div
          className={`grid gap-2 ${
            scene.available.length >= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {scene.available.map((id) => (
            <button
              key={id}
              type="button"
              disabled={!!feedback}
              onClick={() => pick(id)}
              className={btnClass(id)}
            >
              {scene.labels[id]}
            </button>
          ))}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted">
          {meta.fidelity === 'exact' ? '정확' : '근사'} · Spot · {meta.note}
        </p>
      </div>

      {feedback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-felt-3 p-5 shadow-2xl">
            <div className={`mb-2 flex items-center gap-2 text-lg font-bold ${gradeColor}`}>
              {feedback.grade === 'blunder' ? <XCircle size={22} /> : <CheckCircle2 size={22} />}
              {feedback.label}
              <span className="text-sm font-medium text-muted">· {feedback.freq}% 라인</span>
            </div>
            {feedback.grade === 'blunder' && (
              <p className="mb-2 flex items-start gap-1.5 text-xs text-rose-200/90">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                GTO 빈도 0%에 가까운 수입니다.
              </p>
            )}
            <p className="mb-3 text-sm text-muted">
              선택: <span className="text-ink">{scene.labels[feedback.action]}</span>
            </p>
            <FreqBars freqs={scene.freqs} picked={feedback.action} />
            <button
              type="button"
              onClick={deal}
              className="mt-5 w-full min-h-12 rounded-xl bg-casino-green-bright font-semibold text-felt"
            >
              다음 핸드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HandTrainer() {
  const [cfg, setCfg] = useState(() => loadSolution());
  const [draft, setDraft] = useState(cfg);
  const [picker, setPicker] = useState(false);
  const [setup, setSetup] = useState(() => loadTrainSetup());
  const [phase, setPhase] = useState('setup');

  return (
    <div>
      {phase === 'setup' ? (
        <SetupScreen
          cfg={cfg}
          setup={setup}
          setSetup={setSetup}
          onStart={() => setPhase('drill')}
          onOpenSolution={() => {
            setDraft(cfg);
            setPicker(true);
          }}
        />
      ) : (
        <DrillScreen cfg={cfg} setup={setup} onExit={() => setPhase('setup')} />
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
