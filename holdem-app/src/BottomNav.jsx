import { Home, Wrench, GraduationCap, BookOpen } from 'lucide-react';

const PRIMARY = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'tools', label: '도구', icon: Wrench },
  { id: 'quiz', label: '퀴즈', icon: GraduationCap },
  { id: 'guide', label: '학습', icon: BookOpen },
];

const GUIDE_ITEMS = [
  { id: 'turbo', label: '터보' },
  { id: 'mtt', label: 'MTT' },
  { id: 'hu', label: '헤즈업' },
  { id: 'gto', label: '차트' },
];

export function isGuideTab(tab) {
  return GUIDE_ITEMS.some((g) => g.id === tab);
}

export default function BottomNav({ tab, onTab, guideOpen, setGuideOpen }) {
  const activePrimary =
    tab === 'home' || tab === 'tools' || tab === 'quiz' ? tab : 'guide';

  return (
    <>
      {guideOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="닫기"
            onClick={() => setGuideOpen(false)}
          />
          <div className="safe-bottom absolute inset-x-0 bottom-0 rounded-t-2xl border border-gold/20 bg-felt-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-3 text-center text-sm font-medium text-muted">학습</p>
            <div className="grid grid-cols-2 gap-2">
              {GUIDE_ITEMS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onTab(g.id);
                    setGuideOpen(false);
                  }}
                  className={`min-h-12 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    tab === g.id
                      ? 'bg-gold text-felt'
                      : 'border border-white/10 bg-felt text-ink active:bg-white/5'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gold/15 bg-felt/95 backdrop-blur-md md:hidden"
        aria-label="모바일 메뉴"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-0 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
          {PRIMARY.map(({ id, label, icon: Icon }) => {
            const active = activePrimary === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'guide') {
                    setGuideOpen((o) => !o);
                    return;
                  }
                  setGuideOpen(false);
                  onTab(id);
                }}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition ${
                  active ? 'text-gold' : 'text-muted'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
