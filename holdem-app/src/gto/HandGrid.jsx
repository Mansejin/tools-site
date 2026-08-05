import { useState } from 'react';
import { GRID_RANKS, handFromGrid } from './pushfoldNash.js';

const ACTION_STYLE = {
  raise: 'bg-casino-green/80 text-white',
  allin: 'bg-deep-red/80 text-white',
  call: 'bg-sky-700/80 text-white',
  mixed: 'bg-gold/70 text-felt',
  fold: 'bg-felt-4/80 text-muted/50',
  shove: 'bg-casino-green/80 text-white',
};

export default function HandGrid({ getAction, title }) {
  const [picked, setPicked] = useState(null);

  return (
    <div>
      {title && <p className="mb-2 text-xs font-medium tracking-wide text-gold">{title}</p>}
      <div
        className="grid gap-px rounded-lg border border-white/10 bg-black/40 p-0.5 sm:p-1"
        style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
      >
        {GRID_RANKS.map((_, row) =>
          GRID_RANKS.map((__, col) => {
            const hand = handFromGrid(row, col);
            const action = getAction(hand);
            const sel = picked === hand;
            return (
              <button
                key={hand}
                type="button"
                title={`${hand} · ${action}`}
                onClick={() => setPicked(hand)}
                className={`hand-grid-cell flex aspect-square items-center justify-center rounded-[2px] font-semibold leading-none ${ACTION_STYLE[action] || ACTION_STYLE.fold} ${
                  sel ? 'ring-2 ring-gold ring-offset-1 ring-offset-felt' : ''
                }`}
              >
                {hand}
              </button>
            );
          }),
        )}
      </div>
      {picked && (
        <p className="mt-2 rounded-lg bg-felt px-3 py-2 text-center text-sm">
          <span className="font-semibold text-ink">{picked}</span>
          <span className="mx-2 text-muted">·</span>
          <span className="text-gold uppercase">{getAction(picked)}</span>
        </p>
      )}
    </div>
  );
}

export { ACTION_STYLE };
