import {
  SOLUTIONS,
  FORMATS,
  PLAYER_COUNTS,
  BET_SIZES,
  STACK_OPTIONS,
  summaryLabel,
} from './solutionConfig.js';

function Chip({ active, children, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-casino-green text-white'
          : 'border border-white/10 bg-felt-2 text-muted hover:text-ink'
      }`}
    >
      {children}
      {badge && (
        <span className="absolute -right-1 -top-1 rounded bg-emerald-500 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * GTOW-like solution collection. All options unlocked.
 */
export default function SolutionPicker({ value, onChange, onApply, onClose }) {
  const v = value;
  const set = (patch) => onChange({ ...v, ...patch });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="솔루션 모음"
    >
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-felt-3 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex gap-1">
            <span className="rounded-lg bg-felt-4 px-3 py-1.5 text-sm font-semibold text-ink">
              솔루션 모음
            </span>
            <span className="rounded-lg px-3 py-1.5 text-sm text-muted">커스텀 설정</span>
          </div>
          <button type="button" onClick={onClose} className="min-h-10 px-3 text-muted hover:text-ink" aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-4 sm:grid-cols-[1fr_1.2fr] sm:p-5">
          <div className="space-y-5">
            <Section title="솔루션">
              {SOLUTIONS.map((s) => (
                <Chip key={s.id} active={v.solution === s.id} onClick={() => set({ solution: s.id })}>
                  {s.label}
                </Chip>
              ))}
            </Section>
            <Section title="형식">
              {FORMATS.map((s) => (
                <Chip
                  key={s.id}
                  active={v.format === s.id}
                  onClick={() =>
                    set({
                      format: s.id,
                      players: s.id === 'hu' ? 2 : v.players === 2 ? 8 : v.players,
                    })
                  }
                >
                  {s.label}
                </Chip>
              ))}
            </Section>
            <Section title="플레이어">
              {PLAYER_COUNTS.map((n) => (
                <Chip
                  key={n}
                  active={v.players === n}
                  onClick={() => set({ players: n, format: n === 2 ? 'hu' : v.format === 'hu' ? 'chipev' : v.format })}
                >
                  {n}
                </Chip>
              ))}
            </Section>
            <Section title="프리플랍 벳 사이즈">
              {BET_SIZES.map((s) => (
                <Chip
                  key={s.id}
                  active={v.betSize === s.id}
                  badge={s.id === 'single' ? 'NEW' : null}
                  onClick={() => set({ betSize: s.id })}
                >
                  {s.label}
                </Chip>
              ))}
            </Section>
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between gap-2">
              <p className="text-xs font-medium tracking-wide text-muted">평균 스택</p>
              <p className="text-[11px] text-muted">{summaryLabel(v)}</p>
            </div>
            <div className="mb-2">
              <Chip active={false} onClick={() => set({ stack: 15 })}>
                모두
              </Chip>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {STACK_OPTIONS.map((bb) => (
                <button
                  key={bb}
                  type="button"
                  onClick={() => set({ stack: bb })}
                  className={`min-h-11 rounded-lg text-sm font-semibold tabular-nums transition ${
                    v.stack === bb
                      ? 'bg-casino-green text-white'
                      : 'border border-white/10 bg-felt-2 text-muted hover:text-ink'
                  }`}
                >
                  {bb}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-white/8 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onApply?.(v);
              onClose?.();
            }}
            className="min-h-12 rounded-xl bg-casino-green-bright px-8 text-sm font-bold text-felt"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
