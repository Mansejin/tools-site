import { useEffect, useMemo, useState } from 'react';
import { Settings2, ExternalLink, BookOpen, Swords, Grid3x3, RotateCcw } from 'lucide-react';
import SolutionPicker from './SolutionPicker.jsx';
import PackBar from './PackBar.jsx';
import HandGrid from './HandGrid.jsx';
import { loadSolution, saveSolution, summaryLabel } from './solutionConfig.js';
import { engineMeta, gridGetter, strategyFrequencies } from './solutionEngine.js';
import {
  rootNode,
  advance,
  availableActions,
  nodeTitle,
  pfLabel,
  crumbLabel,
} from './chartTree.js';

const LINKS = [
  {
    href: 'https://wasm-postflop.pages.dev/',
    title: 'WASM Postflop',
    desc: '브라우저 포스트플랍 솔버 → 결과 핸드를 JSON 팩으로 옮겨 넣기',
    icon: Swords,
  },
  {
    href: 'https://libregto.com',
    title: 'LibreGTO',
    desc: '무료 드릴 · 레슨',
    icon: BookOpen,
  },
  {
    href: 'https://github.com/bupticybee/TexasSolver',
    title: 'TexasSolver',
    desc: 'PC용 솔버 · export를 팩 JSON에 맞춰 저장',
    icon: Grid3x3,
  },
];

const ACT_BTN = {
  fold: 'bg-[#3D7CB8] text-white',
  call: 'bg-[#5ab966] text-white',
  raise: 'bg-[#f03c3c] text-white',
  shove: 'bg-[#7d1f1f] text-white',
};

export default function GtoLab() {
  const [cfg, setCfg] = useState(() => loadSolution());
  const [draft, setDraft] = useState(cfg);
  const [picker, setPicker] = useState(false);
  const [packTick, setPackTick] = useState(0);
  const [stack, setStack] = useState(() => [rootNode(cfg)]);
  const meta = useMemo(() => engineMeta(cfg), [cfg, packTick]);

  useEffect(() => {
    setStack([rootNode(cfg)]);
  }, [cfg]);

  const node = stack[stack.length - 1];
  const spot = { pos: node.seat, pfAction: node.pfAction };
  const getAction = useMemo(
    () => (node.terminal ? () => 'fold' : gridGetter(cfg, spot)),
    [cfg, node.seat, node.pfAction, node.terminal, packTick],
  );
  const getFreqs = useMemo(
    () => (hand) => (node.terminal ? null : strategyFrequencies(cfg, hand, spot)),
    [cfg, node.seat, node.pfAction, node.terminal, packTick],
  );
  const actions = availableActions(node, cfg);

  const fidelityLabel =
    meta.fidelity === 'exact' ? '정확' : meta.fidelity === 'pack' ? '내 팩' : '근사';

  return (
    <div className="space-y-5">
      <PackBar onChange={() => setPackTick((t) => t + 1)} />

      <div className="rounded-2xl border border-white/10 bg-felt-3/80 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">차트 · 솔버</h2>
            <p className="mt-1 text-xs text-muted">{summaryLabel(cfg)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraft(cfg);
              setPicker(true);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-felt px-3 text-sm font-medium text-ink"
          >
            <Settings2 size={16} />
            솔루션 모음
          </button>
        </div>

        <p
          className={`mb-4 rounded-xl border px-3 py-2 text-xs leading-relaxed ${
            meta.fidelity === 'exact' || meta.fidelity === 'pack'
              ? 'border-casino-green/30 bg-casino-green/10 text-emerald-100'
              : 'border-gold/25 bg-gold/10 text-amber-100'
          }`}
        >
          {fidelityLabel} · {meta.note} 액션을 고르면 다음 포지션 차트로 이동합니다.
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {stack.map((n, i) => {
            const label =
              i === 0
                ? `${n.seat} ${pfLabel(n.pfAction)}`
                : crumbFromAdvance(stack[i - 1], n, cfg);
            return (
              <button
                key={`${i}-${n.seat}-${n.pfAction}-${n.terminal || ''}`}
                type="button"
                onClick={() => setStack(stack.slice(0, i + 1))}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  i === stack.length - 1
                    ? 'bg-gold text-felt'
                    : 'border border-white/10 text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
          {stack.length > 1 && (
            <button
              type="button"
              onClick={() => setStack([rootNode(cfg)])}
              className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:text-ink"
              title="처음으로"
            >
              <RotateCcw size={12} />
              리셋
            </button>
          )}
        </div>

        {!node.terminal ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setStack([...stack, advance(node, a.id, cfg)])}
                className={`min-h-11 min-w-[5.5rem] rounded-xl px-4 text-sm font-semibold ${ACT_BTN[a.id] || ACT_BTN.raise}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="text-sm text-amber-100">{nodeTitle(node, cfg)}</p>
            <button
              type="button"
              onClick={() => setStack([rootNode(cfg)])}
              className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-ink"
            >
              처음부터
            </button>
          </div>
        )}

        {!node.terminal && (
          <HandGrid
            key={`${packTick}-${node.seat}-${node.pfAction}`}
            getAction={getAction}
            getFreqs={getFreqs}
            title={nodeTitle(node, cfg)}
          />
        )}
      </div>

      <div className="rounded-2xl border border-white/8 bg-felt-2/80 p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-gold">외부 솔버 → 팩</h3>
        <ul className="space-y-2">
          {LINKS.map(({ href, title, desc, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-white/3"
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
      </div>

      {picker && (
        <SolutionPicker
          value={draft}
          onChange={setDraft}
          onClose={() => setPicker(false)}
          onApply={(s) => {
            const next = saveSolution(s);
            setCfg(next);
          }}
        />
      )}
    </div>
  );
}

function crumbFromAdvance(from, to, cfg) {
  for (const a of availableActions(from, cfg)) {
    const n = advance(from, a.id, cfg);
    if (
      n.seat === to.seat &&
      n.pfAction === to.pfAction &&
      n.terminal === to.terminal &&
      n.opener === to.opener &&
      n.threeBettor === to.threeBettor
    ) {
      return crumbLabel(from, a.id);
    }
  }
  return `${to.seat} ${pfLabel(to.pfAction)}`;
}
