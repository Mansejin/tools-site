import type { RepertoireLine, LineProgress } from '../types';
import { useProgressStore } from '../lib/progress';
import { formatMoveList } from '../lib/chessUtils';

type Props = {
  lines: RepertoireLine[];
  onPick: (line: RepertoireLine) => void;
  onBrowseCatalog: () => void;
  catalogCount: number;
};

export function LinePicker({ lines, onPick, onBrowseCatalog, catalogCount }: Props) {
  const get = useProgressStore((s) => s.get);
  const white = lines.filter((l) => l.side === 'white');
  const black = lines.filter((l) => l.side === 'black');

  return (
    <div className="animate-in space-y-8">
      <section className="space-y-3">
        <p className="text-[var(--muted)] text-sm max-w-xl">
          체닷 500→1000용으로 줄인 레퍼토리예요. 라인마다 드릴로 수를 맞추고, 이론이
          끝나면 약한 엔진과 이어서 두세요.
        </p>
        <button
          type="button"
          onClick={onBrowseCatalog}
          className="text-sm text-[var(--accent-soft)] hover:underline"
        >
          전체 오프닝 카탈로그 보기 ({catalogCount.toLocaleString()}개, Lichess CC0)
        </button>
      </section>

      <Group title="백으로 두기" lines={white} get={get} onPick={onPick} />
      <Group title="흑으로 두기" lines={black} get={get} onPick={onPick} />
    </div>
  );
}

function Group({
  title,
  lines,
  get,
  onPick,
}: {
  title: string;
  lines: RepertoireLine[];
  get: (id: string) => LineProgress;
  onPick: (line: RepertoireLine) => void;
}) {
  return (
    <section>
      <h2 className="text-lg mb-3 text-[var(--accent-soft)]">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {lines.map((line) => {
          const p = get(line.id);
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => onPick(line)}
              className="text-left rounded-2xl border border-[var(--line)] bg-[var(--bg2)]/80 p-4 hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="display text-xl">{line.titleKo}</div>
                  <div className="mono text-xs text-[var(--muted)] mt-0.5">
                    {line.eco} · {line.openingName}
                  </div>
                </div>
                <span className="mono text-[10px] px-2 py-1 rounded-full bg-[var(--panel)] text-[var(--muted)]">
                  {line.moves.length}수
                </span>
              </div>
              <p className="text-sm text-[var(--muted)] mt-2 leading-snug">{line.why}</p>
              <p className="mono text-[11px] text-[var(--muted)] mt-3 line-clamp-2 opacity-80">
                {formatMoveList(line.moves.slice(0, 8))}
              </p>
              {p.drills > 0 && (
                <p className="text-xs mt-3 text-[var(--good)]">
                  연습 {p.drills}회 · 완벽 {p.perfect} · 최고연속 {p.bestStreak}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
