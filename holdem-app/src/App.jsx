import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { GraduationCap, ArrowLeft, Grid3x3, BookOpen } from 'lucide-react';
import BottomNav from './BottomNav.jsx';
import TrainerGuide from './TrainerGuide.jsx';
import { readRoute, writeRoute } from './lib/route.js';

const GtoLab = lazy(() => import('./gto/GtoLab.jsx'));
const HandTrainer = lazy(() => import('./gto/HandTrainer.jsx'));

function TabFallback() {
  return <p className="py-16 text-center text-sm text-muted">로딩…</p>;
}

const MAIN_TABS = [
  { id: 'practice', label: 'GTO 연습', short: '연습', icon: GraduationCap },
  { id: 'charts', label: '차트 · 솔버', short: '차트', icon: Grid3x3 },
];

export default function App() {
  const initial = readRoute();
  const [tab, setTab] = useState(initial.tab);
  const [installPrompt, setInstallPrompt] = useState(null);

  const syncRoute = useCallback(
    (next) => {
      const state = { tab: next.tab ?? tab };
      if (next.tab !== undefined) setTab(next.tab);
      writeRoute(state);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [tab],
  );

  useEffect(() => {
    function onPop() {
      setTab(readRoute().tab);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    function onBip(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  function goTab(id) {
    syncRoute({ tab: id });
  }

  async function onInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  const onMore = tab === 'more';

  return (
    <div className="felt-noise min-h-dvh">
      <div className="mx-auto max-w-5xl px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pb-16 sm:pt-6 md:pb-16">
        <div className="mb-4 flex items-center justify-between gap-2">
          <a
            href="/toys/"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm text-muted transition hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">장난감</span>
          </a>

          <div className="flex items-center gap-1">
            {onMore ? (
              <button
                type="button"
                onClick={() => goTab('practice')}
                className="min-h-10 rounded-lg px-2 text-sm text-muted hover:text-ink"
              >
                닫기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goTab('more')}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted transition hover:bg-felt-3 hover:text-ink"
                aria-label="가이드"
                title="가이드"
              >
                <BookOpen size={16} />
                <span className="hidden sm:inline">가이드</span>
              </button>
            )}
          </div>
        </div>

        {!onMore && (
          <nav
            className="sticky top-0 z-40 -mx-3 mb-5 hidden border-b border-white/8 bg-felt/95 px-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:block"
            aria-label="메뉴"
          >
            <div className="flex gap-1 overflow-x-auto py-1.5 scrollbar-thin">
              {MAIN_TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => goTab(id)}
                    className={`relative flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? 'text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                    {active && (
                      <span className="absolute inset-x-2 -bottom-1.5 h-0.5 rounded-full bg-casino-green-bright" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <Suspense fallback={<TabFallback />}>
          {tab === 'practice' && <HandTrainer />}
          {tab === 'charts' && <GtoLab />}
        </Suspense>
        {tab === 'more' && (
          <TrainerGuide installPrompt={installPrompt} onInstall={onInstall} />
        )}

        <footer className="mt-10 hidden border-t border-white/8 pt-6 text-center text-xs text-muted md:block">
          <p>※ 학습용입니다. 도박을 권하지 않습니다.</p>
        </footer>
      </div>

      {!onMore && <BottomNav tab={tab} onTab={goTab} />}
    </div>
  );
}
