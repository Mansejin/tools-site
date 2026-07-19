import type { MusicalNumber, TempoPoint } from '../types';

export function clampBpm(bpm: number): number {
  return Math.max(40, Math.min(240, bpm));
}

/** Effective BPM at a beat (stepped tempo map). */
export function bpmAtBeat(
  beat: number,
  tempoMap: TempoPoint[],
  defaultBpm: number,
): number {
  const sorted = [...tempoMap].sort((a, b) => a.beat - b.beat);
  let bpm = defaultBpm;
  for (const point of sorted) {
    if (point.beat <= beat + 1e-9) bpm = point.bpm;
    else break;
  }
  return bpm;
}

/**
 * Advance musical beat by wall-clock dt using piecewise-constant tempo.
 * Handles mid-segment BPM changes correctly.
 */
export function advanceBeatByMs(
  startBeat: number,
  dtMs: number,
  tempoMap: TempoPoint[],
  defaultBpm: number,
): number {
  if (dtMs <= 0) return startBeat;

  const sorted = [...tempoMap].sort((a, b) => a.beat - b.beat);
  let beat = startBeat;
  let remaining = dtMs;

  while (remaining > 1e-6) {
    const bpm = bpmAtBeat(beat, sorted, defaultBpm);
    const msPerBeat = 60_000 / bpm;

    const nextChange = sorted.find((p) => p.beat > beat + 1e-9);
    const beatsUntilChange = nextChange
      ? nextChange.beat - beat
      : Number.POSITIVE_INFINITY;
    const msUntilChange = beatsUntilChange * msPerBeat;

    if (remaining <= msUntilChange || !Number.isFinite(msUntilChange)) {
      beat += remaining / msPerBeat;
      remaining = 0;
    } else {
      beat = nextChange!.beat;
      remaining -= msUntilChange;
    }
  }

  return beat;
}

/** Wall-clock ms from beat 0 → target beat (piecewise tempo). */
export function msAtBeat(
  beat: number,
  tempoMap: TempoPoint[],
  defaultBpm: number,
): number {
  if (beat <= 0) return 0;
  const sorted = [...tempoMap].sort((a, b) => a.beat - b.beat);
  let t = 0;
  let cursor = 0;
  let bpm = defaultBpm;
  const points = sorted.filter((p) => p.beat > 0);

  for (const point of points) {
    if (point.beat >= beat) break;
    const span = point.beat - cursor;
    t += span * (60_000 / bpm);
    cursor = point.beat;
    bpm = point.bpm;
  }
  t += (beat - cursor) * (60_000 / bpm);
  return t;
}

/** Inverse: audio/timeline seconds → musical beat. */
export function beatAtMs(
  ms: number,
  tempoMap: TempoPoint[],
  defaultBpm: number,
): number {
  if (ms <= 0) return 0;
  return advanceBeatByMs(0, ms, tempoMap, defaultBpm);
}

export function numberAtBeat(
  beat: number,
  numbers: MusicalNumber[],
): MusicalNumber | undefined {
  const sorted = [...numbers].sort((a, b) => a.startBeat - b.startBeat);
  let current: MusicalNumber | undefined;
  for (const num of sorted) {
    if (num.startBeat <= beat + 1e-9) current = num;
    else break;
  }
  if (!current) return undefined;
  if (current.endBeat != null && beat > current.endBeat + 1e-9) return undefined;
  return current;
}

export function numberSpan(
  num: MusicalNumber,
  numbers: MusicalNumber[],
  fallbackEnd: number,
): { start: number; end: number } {
  const sorted = [...numbers].sort((a, b) => a.startBeat - b.startBeat);
  const idx = sorted.findIndex((n) => n.id === num.id);
  const start = num.startBeat;
  const next = idx >= 0 ? sorted[idx + 1] : undefined;
  const end =
    num.endBeat ??
    next?.startBeat ??
    fallbackEnd;
  return { start, end: Math.max(start, end) };
}

const NUMBER_COLORS = [
  'rgba(212, 162, 76, 0.14)',
  'rgba(111, 158, 122, 0.14)',
  'rgba(74, 111, 165, 0.16)',
  'rgba(180, 77, 106, 0.14)',
  'rgba(107, 78, 113, 0.16)',
];

export function numberColorAt(index: number): string {
  return NUMBER_COLORS[index % NUMBER_COLORS.length];
}
