import { useEffect, useMemo, useState } from 'react';
import { Settings2, ExternalLink, BookOpen, Swords, Grid3x3 } from 'lucide-react';
import SolutionPicker from './SolutionPicker.jsx';
import HandGrid from './HandGrid.jsx';
import { loadSolution, saveSolution, summaryLabel } from './solutionConfig.js';
import { engineMeta, positionsFor, gridGetter } from './solutionEngine.js';

const LINKS = [
  {
    href: 'https://wasm-postflop.pages.dev/',
    title: 'WASM Postflop',
    desc: '브라우저 포스트플랍 솔버 (오픈소스)',
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
    desc: 'PC용 솔버',
    icon: Grid3x3,
  },
];

export default function GtoLab() {
  const [cfg, setCfg] = useState(() => loadSolution());
  const [draft, setDraft] = useState(cfg);
  const [picker, setPicker] = useState(false);
  const positions = useMemo(() => positionsFor(cfg), [cfg]);
  const [pos, setPos] = useState(positions[0]?.id || 'SB');
  const meta = useMemo(() => engineMeta(cfg), [cfg]);

  useEffect(() => {
    const list = positionsFor(cfg);
    if (!list.some((p) => p.id === pos)) setPos(list[0].id);
  }, [cfg, pos]);

  const getAction = useMemo(() => gridGetter(cfg, { pos }), [cfg, pos]);

  return (
    <div className="space-y-5">
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
            meta.fidelity === 'exact'
              ? 'border-casino-green/30 bg-casino-green/10 text-emerald-100'
              : 'border-gold/25 bg-gold/10 text-amber-100'
          }`}
        >
          {meta.fidelity === 'exact' ? '정확' : '근사'} · {meta.note}
        </p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {positions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPos(p.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                pos === p.id ? 'bg-gold text-felt' : 'border border-white/10 text-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <HandGrid getAction={getAction} title={`${pos} · ${cfg.stack}bb`} />
      </div>

      <div className="rounded-2xl border border-white/8 bg-felt-2/80 p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-gold">외부 솔버</h3>
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
