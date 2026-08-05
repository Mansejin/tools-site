import { useEffect, useState } from 'react';
import {
  Settings2,
  CheckCircle2,
  XCircle,
  Play,
  SlidersHorizontal,
  AlertTriangle,
  Square,
  FastForward,
  RotateCcw,
} from 'lucide-react';
import SolutionPicker from './SolutionPicker.jsx';
import PackBar from './PackBar.jsx';
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

const ACT_COLOR = {
  fold: '#3D7CB8',
  call: '#5ab966',
  raise: '#f03c3c',
  shove: '#7d1f1f',
};

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

function MiniCard({ r, s, large }) {
  const red = s === '♥' || s === '♦';
  return (
    <div
      className={`flex flex-col justify-between rounded-md border bg-white shadow ${
        large ? 'h-14 w-10 p-1 sm:h-16 sm:w-11' : 'h-9 w-6 p-0.5'
      } ${red ? 'border-red-200 text-red-600' : 'border-zinc-300 text-zinc-900'}`}
    >
      <span className={`font-bold leading-none ${large ? 'text-sm' : 'text-[10px]'}`}>{r}</span>
      <span className={`self-end leading-none ${large ? 'text-base' : 'text-xs'}`}>{s}</span>
    </div>
  );
}

function FreqStrip({ freqs }) {
  const rows = [
    { id: 'shove', label: 'Allin', color: ACT_COLOR.shove },
    { id: 'raise', label: 'Raise', color: ACT_COLOR.raise },
    { id: 'call', label: 'Call', color: ACT_COLOR.call },
    { id: 'fold', label: 'Fold', color: ACT_COLOR.fold },
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-black/40">
        {rows.map((r) =>
          (freqs[r.id] || 0) > 0.05 ? (
            <div
              key={r.id}
              style={{ width: `${freqs[r.id]}%`, background: r.color }}
              title={`${r.label} ${freqs[r.id]}%`}
            />
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.id} className="flex justify-between gap-2 tabular-nums" style={{ color: r.color }}>
            <span>{r.label}</span>
            <span>{freqs[r.id] || 0}%</span>
          </div>
        ))}
      </div>
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

function LiveSeat({ seat, angle, cards }) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = 50 + Math.cos(rad) * 42;
  const y = 50 + Math.sin(rad) * 40;
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className={`relative flex min-w-[4.5rem] flex-col items-center rounded-xl px-2 py-1.5 text-center ${
          seat.isActive
            ? 'bg-[#3f3f3f] ring-1 ring-white/25'
            : seat.folded
              ? 'bg-[#262626] opacity-55'
              : 'bg-[#2a2a2a]'
        }`}
      >
        <span className="text-[11px] font-semibold text-white/90">{seat.id}</span>
        <span className="text-[10px] tabular-nums text-white/60">{seat.stack}</span>
        {seat.isDealer && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[8px] font-bold text-black">
            D
          </span>
        )}
      </div>
      {seat.bet > 0 && (
        <div className="mt-1 text-center text-[10px] font-medium tabular-nums text-amber-200/90">
          {seat.bet}
        </div>
      )}
      {seat.isHero && cards && (
        <div className="mt-1 flex justify-center gap-0.5">
          {cards.map((c, i) => (
            <MiniCard key={i} r={c.r} s={c.s} large />
          ))}
        </div>
      )}
      {!seat.isHero && !seat.folded && seat.bet > 0 && (
        <div className="mt-1 flex justify-center gap-0.5">
          <div className="h-7 w-5 rounded border border-white/10 bg-[#2f2f2f]" />
          <div className="h-7 w-5 rounded border border-white/10 bg-[#2f2f2f]" />
        </div>
      )}
    </div>
  );
}

