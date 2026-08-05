import { useEffect, useMemo, useState } from 'react';
import {
  Timer,
  Calculator,
  Search,
  GitBranch,
  ScrollText,
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import { isShove, isCall } from '../gto/pushfoldNash.js';
import { RFI_CHARTS, cellAction } from '../gto/rfiCharts.js';
import { normalizeHand, shouldPush, shouldCallShove } from './pushFoldPub.js';
import { shareUrl } from '../lib/route.js';
import { useGameSettings } from '../settings/GameSettingsContext.jsx';
import SettingsPanel from '../settings/SettingsPanel.jsx';

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-gold/15 bg-felt-3/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function SubTabs({ tabs, value, onChange }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-thin">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition ${
            value === t.id
              ? 'bg-gold text-felt'
              : 'border border-white/12 bg-felt text-muted active:bg-white/5'
          }`}
        >
          <t.icon size={14} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full min-h-12 rounded-xl border border-white/10 bg-felt px-3 py-3 text-ink outline-none focus:border-gold/40';

/* ─── Blind timer ─── */
function BlindTimer() {
  const { settings, analysis, turbo } = useGameSettings();
  const [levelMin, setLevelMin] = useState(settings.levelMin);
  const [startStack, setStartStack] = useState(settings.startChips);
  const [startBB, setStartBB] = useState(settings.startBB);
  const [level, setLevel] = useState(1);
  const [left, setLeft] = useState(settings.levelMin * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setLevelMin(settings.levelMin);
    setStartStack(settings.startChips);
    setStartBB(settings.startBB);
    setLeft(settings.levelMin * 60);
    setLevel(1);
    setRunning(false);
  }, [settings.levelMin, settings.startChips, settings.startBB]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setLevel((l) => l + 1);
          return levelMin * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, levelMin]);

  const bb = startBB * 2 ** (level - 1);
  const stackBb = startStack / bb;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        설정값 기준 · {turbo.summary}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="시작 스택">
          <input
            type="number"
            className={inputCls}
            value={startStack}
            onChange={(e) => setStartStack(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="시작 BB">
          <input
            type="number"
            className={inputCls}
            value={startBB}
            onChange={(e) => setStartBB(Number(e.target.value) || 1)}
          />
        </Field>
        <Field label="레벨(분)">
          <input
            type="number"
            className={inputCls}
            value={levelMin}
            onChange={(e) => {
              const m = Number(e.target.value) || 1;
              setLevelMin(m);
              setLeft(m * 60);
            }}
          />
        </Field>
        <Field label="현재 레벨">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={level}
            onChange={(e) => setLevel(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-gold/20 bg-felt p-5 text-center sm:p-6">
        <p className="text-xs tracking-widest text-gold uppercase">Level {level}</p>
        <p className="font-display mt-2 text-6xl font-bold tracking-tight text-ink tabular-nums sm:text-7xl">
          {mm}:{ss}
        </p>
        <p className="mt-3 text-sm text-muted">
          BB <span className="font-semibold text-gold">{bb.toLocaleString()}</span>
          {' · '}
          스택 <span className="font-semibold text-casino-green-bright">{stackBb.toFixed(1)}bb</span>
        </p>
        {stackBb <= analysis.pushFoldBb && (
          <p className="mt-2 text-sm font-medium text-red-300">
            숏스택 — {analysis.pushFoldBb}bb 이하 푸시/폴드
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold px-4 text-base font-semibold text-felt active:brightness-95"
        >
          {running ? <Pause size={20} /> : <Play size={20} />}
          {running ? '일시정지' : '시작'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setLeft(levelMin * 60);
          }}
          className="inline-flex min-h-14 min-w-14 items-center justify-center rounded-2xl border border-white/15 text-muted"
          aria-label="리셋"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
}

/* ─── Hand lookup ─── */
function HandLookup({ initialHand, initialPos }) {
  const { analysis } = useGameSettings();
  const [hand, setHand] = useState(initialHand || 'K9o');
  const [pos, setPos] = useState(initialPos || 'BTN');
  const [bb, setBb] = useState(analysis.pushFoldBb);
  const [mode, setMode] = useState('pub'); // pub | nash | rfi
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialHand) setHand(initialHand);
  }, [initialHand]);
  useEffect(() => {
    if (initialPos) setPos(initialPos);
  }, [initialPos]);
  useEffect(() => {
    setBb(analysis.pushFoldBb);
  }, [analysis.pushFoldBb]);

  const norm = normalizeHand(hand);
  const result = useMemo(() => {
    if (!norm) return { ok: false, msg: '핸드 형식: AKs, ATo, 77' };
    if (mode === 'pub') {
      const push = shouldPush(norm, pos === 'BB' ? 'BTN' : pos);
      const call = shouldCallShove(norm, pos === 'SB' ? 'BB' : pos === 'UTG' ? 'UTG' : 'BB');
      return {
        ok: true,
        lines: [
          {
            label: `${analysis.pushFoldBb}bb 오픈 잼 (펍)`,
            yes: push,
            detail: push ? 'PUSH' : 'FOLD',
          },
          { label: '남의 올인 콜 (타이트)', yes: call, detail: call ? 'CALL' : 'FOLD' },
        ],
      };
    }
    if (mode === 'nash') {
      const shove = isShove(norm, bb);
      const call = isCall(norm, bb);
      return {
        ok: true,
        lines: [
          { label: `HU Nash 잼 @ ${bb}bb`, yes: shove, detail: shove ? 'SHOVE' : 'FOLD' },
          { label: `HU Nash 콜 @ ${bb}bb`, yes: call, detail: call ? 'CALL' : 'FOLD' },
        ],
      };
    }
    const chart = RFI_CHARTS[pos] || RFI_CHARTS.UTG;
    const act = cellAction(chart, norm);
    return {
      ok: true,
      lines: [
        {
          label: `${pos} RFI (Pekarstas)`,
          yes: act !== 'fold',
          detail: act === 'fold' ? 'FOLD' : act === 'mixed' ? 'MIXED' : 'RAISE',
        },
      ],
    };
  }, [norm, pos, bb, mode, analysis.pushFoldBb]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'pub', label: `펍 ${analysis.pushFoldBb}bb` },
          { id: 'nash', label: 'HU Nash' },
          { id: 'rfi', label: 'RFI 차트' },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === m.id ? 'bg-gold text-felt' : 'border border-white/10 text-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="핸드">
          <input
            className={inputCls}
            value={hand}
            onChange={(e) => setHand(e.target.value)}
            placeholder="AJo"
          />
        </Field>
        <Field label="포지션">
          <select className={inputCls} value={pos} onChange={(e) => setPos(e.target.value)}>
            {['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        {mode === 'nash' && (
          <Field label="스택(bb)">
            <input
              type="number"
              min={1}
              max={25}
              className={inputCls}
              value={bb}
              onChange={(e) => setBb(Number(e.target.value) || 15)}
            />
          </Field>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-felt p-4">
        {!result.ok ? (
          <p className="text-sm text-red-300">{result.msg}</p>
        ) : (
          <ul className="space-y-3">
            {result.lines.map((l) => (
              <li key={l.label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">{l.label}</span>
                <span
                  className={`rounded-lg px-3 py-1 text-sm font-bold ${
                    l.yes ? 'bg-casino-green/25 text-casino-green-bright' : 'bg-deep-red/25 text-red-300'
                  }`}
                >
                  {l.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={async () => {
          const link = shareUrl({
            tab: 'tools',
            tool: 'lookup',
            hand: norm || hand,
            pos,
            mode: mode === 'pub' ? undefined : mode,
          });
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            window.prompt('링크 복사', link);
          }
        }}
        className="w-full min-h-12 rounded-xl border border-gold/30 text-sm font-medium text-gold active:bg-gold/10"
      >
        {copied ? '복사됨' : '이 조회 링크 복사'}
      </button>
    </div>
  );
}

/* ─── Bubble tree ─── */
const BUBBLE_ADVICE = {
  'leader-bubble': {
    title: '칩 리더 · 버블',
    points: [
      '미들 스택을 넓게 열어 압박한다 (VPIP 60%+)',
      '숏스택끼리 올인은 굳이 안 끼어도 된다',
      '싼 스틸로 칩을 불리며 ITM을 압박한다',
    ],
  },
  'middle-bubble': {
    title: '미들 스택 · 버블',
    points: [
      '칩 리더 오픈에는 타이트하게',
      '숏스택 스틸은 골라서 리레이즈/콜',
      '일단 버블 통과가 우선 — 애매한 올인은 줄인다',
    ],
  },
  'short-bubble': {
    title: '숏스택 · 버블',
    points: [
      '센 핸드만 노린다',
      '폴드 에퀴티 있을 때만 푸시',
      '블라인드에 녹지 않게 타이밍을 본다',
    ],
  },
  'leader-itm': {
    title: '칩 리더 · ITM 직후',
    points: [
      '숏스택 올인은 애매해도 콜해서 칩을 먹는다',
      '77, KTs도 받아볼 타이밍',
      '칩으로 계속 테이블을 누른다',
    ],
  },
  'middle-itm': {
    title: '미들 스택 · ITM 직후',
    points: [
      '숏스택 올인: 핸드 세면 콜, 약하면 패스',
      '리더와 큰 팟은 피한다',
      '페이 점프를 보며 선택적으로 공격',
    ],
  },
  'short-itm': {
    title: '숏스택 · ITM 직후',
    points: [
      '상금은 이미 확정 — 더블업이 목표',
      '푸시 레인지를 넓혀도 된다',
      '칩 리더 BB는 스틸 가치가 크다',
    ],
  },
};

function BubbleTree() {
  const [stack, setStack] = useState('leader');
  const [phase, setPhase] = useState('bubble');
  const key = `${stack}-${phase}`;
  const advice = BUBBLE_ADVICE[key];

  return (
    <div className="space-y-4">
      <Field label="내 스택">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'leader', label: '칩 리더' },
            { id: 'middle', label: '미들' },
            { id: 'short', label: '숏' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStack(s.id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                stack === s.id ? 'bg-casino-green text-white' : 'border border-white/10 text-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="국면">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'bubble', label: '버블' },
            { id: 'itm', label: 'ITM 직후' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPhase(s.id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                phase === s.id ? 'bg-gold text-felt' : 'border border-white/10 text-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <div key={key} className="rounded-xl border border-gold/25 bg-gold/10 p-4">
        <h3 className="mb-3 font-display text-lg text-gold-soft">{advice.title}</h3>
        <ul className="space-y-2">
          {advice.points.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-ink/90">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── ROI ─── */
function RoiCalc() {
  const { settings, analysis, turbo } = useGameSettings();
  const [buyin, setBuyin] = useState(settings.buyin);
  const [rebuy, setRebuy] = useState(settings.rebuy);
  const [rebuyN, setRebuyN] = useState(settings.maxRebuys);
  const [itm, setItm] = useState(25);
  const [avgCash, setAvgCash] = useState(120000);

  useEffect(() => {
    setBuyin(settings.buyin);
    setRebuy(settings.rebuy);
    setRebuyN(settings.maxRebuys);
  }, [settings.buyin, settings.rebuy, settings.maxRebuys]);

  const cost = buyin + rebuy * rebuyN;
  const ev = (itm / 100) * avgCash - cost;
  const roi = cost > 0 ? (ev / cost) * 100 : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">설정 바이인·리바 기준. {turbo.rebuy}</p>
      <p className="text-xs text-gold">
        최대 비용(설정) {analysis.totalBuyCost.toLocaleString()}원 · 칩 상한{' '}
        {analysis.maxChips.toLocaleString()}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="바이인(원)">
          <input type="number" className={inputCls} value={buyin} onChange={(e) => setBuyin(+e.target.value || 0)} />
        </Field>
        <Field label="리바인 1회(원)">
          <input type="number" className={inputCls} value={rebuy} onChange={(e) => setRebuy(+e.target.value || 0)} />
        </Field>
        <Field label="리바인 횟수">
          <input type="number" min={0} className={inputCls} value={rebuyN} onChange={(e) => setRebuyN(+e.target.value || 0)} />
        </Field>
        <Field label="ITM %">
          <input type="number" min={0} max={100} className={inputCls} value={itm} onChange={(e) => setItm(+e.target.value || 0)} />
        </Field>
        <Field label="ITM 시 평균 상금">
          <input type="number" className={inputCls} value={avgCash} onChange={(e) => setAvgCash(+e.target.value || 0)} />
        </Field>
      </div>
      <div className="rounded-xl border border-white/10 bg-felt p-4 text-center">
        <p className="text-xs text-muted">총 비용 {cost.toLocaleString()}원</p>
        <p className={`mt-2 font-display text-3xl font-bold ${ev >= 0 ? 'text-casino-green-bright' : 'text-red-300'}`}>
          {ev >= 0 ? '+' : ''}
          {Math.round(ev).toLocaleString()}원
        </p>
        <p className="mt-1 text-sm text-gold">ROI {roi.toFixed(1)}%</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {[0, 1, 2, 3].map((n) => {
          const c = buyin + rebuy * n;
          const e = (itm / 100) * avgCash - c;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRebuyN(n)}
              className={`rounded-lg border px-2.5 py-1.5 ${
                rebuyN === n ? 'border-gold text-gold' : 'border-white/10 text-muted'
              }`}
            >
              {n}리바 · {e >= 0 ? '+' : ''}
              {Math.round(e / 1000)}k
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Cheat sheet ─── */
function CheatSheet() {
  const { turbo, analysis, summary } = useGameSettings();
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted">
      <div className="rounded-xl border border-gold/25 bg-gold/10 p-4">
        <h3 className="mb-2 font-display text-base text-gold">오늘 한 줄</h3>
        <p className="text-xs text-muted">{summary}</p>
        <p className="mt-2 text-ink">{turbo.summary}</p>
        <p className="mt-1 text-ink">
          리바 최대 {analysis.maxRebuys}회 · {turbo.earlyOpen} · {analysis.pushFoldBb}bb면 푸시/폴드
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-semibold text-ink">UTG 오픈</h3>
        <p>88+, AQo+, A5s만 · AJo/KQo 폴드 · 3~4bb</p>
      </div>
      <div>
        <h3 className="mb-2 font-semibold text-ink">{analysis.pushFoldBb}bb 잼 (앞 폴드)</h3>
        <ul className="space-y-1">
          <li>UTG 10%: 77+, ATs+, AQo+, KQs</li>
          <li>MP/CO 20%: 55+, 수티드 A, A9o+, 브로드웨이 s</li>
          <li>BTN 40%: 22+, 모든 A, 수티드 K, K9o+, J9s+</li>
          <li>SB 60%: 페어·A~J·거의 모든 수티드</li>
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-semibold text-ink">콜 많은 상대</h3>
        <p>{turbo.iso}</p>
      </div>
      <div>
        <h3 className="mb-2 font-semibold text-ink">버블 / ITM</h3>
        <p>리더는 압박 · 숏은 버티기 · ITM 후 숏 올인은 77도 콜</p>
      </div>
    </div>
  );
}

/* ─── Glossary ─── */
const GLOSSARY = [
  { t: 'bb', d: '빅 블라인드 단위. 스택·벳 사이즈를 bb로 표현.' },
  { t: '앤티(Ante)', d: '매 핸드 강제 데드머니. 스틸 가치↑.' },
  { t: 'RFI', d: 'Raise First In — 앞에 모두 폴드 후 첫 레이즈.' },
  { t: 'Iso', d: 'Isolation. 림프·콜 스테이션을 큰 사이즈로 헤즈업 만드는 것.' },
  { t: 'TPTK', d: 'Top Pair Top Kicker. 탑페어+탑키커.' },
  { t: '셋 마이닝', d: '작은 페어로 콜해서 셋을 노리는 플레이.' },
  { t: 'ITM', d: 'In The Money. 상금권 진입.' },
  { t: '버블', d: '상금권 직전. 한 명 더 탈락하면 ITM.' },
  { t: 'VPIP', d: '자발적으로 칩을 넣은 핸드 비율.' },
  { t: 'Chop', d: '상금을 칩 비율로 나누는 합의.' },
  { t: 'Nash', d: '서로 최선인 균형 전략(내시).' },
  { t: '폴드 에퀴티', d: '상대가 폴드해 줄 때 생기는 이득.' },
  { t: '콜 스테이션', d: '폴드를 거의 안 하고 콜만 많이 하는 상대.' },
];

function Glossary() {
  const [q, setQ] = useState('');
  const list = GLOSSARY.filter(
    (g) => !q || g.t.toLowerCase().includes(q.toLowerCase()) || g.d.includes(q),
  );
  return (
    <div className="space-y-3">
      <input
        className={inputCls}
        placeholder="용어 검색…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="divide-y divide-white/8 rounded-xl border border-white/10">
        {list.map((g) => (
          <li key={g.t} className="px-4 py-3">
            <div className="font-semibold text-gold">{g.t}</div>
            <p className="mt-0.5 text-sm text-muted">{g.d}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TOOL_TABS = [
  { id: 'settings', label: '설정', icon: Settings2 },
  { id: 'timer', label: '타이머', icon: Timer },
  { id: 'lookup', label: '핸드조회', icon: Search },
  { id: 'bubble', label: '버블', icon: GitBranch },
  { id: 'roi', label: 'ROI', icon: Calculator },
  { id: 'sheet', label: '치트시트', icon: ScrollText },
  { id: 'glossary', label: '용어', icon: BookOpen },
];

export default function PracticeTools({
  initialTool = 'timer',
  initialHand,
  initialPos,
  onToolChange,
}) {
  const [tab, setTab] = useState(initialTool);

  useEffect(() => {
    if (initialTool) setTab(initialTool);
  }, [initialTool]);

  function changeTool(id) {
    setTab(id);
    onToolChange?.(id);
  }

  return (
    <div className="rounded-2xl border border-gold/15 bg-felt-3/80 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:p-6">
      <SubTabs tabs={TOOL_TABS} value={tab} onChange={changeTool} />
      <div key={tab}>
        {tab === 'settings' && <SettingsPanel />}
        {tab === 'timer' && <BlindTimer />}
        {tab === 'lookup' && (
          <HandLookup initialHand={initialHand} initialPos={initialPos} />
        )}
        {tab === 'bubble' && <BubbleTree />}
        {tab === 'roi' && <RoiCalc />}
        {tab === 'sheet' && <CheatSheet />}
        {tab === 'glossary' && <Glossary />}
      </div>
    </div>
  );
}
