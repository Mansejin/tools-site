import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3x3, ExternalLink, BookOpen, Swords } from 'lucide-react';
import {
  GRID_RANKS,
  handFromGrid,
  isCall,
  isShove,
  MAX_PUSHFOLD_BB,
  MIN_PUSHFOLD_BB,
} from './pushfoldNash.js';
import { RFI_CHARTS, RFI_POSITIONS, cellAction, countInRange } from './rfiCharts.js';

const ACTION_STYLE = {
  raise: 'bg-casino-green/80 text-white',
  allin: 'bg-deep-red/80 text-white',
  call: 'bg-sky-700/80 text-white',
  mixed: 'bg-gold/70 text-felt',
  fold: 'bg-felt-4/80 text-muted/50',
  shove: 'bg-casino-green/80 text-white',
};

function HandGrid({ getAction, title }) {
  const [picked, setPicked] = useState(null);

  return (
    <div>
      {title && <p className="mb-2 text-xs font-medium tracking-wide text-gold">{title}</p>}
      <div
        className="grid gap-px rounded-lg border border-white/10 bg-black/40 p-0.5 sm:p-1"
        style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
      >
        {GRID_RANKS.map((_, row) =>
          GRID_RANKS.map((__, col) => {
            const hand = handFromGrid(row, col);
            const action = getAction(hand);
            const sel = picked === hand;
            return (
              <button
                key={hand}
                type="button"
                title={`${hand} · ${action}`}
                onClick={() => setPicked(hand)}
                className={`hand-grid-cell flex aspect-square items-center justify-center rounded-[2px] font-semibold leading-none ${ACTION_STYLE[action] || ACTION_STYLE.fold} ${
                  sel ? 'ring-2 ring-gold ring-offset-1 ring-offset-felt' : ''
                }`}
              >
                {hand}
              </button>
            );
          }),
        )}
      </div>
      {picked && (
        <p className="mt-2 rounded-lg bg-felt px-3 py-2 text-center text-sm">
          <span className="font-semibold text-ink">{picked}</span>
          <span className="mx-2 text-muted">·</span>
          <span className="text-gold uppercase">{getAction(picked)}</span>
        </p>
      )}
    </div>
  );
}

function NashPanel() {
  const [bb, setBb] = useState(15);
  const [mode, setMode] = useState('shove'); // shove | call

  const pct = useMemo(() => {
    let n = 0;
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const h = handFromGrid(r, c);
        if (mode === 'shove' ? isShove(h, bb) : isCall(h, bb)) n++;
      }
    }
    return ((n / 169) * 100).toFixed(1);
  }, [bb, mode]);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        헤즈업 숏스택 Nash 푸시/폴드. 스택(bb)을 바꾸면 잼·콜 레인지가 바뀐다. (최대 25bb)
      </p>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'shove', label: 'SB 잼(Shove)' },
          { id: 'call', label: 'BB 콜(Call)' },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              mode === m.id
                ? 'bg-gold text-felt'
                : 'border border-white/10 bg-felt-2 text-muted hover:text-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted">유효 스택</span>
          <span className="font-semibold text-gold">
            {bb}bb · {pct}%
          </span>
        </div>
        <input
          type="range"
          min={MIN_PUSHFOLD_BB}
          max={MAX_PUSHFOLD_BB}
          value={bb}
          onChange={(e) => setBb(Number(e.target.value))}
          className="w-full accent-gold"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>1bb</span>
          <span>15bb (펍 터보)</span>
          <span>25bb</span>
        </div>
      </div>

      <HandGrid
        getAction={(hand) => {
          const inRange = mode === 'shove' ? isShove(hand, bb) : isCall(hand, bb);
          return inRange ? (mode === 'shove' ? 'shove' : 'call') : 'fold';
        }}
      />

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-sm bg-casino-green/80" /> 잼
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-sm bg-sky-700/80" /> 콜
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-sm bg-felt-4" /> 폴드
        </span>
      </div>
    </div>
  );
}

function RfiPanel() {
  const [pos, setPos] = useState('UTG');
  const chart = RFI_CHARTS[pos];
  const n = countInRange(chart);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        6-max 첫 오픈(RFI) 차트. Pekarstas 레인지 기준 13×13.
      </p>
      <div className="rounded-xl border border-deep-red/30 bg-deep-red/10 px-3 py-2 text-xs text-red-200">
        펍에서는 GTO보다 타이트하게. 콜 많은 상대에겐 A5s 같은 3벳 블러프는 빼고, 센 핸드 밸류·슬로우플레이 위주.
      </div>

      <div className="flex flex-wrap gap-1.5">
        {RFI_POSITIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPos(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              pos === p
                ? 'bg-casino-green text-white'
                : 'border border-white/10 bg-felt-2 text-muted hover:text-ink'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <p className="text-sm text-gold">
        {pos} RFI · 약 {((n / 169) * 100).toFixed(0)}% ({n}/169)
      </p>

      <HandGrid getAction={(hand) => cellAction(chart, hand)} />

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-sm bg-casino-green/80" /> 레이즈
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-sm bg-gold/70" /> 믹스
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-sm bg-felt-4" /> 폴드
        </span>
      </div>
    </div>
  );
}

const LINKS = [
  {
    href: 'https://libregto.com',
    title: 'LibreGTO',
    desc: '무료 연습 · 드릴·레슨',
    icon: BookOpen,
  },
  {
    href: 'https://ahtoooxa.github.io/poker-charts/',
    title: 'Poker Charts',
    desc: '프리플랍 차트 전체 (vs 오픈·3벳·4벳)',
    icon: Grid3x3,
  },
  {
    href: 'https://github.com/bupticybee/TexasSolver',
    title: 'TexasSolver',
    desc: 'PC용 솔버 (무거움)',
    icon: Swords,
  },
];

export default function GtoLab() {
  const [panel, setPanel] = useState('nash');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gold/15 bg-felt-3/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Grid3x3 size={18} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-wide text-ink sm:text-xl">
              프리플랍 차트
            </h2>
            <p className="mt-1 text-sm text-muted">
              오픈소스 Nash·RFI 데이터를 넣었습니다. (GTO Wizard 클론은 아님)
            </p>
          </div>
        </div>

        <div className="mb-5 flex gap-1 rounded-xl border border-white/8 bg-felt p-1">
          {[
            { id: 'nash', label: 'Nash 푸시/폴드' },
            { id: 'rfi', label: 'RFI 차트' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPanel(p.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                panel === p.id ? 'bg-gold/90 text-felt' : 'text-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <motion.div
          key={panel}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {panel === 'nash' ? <NashPanel /> : <RfiPanel />}
        </motion.div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-felt-2/80 p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-gold">더 볼 곳</h3>
        <ul className="space-y-2">
          {LINKS.map(({ href, title, desc, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-gold/20 hover:bg-white/3"
              >
                <Icon size={16} className="mt-0.5 shrink-0 text-casino-green-bright" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    {title}
                    <ExternalLink size={12} className="text-muted" />
                  </span>
                  <span className="block text-xs text-muted">{desc}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-muted/80">
          Nash 데이터: hellomate2/gto-poker-overlay (MIT) · RFI 차트: AHTOOOXA/poker-charts Pekarstas
          (MIT)
        </p>
      </div>
    </div>
  );
}
