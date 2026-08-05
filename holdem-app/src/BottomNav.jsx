import { GraduationCap, Grid3x3 } from 'lucide-react';

const PRIMARY = [
  { id: 'practice', label: '연습', icon: GraduationCap },
  { id: 'charts', label: '차트', icon: Grid3x3 },
];

export default function BottomNav({ tab, onTab }) {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-felt/95 backdrop-blur-md md:hidden"
      aria-label="모바일 메뉴"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-0 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
        {PRIMARY.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition ${
                active ? 'text-casino-green-bright' : 'text-muted'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
