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

const FREQ_COLOR = {
  fold: 'bg-[#3D7CB8]',
  call: 'bg-[#5ab966]',
  raise: 'bg-[#f03c3c]',
  shove: 'bg-[#7d1f1f]',
};

export default function HandGrid({ getAction, getFreqs, title }) {
  const [picked, setPicked] = useState(null);
  const freqs = picked && getFreqs ? getFreqs(picked) : null;

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
        <div className="mt-2 rounded-lg bg-felt px-3 py-2 text-sm">
          <p className="text-center">
            <span className="font-semibold text-ink">{picked}</span>
            <span className="mx-2 text-muted">·</span>
            <span className="text-gold uppercase">{getAction(picked)}</span>
          </p>
          {freqs && (
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-black/40">
              {['raise', 'shove', 'call', 'fold'].map((k) =>
                freqs[k] > 0 ? (
                  <div
                    key={k}
                    className={`${FREQ_COLOR[k]} h-full`}
                    style={{ width: `${freqs[k]}%` }}
                    title={`${k} ${freqs[k]}%`}
                  />
                ) : null,
              )}
            </div>
          )}
          {freqs && (
            <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
              {['raise', 'shove', 'call', 'fold']
                .filter((k) => freqs[k] > 0)
                .map((k) => (
                  <span key={k}>
                    <span className="uppercase text-ink/80">{k}</span> {freqs[k]}%
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { ACTION_STYLE };
