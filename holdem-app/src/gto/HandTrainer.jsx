import { useEffect, useMemo, useState } from 'react';
import { Settings2, CheckCircle2, XCircle, Play, SlidersHorizontal } from 'lucide-react';
import SolutionPicker from './SolutionPicker.jsx';
import { loadSolution, saveSolution, summaryLabel } from './solutionConfig.js';
import {
  actionFor,
  correctBinary,
  engineMeta,
  randomSpot,
} from './solutionEngine.js';
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

/** Map table seat → engine position key */
function mapHeroToEnginePos(hero, pfAction) {
  if (pfAction === 'vs_open' || hero === 'BB') return 'BB';
  if (hero === 'SB') return 'SB';
  if (hero === 'UTG1' || hero === 'LJ' || hero === 'HJ') return 'MP';
  if (['UTG', 'MP', 'CO', 'BTN'].includes(hero)) return hero === 'MP' ? 'MP' : hero;
  return 'BTN';
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
      className={`flex h-24 w-16 flex-col justify-between rounded-xl border-2 bg-white p-2 shadow-lg sm:h-28 sm:w-20 ${
        red ? 'border-red-200 text-red-600' : 'border-zinc-200 text-zinc-900'
      }`}
    >
      <span className="text-lg font-bold leading-none sm:text-xl">{r}</span>
      <span className="self-end text-2xl leading-none">{s}</span>
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

function SetupScreen({ cfg, setCfg, setup, setSetup, onStart, onOpenSolution }) {
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
              공개 DB는 프리플랍 중심입니다. 플랍·직접 설정도 선택 가능하나 연습은 프리플랍 노드로
              진행합니다.
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
  const enginePos = mapHeroToEnginePos(setup.hero, setup.pfAction);
  const [spot, setSpot] = useState(() => {
    const s = randomSpot(cfg);
    return { ...s, pos: enginePos };
  });
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({ ok: 0, n: 0 });
  const meta = useMemo(() => engineMeta(cfg), [cfg]);
  const gtoAction = actionFor(cfg, spot.hand, { pos: enginePos });

  function deal() {
    setFeedback(null);
    const s = randomSpot(cfg);
    setSpot({ ...s, pos: enginePos });
  }

  function answer(aggressive) {
    if (feedback) return;
    const correct = aggressive === correctBinary(cfg, spot.hand, { pos: enginePos });
    setFeedback({ correct });
    touchStreak();
    recordAnswer(correct, 'drill');
    setStats((x) => ({ ok: x.ok + (correct ? 1 : 0), n: x.n + 1 }));
  }

  useEffect(() => {
    deal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, setup.hero, setup.pfAction]);

  const cards = rankSuitCards(spot.hand);
  const yesLabel =
    enginePos === 'BB' || setup.pfAction.startsWith('vs_')
      ? '콜 / 공격'
      : gtoAction === 'raise'
        ? '레이즈 / 오픈'
        : '푸시 / 공격';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onExit} className="text-sm text-muted hover:text-ink">
          ← 설정
        </button>
        <p className="truncate text-xs text-muted">
          {setup.hero} · {PF_ACTIONS.find((a) => a.id === setup.pfAction)?.label} ·{' '}
          {stats.n ? `${Math.round((stats.ok / stats.n) * 100)}%` : '—'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-felt-3 p-4 sm:p-6">
        <p className="mb-4 text-center text-sm text-muted">
          {cfg.stack}bb · {setup.hero} · {summaryLabel(cfg)}
        </p>
        <div className="mb-6 flex justify-center gap-3">
          {cards.map((c, i) => (
            <PlayingCard key={i} r={c.r} s={c.s} />
          ))}
        </div>
        <p className="mb-1 text-center text-sm text-muted">
          <span className="font-semibold text-ink">{spot.hand}</span>
        </p>
        <h3 className="mb-6 text-center text-xl font-semibold text-ink">어떻게 할까?</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!!feedback}
            onClick={() => answer(true)}
            className="min-h-14 rounded-xl bg-casino-green text-base font-bold text-white disabled:opacity-50"
          >
            {yesLabel}
          </button>
          <button
            type="button"
            disabled={!!feedback}
            onClick={() => answer(false)}
            className="min-h-14 rounded-xl border border-white/15 bg-felt text-base font-bold text-ink disabled:opacity-50"
          >
            폴드
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">
          {meta.fidelity === 'exact' ? '정확' : '근사'} · Spot 모드 (한 결정)
        </p>
      </div>

      {feedback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-felt-3 p-5">
            <div
              className={`mb-3 flex items-center gap-2 text-lg font-bold ${
                feedback.correct ? 'text-casino-green-bright' : 'text-rose-300'
              }`}
            >
              {feedback.correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              {feedback.correct ? '정답' : '오답'}
            </div>
            <p className="mb-1 text-sm text-gold">
              GTO: {gtoAction.toUpperCase()} · {spot.hand} @ {setup.hero}
            </p>
            <p className="mb-5 text-sm text-muted">{meta.note}</p>
            <button
              type="button"
              onClick={deal}
              className="w-full min-h-12 rounded-xl bg-casino-green-bright font-semibold text-felt"
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
  const [phase, setPhase] = useState('setup'); // setup | drill

  return (
    <div>
      {phase === 'setup' ? (
        <SetupScreen
          cfg={cfg}
          setCfg={setCfg}
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
