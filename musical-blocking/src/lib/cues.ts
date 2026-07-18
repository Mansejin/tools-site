import type { Keyframe, ScriptLine } from '../types';

/** Beat span suggested per line type when auto-timing a script. */
export function beatSpanForLine(line: ScriptLine): number {
  switch (line.type) {
    case 'blank':
      return 0;
    case 'cue':
      return 1;
    case 'direction':
      return 2;
    case 'lyric':
      return 4;
    case 'dialogue':
    default: {
      const len = line.text.length;
      if (len > 40) return 4;
      if (len > 18) return 3;
      return 2;
    }
  }
}

export function isTimedLine(line: ScriptLine): boolean {
  return line.type !== 'blank';
}

/** Assign sequential beats to script lines (idempotent overwrite). */
export function assignBeatsToScript(
  lines: ScriptLine[],
  startBeat = 0,
): ScriptLine[] {
  let beat = startBeat;
  return lines.map((line) => {
    if (!isTimedLine(line)) return { ...line, beat: undefined };
    const next = { ...line, beat };
    beat += beatSpanForLine(line);
    return next;
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

export function ensureScriptBeats(script: ScriptLine[]): ScriptLine[] {
  const timed = timedScriptLines(script);
  if (timed.length === 0) return script;
  const missing = timed.some((l) => l.beat == null);
  if (!missing) return script;
  return assignBeatsToScript(script);
}
