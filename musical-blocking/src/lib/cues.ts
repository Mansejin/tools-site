import type { Keyframe, ScriptLine } from '../types';

export interface TimingOptions {
  /** Multiplier applied to per-line beat spans (default 1). */
  spacing?: number;
  startBeat?: number;
}

/** Base beat span per line type before spacing multiplier. */
export function beatSpanForLine(line: ScriptLine): number {
  switch (line.type) {
    case 'blank':
      return 0;
    case 'cue':
      return 2;
    case 'direction':
      return 4;
    case 'lyric':
      return 8;
    case 'dialogue':
    default: {
      const len = line.text.length;
      // Roughly ~1 beat per 3–4 Hangul chars, with a usable minimum
      if (len > 60) return 16;
      if (len > 40) return 12;
      if (len > 24) return 10;
      if (len > 12) return 8;
      return 6;
    }
  }
}

export function isTimedLine(line: ScriptLine): boolean {
  return line.type !== 'blank';
}

/** Assign sequential beats to script lines (idempotent overwrite). */
export function assignBeatsToScript(
  lines: ScriptLine[],
  startBeatOrOpts: number | TimingOptions = 0,
): ScriptLine[] {
  const opts: TimingOptions =
    typeof startBeatOrOpts === 'number'
      ? { startBeat: startBeatOrOpts, spacing: 1 }
      : startBeatOrOpts;
  const spacing = Math.max(0.25, opts.spacing ?? 1);
  let beat = opts.startBeat ?? 0;

  return lines.map((line) => {
    if (!isTimedLine(line)) return { ...line, beat: undefined };
    const next = { ...line, beat: Math.round(beat * 100) / 100 };
    const span = Math.max(1, Math.round(beatSpanForLine(line) * spacing));
    beat += span;
    return next;
  });
}

/**
 * Scale all timed line beats (and keep relative gaps).
 * factor=2 doubles every cue time → playback feels twice as long.
 */
export function scaleScriptBeats(
  lines: ScriptLine[],
  factor: number,
): ScriptLine[] {
  const f = Math.max(0.1, factor);
  return lines.map((line) =>
    line.beat == null ? line : { ...line, beat: Math.round(line.beat * f * 100) / 100 },
  );
}

/** Set how many beats this line occupies until the next timed line; shift the rest. */
export function setLineDuration(
  lines: ScriptLine[],
  lineId: string,
  durationBeats: number,
): ScriptLine[] {
  const timed = timedScriptLines(lines)
    .filter((l) => l.beat != null)
    .sort((a, b) => (a.beat ?? 0) - (b.beat ?? 0));
  const idx = timed.findIndex((l) => l.id === lineId);
  if (idx < 0) return lines;

  const current = timed[idx];
  const next = timed[idx + 1];
  const start = current.beat ?? 0;
  const oldEnd = next?.beat ?? start + 1;
  const oldDur = Math.max(0.25, oldEnd - start);
  const newDur = Math.max(1, durationBeats);
  const delta = newDur - oldDur;

  if (Math.abs(delta) < 0.001) return lines;

  const shiftIds = new Set(timed.slice(idx + 1).map((l) => l.id));
  return lines.map((line) => {
    if (!shiftIds.has(line.id) || line.beat == null) return line;
    return { ...line, beat: Math.max(0, Math.round((line.beat + delta) * 100) / 100) };
  });
}

export function timedScriptLines(script: ScriptLine[]): ScriptLine[] {
  return script.filter(isTimedLine);
}

export function keyframeForLine(
  keyframes: Keyframe[],
  lineId: string,
): Keyframe | undefined {
  return keyframes.find((kf) => kf.cueLineId === lineId);
}

/** Nearest timed script line at or before `beat`. */
export function lineAtBeat(
  script: ScriptLine[],
  beat: number,
): ScriptLine | undefined {
  const timed = timedScriptLines(script)
    .filter((l) => l.beat != null)
    .sort((a, b) => (a.beat ?? 0) - (b.beat ?? 0));
  if (timed.length === 0) return undefined;

  let best = timed[0];
  for (const line of timed) {
    if ((line.beat ?? 0) <= beat + 0.001) best = line;
    else break;
  }
  return best;
}

export function maxScriptBeat(script: ScriptLine[], beatsPerBar: number): number {
  const beats = timedScriptLines(script).map((l) => l.beat ?? 0);
  const max = beats.length ? Math.max(...beats) : 0;
  return Math.max(beatsPerBar * 8, max + beatsPerBar);
}

export function ensureScriptBeats(
  script: ScriptLine[],
  spacing = 1,
): ScriptLine[] {
  const timed = timedScriptLines(script);
  if (timed.length === 0) return script;
  const missing = timed.some((l) => l.beat == null);
  if (!missing) return script;
  return assignBeatsToScript(script, { spacing });
}

export function lineDurationBeats(
  script: ScriptLine[],
  lineId: string,
): number | undefined {
  const timed = timedScriptLines(script)
    .filter((l) => l.beat != null)
    .sort((a, b) => (a.beat ?? 0) - (b.beat ?? 0));
  const idx = timed.findIndex((l) => l.id === lineId);
  if (idx < 0) return undefined;
  const start = timed[idx].beat ?? 0;
  const next = timed[idx + 1];
  if (!next || next.beat == null) return 8;
  return Math.max(1, Math.round((next.beat - start) * 100) / 100);
}
