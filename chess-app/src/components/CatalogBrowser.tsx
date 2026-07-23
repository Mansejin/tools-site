import { useMemo, useState } from 'react';
import type { CatalogOpening } from '../types';

type Props = {
  openings: CatalogOpening[];
  onBack: () => void;
  onStart: (opening: CatalogOpening, side: 'white' | 'black') => void;
};

export function CatalogBrowser({ openings, onBack, onStart }: Props) {
  const [q, setQ] = useState('');
  const [eco, setEco] = useState<'all' | 'A' | 'B' | 'C' | 'D' | 'E'>('all');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return openings
      .filter((o) => (eco === 'all' ? true : o.eco.startsWith(eco)))
      .filter(
        (o) =>
          !query ||
          o.name.toLowerCase().includes(query) ||
          o.eco.toLowerCase().includes(query),
      )
      .slice(0, 80);
  }, [openings, q, eco]);

  return (
    <div className="animate-in space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← 추천 레퍼토리
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 ECO 검색…"
          className="flex-1 min-w-[180px] rounded-xl bg-[var(--bg2)] border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <div className="flex gap-1">
          {(['all', 'A', 'B', 'C', 'D', 'E'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setEco(k)}
              className={`mono text-xs px-2.5 py-1.5 rounded-lg border ${
                eco === k
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--muted)]'
              }`}
            >
              {k === 'all' ? 'ALL' : k}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Lichess chess-openings (CC0). 검색 결과 상위 80개만 표시.
      </p>
      <ul className="space-y-2 max-h-[60vh] overflow-auto pr-1">
        {filtered.map((o) => (
          <li
            key={`${o.eco}-${o.name}`}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg2)]/60 p-3 flex flex-wrap items-center gap-2 justify-between"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{o.name}</div>
              <div className="mono text-[11px] text-[var(--muted)]">
                {o.eco} · {o.moves.length} plies
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--panel)] hover:bg-[var(--line)]"
                onClick={() => onStart(o, 'white')}
              >
                백 드릴
              </button>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--panel)] hover:bg-[var(--line)]"
                onClick={() => onStart(o, 'black')}
              >
                흑 드릴
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
