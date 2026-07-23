type Props = {
  result: 'win' | 'lose' | 'draw';
  reason: string;
  onRematch: () => void;
  onHome: () => void;
};

export function GameOverOverlay({ result, reason, onRematch, onHome }: Props) {
  const title =
    result === 'win' ? '승리!' : result === 'lose' ? '패배' : '무승부';
  const accent =
    result === 'win' ? '#81b64c' : result === 'lose' ? '#e26a5c' : '#c4a35a';

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-[4px]"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="animate-in w-[min(88%,320px)] rounded-2xl px-6 py-7 text-center shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #312e2b 0%, #262421 100%)',
          border: `2px solid ${accent}`,
        }}
      >
        <p
          className="display text-4xl mb-1"
          style={{ color: accent, letterSpacing: '-0.03em' }}
        >
          {title}
        </p>
        <p className="text-sm text-[#cfc9c2] mb-5">{reason}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onRematch}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-[#1a1510]"
            style={{ background: accent }}
          >
            다시 두기
          </button>
          <button
            type="button"
            onClick={onHome}
            className="w-full rounded-xl py-2.5 text-sm border border-[#4a4540] text-[#cfc9c2]"
          >
            목록으로
          </button>
        </div>
      </div>
    </div>
  );
}