function HistoryStrip({ spots, hero }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
      {spots.map((sp, i) => (
        <div
          key={`${sp.seat}-${i}`}
          className={`w-[5.5rem] shrink-0 rounded-lg border px-1.5 py-1 ${
            sp.active ? 'border-white/30 bg-[#2a2a2a]' : 'border-white/8 bg-[#1a1a1a]'
          }`}
        >
          <div className="mb-1 flex justify-between text-[10px] text-muted">
            <span className={sp.seat === hero || sp.active ? 'text-ink' : ''}>{sp.seat}</span>
            <span>{sp.stack}</span>
          </div>
          {sp.active ? (
            <p className="py-2 text-center text-[10px] text-amber-200/90">행동을 선택해 주세요</p>
          ) : (
            <div className="space-y-0.5">
              {sp.actions
                .filter((a) => a.taken || a.id === 'fold' || a.id === 'raise' || a.id === 'shove')
                .slice(0, 3)
                .map((a) => (
                  <div
                    key={a.id}
                    className={`rounded px-1 py-0.5 text-[10px] ${
                      a.taken ? 'bg-white/15 text-ink' : 'text-muted/50'
                    }`}
                  >
                    {a.label}
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SetupScreen({ cfg, setup, setSetup, onStart, onOpenSolution, packTick, onPack }) {
  return (
    <div className="space-y-5">
      <PackBar onChange={onPack} />

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
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ pts: 0, n: 0, best: 0, wrong: 0 });
  const [rng] = useState(() => Math.floor(Math.random() * 100));
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
    const ok = scored.grade === 'best' || scored.grade === 'good';
    recordAnswer(ok, 'drill');
    setStreak((s) => (ok ? s + 1 : 0));
    setStats((s) => ({
      pts: s.pts + scored.pts,
      n: s.n + 1,
      best: s.best + (scored.grade === 'best' ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
    }));
  }

  useEffect(() => {
    deal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, setup.hero, setup.pfAction]);

  const cards = rankSuitCards(scene.hand);
  const gtoScore = stats.n ? Math.round(stats.pts / stats.n) : 0;
  const angleOf = (id) => SEATS_9.find((s) => s.id === id)?.angle ?? 0;

  const actionLabel = (id) => {
    const L = scene.labels;
    if (id === 'fold') return L.fold;
    if (id === 'call') return L.callDetail ? `${L.call} ${L.callDetail}` : L.call;
    if (id === 'raise') return `${L.raise} ${L.raiseDetail}`;
    return `${L.shove} ${L.shoveDetail}`;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-[#1e1e1e] px-2 py-1.5">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-300 hover:bg-white/5"
          title="세션 멈추기"
        >
          <Square size={16} fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={deal}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-ink"
          title="다음 핸드"
        >
          <FastForward size={18} />
        </button>
        <button
          type="button"
          onClick={deal}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-ink"
          title="핸드 다시 하기"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-ink"
          title="세션 설정"
        >
          <Settings2 size={16} />
        </button>
        <div className="ml-1 min-w-0 flex-1 truncate text-xs text-muted">
          <span className="text-ink/90">{scene.title || `${scene.hero} · ${scene.stack}bb`}</span>
        </div>
        <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[11px] tabular-nums text-muted">
          RNG {rng}
        </span>
        <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[11px] tabular-nums text-amber-200/80">
          🔥 {streak}
        </span>
      </div>

      {/* History spots */}
      <HistoryStrip spots={scene.spotHistory || []} hero={scene.hero} />

      {/* Live table */}
      <div className="relative mx-auto aspect-[1.15/1] w-full max-w-xl sm:aspect-[1.35/1]">
        <div className="absolute inset-[14%] rounded-[50%] border border-[#4D4D4D] bg-gradient-to-b from-[#163528] to-[#0c1f16]" />
        <div className="absolute left-1/2 top-[42%] w-[70%] max-w-xs -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="mb-1 truncate text-[11px] text-white/50">{scene.title}</p>
          <p className="text-sm font-semibold tabular-nums text-white">
            {scene.pot} bb
            {scene.potOdds > 0 && (
              <span className="ml-2 text-[11px] font-normal text-white/45">{scene.potOdds}%</span>
            )}
          </p>
          <p className="mt-0.5 text-[10px] text-white/35">팟 · 시작 1.5bb</p>
        </div>

        {(scene.tableSeats || []).map((seat) => (
          <LiveSeat
            key={seat.id}
            seat={seat}
            angle={angleOf(seat.id)}
            cards={seat.isHero ? cards : null}
          />
        ))}

        {/* Quick result toast */}
        {feedback && (
          <div
            className="absolute left-1/2 top-[58%] z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-lg"
            style={{
              background: feedback.grade === 'blunder' || feedback.grade === 'meh' ? '#3a1515' : '#14301a',
              color: feedback.grade === 'blunder' || feedback.grade === 'meh' ? '#ff8a8a' : '#aafbb2',
            }}
          >
            {feedback.grade === 'blunder' || feedback.grade === 'meh' ? (
              <XCircle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {actionLabel(feedback.action)}
            <span className="font-normal opacity-80">{feedback.freq}%</span>
          </div>
        )}
      </div>

      {/* Action bar — GTOW colors */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(scene.available.length, 4)}, minmax(0, 1fr))` }}
      >
        {scene.available.map((id) => {
          const wrong =
            feedback &&
            feedback.action === id &&
            (feedback.grade === 'blunder' || feedback.grade === 'meh');
          const right =
            feedback &&
            feedback.action === id &&
            (feedback.grade === 'best' || feedback.grade === 'good');
          return (
            <button
              key={id}
              type="button"
              disabled={!!feedback}
              onClick={() => pick(id)}
              className="relative min-h-[3.25rem] overflow-hidden rounded-lg px-2 text-sm font-bold text-white shadow disabled:opacity-90 sm:min-h-14 sm:text-base"
              style={{ background: ACT_COLOR[id] }}
            >
              <span className="relative z-10 drop-shadow">
                {actionLabel(id)}
                {wrong && ' ⚠'}
                {right && feedback.grade === 'best' && ' ✓✓'}
                {right && feedback.grade === 'good' && ' ✓'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Info panel */}
      <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-ink">전략 · 전체 빈도</span>
          <span className="text-muted">
            {meta.fidelity === 'exact' ? '정확' : meta.fidelity === 'pack' ? '내 팩' : '근사'} · {scene.hand}
          </span>
        </div>
        {feedback ? (
          <>
            <FreqStrip freqs={scene.freqs} />
            {feedback.grade === 'blunder' && (
              <p className="mt-2 flex items-start gap-1 text-[11px] text-rose-300/90">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                GTO 빈도 0%에 가까운 수입니다.
              </p>
            )}
            <button
              type="button"
              onClick={deal}
              className="mt-3 w-full min-h-11 rounded-lg bg-[#aafbb2] text-sm font-bold text-black"
            >
              다음 핸드 · E
            </button>
          </>
        ) : (
          <p className="text-[11px] leading-relaxed text-muted">{meta.note}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-white/8 bg-[#1a1a1a] px-2 py-2">
          <p className="text-muted">핸드</p>
          <p className="text-base font-semibold tabular-nums text-ink">{stats.n}</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-[#1a1a1a] px-2 py-2">
          <p className="text-muted">GTOW 점수</p>
          <p className="text-base font-semibold tabular-nums text-ink">{gtoScore}%</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-[#1a1a1a] px-2 py-2">
          <p className="text-muted">실수</p>
          <p className="text-base font-semibold tabular-nums text-rose-300">{stats.wrong}</p>
        </div>
      </div>
    </div>
  );
}

export default function HandTrainer() {
  const [cfg, setCfg] = useState(() => loadSolution());
  const [draft, setDraft] = useState(cfg);
  const [picker, setPicker] = useState(false);
  const [setup, setSetup] = useState(() => loadTrainSetup());
  const [phase, setPhase] = useState('setup');
  const [packTick, setPackTick] = useState(0);

  return (
    <div>
      {phase === 'setup' ? (
        <SetupScreen
          cfg={cfg}
          setup={setup}
          setSetup={setSetup}
          packTick={packTick}
          onPack={() => setPackTick((t) => t + 1)}
          onStart={() => setPhase('drill')}
          onOpenSolution={() => {
            setDraft(cfg);
            setPicker(true);
          }}
        />
      ) : (
        <DrillScreen
          key={packTick}
          cfg={cfg}
          setup={setup}
          onExit={() => setPhase('setup')}
        />
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
