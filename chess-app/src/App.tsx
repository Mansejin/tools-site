import { useMemo, useState } from 'react';
import repertoireData from './data/repertoire.json';
import { LinePicker } from './components/LinePicker';
import { CatalogBrowser } from './components/CatalogBrowser';
import { DrillSession, catalogToLine } from './components/DrillSession';
import type { CatalogOpening, RepertoireLine } from './types';

type View = 'home' | 'catalog' | 'session';

export default function App() {
  const lines = repertoireData.lines as RepertoireLine[];
  const [view, setView] = useState<View>('home');
  const [active, setActive] = useState<RepertoireLine | null>(null);
  const [openings, setOpenings] = useState<CatalogOpening[] | null>(null);
  const [catalogCount, setCatalogCount] = useState(3800);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const subtitle = useMemo(() => {
    if (view === 'catalog') return 'Lichess 오프닝 카탈로그';
    if (view === 'session' && active) return active.titleKo;
    return '레퍼토리 드릴 + 엔진 이어치기';
  }, [view, active]);

  const startLine = (line: RepertoireLine) => {
    setActive(line);
    setView('session');
  };

  const openCatalog = async () => {
    setView('catalog');
    if (openings) return;
    setCatalogLoading(true);
    try {
      const mod = await import('./data/openings.json');
      const data = mod.default;
      setOpenings(data.openings as CatalogOpening[]);
      setCatalogCount(data.count ?? data.openings.length);
    } finally {
      setCatalogLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="site-top flex items-center justify-between gap-3 px-4 sm:px-6 py-3 text-sm">
        <a className="text-[var(--muted)] hover:text-[var(--ink)]" href="/toys/">
          ← 장난감
        </a>
        <a className="text-[var(--muted)] hover:text-[var(--ink)]" href="/">
          도구함
        </a>
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
        <header className="pt-2 pb-8 animate-in">
          <p className="mono text-xs tracking-[0.18em] uppercase text-[var(--accent)] mb-2">
            Opening Drill
          </p>
          <h1 className="display text-4xl sm:text-5xl text-[var(--ink)]">오프닝 드릴</h1>
          <p className="mt-2 text-[var(--muted)] max-w-lg">{subtitle}</p>
        </header>

        {view === 'home' && (
          <LinePicker
            lines={lines}
            catalogCount={catalogCount}
            onPick={startLine}
            onBrowseCatalog={() => void openCatalog()}
          />
        )}

        {view === 'catalog' && (
          catalogLoading || !openings ? (
            <p className="text-[var(--muted)] animate-in">카탈로그 불러오는 중…</p>
          ) : (
            <CatalogBrowser
              openings={openings}
              onBack={() => setView('home')}
              onStart={(o, side) => startLine(catalogToLine(o, side))}
            />
          )
        )}

        {view === 'session' && active && (
          <DrillSession
            key={active.id}
            line={active}
            onExit={() => {
              setActive(null);
              setView('home');
            }}
          />
        )}
      </main>

      <footer className="text-center text-xs text-[var(--muted)] pb-8 px-4">
        오프닝 데이터{' '}
        <a
          href="https://github.com/lichess-org/chess-openings"
          target="_blank"
          rel="noreferrer"
        >
          lichess-org/chess-openings
        </a>{' '}
        (CC0) · 엔진 Stockfish (GPL-3.0) / 폴백 연습봇
      </footer>
    </div>
  );
}
