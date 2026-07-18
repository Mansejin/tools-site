import type { Keyframe, Position } from '../types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPos(a: Position, b: Position, t: number): Position {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** Interpolate all role positions at a given beat. */
export function positionsAtBeat(
  keyframes: Keyframe[],
  beat: number,
  roleIds: string[],
): Record<string, Position> {
  const sorted = [...keyframes].sort((a, b) => a.beat - b.beat);
  const result: Record<string, Position> = {};

  for (const roleId of roleIds) {
    const withRole = sorted.filter((kf) => kf.positions[roleId]);
    if (withRole.length === 0) {
      result[roleId] = { x: 0.5, y: 0.7 };
      continue;
    }

    if (beat <= withRole[0].beat) {
      result[roleId] = { ...withRole[0].positions[roleId] };
      continue;
    }

    const last = withRole[withRole.length - 1];
    if (beat >= last.beat) {
      result[roleId] = { ...last.positions[roleId] };
      continue;
    }

    let prev = withRole[0];
    let next = withRole[1];
    for (let i = 0; i < withRole.length - 1; i++) {
      if (beat >= withRole[i].beat && beat <= withRole[i + 1].beat) {
        prev = withRole[i];
        next = withRole[i + 1];
        break;
      }
    }

    const span = next.beat - prev.beat || 1;
    const t = (beat - prev.beat) / span;
    result[roleId] = lerpPos(prev.positions[roleId], next.positions[roleId], t);
  }

  return result;
}

export function nearestKeyframe(
  keyframes: Keyframe[],
  beat: number,
  tolerance = 0.25,
): Keyframe | undefined {
  let best: Keyframe | undefined;
  let bestDist = Infinity;
  for (const kf of keyframes) {
    const d = Math.abs(kf.beat - beat);
    if (d < bestDist && d <= tolerance) {
      best = kf;
      bestDist = d;
    }
  }
  return best;
}

export function formatBeat(beat: number, beatsPerBar: number): string {
  const bar = Math.floor(beat / beatsPerBar) + 1;
  const beatInBar = (beat % beatsPerBar) + 1;
  const frac = beat % 1;
  if (frac < 0.01) return `${bar}.${Math.round(beatInBar)}`;
  return `${bar}.${(beatInBar).toFixed(2)}`;
}

/** Sorted unique keyframe beats. */
export function keyframeBeats(keyframes: Keyframe[]): number[] {
  return [...new Set(keyframes.map((k) => k.beat))].sort((a, b) => a - b);
}

/** Previous / next keyframe beat relative to playhead. */
export function neighborKeyframeBeat(
  keyframes: Keyframe[],
  beat: number,
  dir: -1 | 1,
): number | null {
  const beats = keyframeBeats(keyframes);
  if (beats.length === 0) return null;
  if (dir < 0) {
    for (let i = beats.length - 1; i >= 0; i--) {
      if (beats[i] < beat - 1e-6) return beats[i];
    }
    return null;
  }
  for (const b of beats) {
    if (b > beat + 1e-6) return b;
  }
  return null;
}

/** Path points for one role across all keyframes that include them. */
export function rolePathPoints(
  keyframes: Keyframe[],
  roleId: string,
): { beat: number; pos: Position }[] {
  return [...keyframes]
    .filter((kf) => kf.positions[roleId])
    .sort((a, b) => a.beat - b.beat)
    .map((kf) => ({ beat: kf.beat, pos: { ...kf.positions[roleId] } }));
}

/** Last keyframe strictly before beat that has any positions (or a role). */
export function previousKeyframe(
  keyframes: Keyframe[],
  beat: number,
  roleId?: string | null,
): Keyframe | undefined {
  const sorted = [...keyframes].sort((a, b) => a.beat - b.beat);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const kf = sorted[i];
    if (kf.beat >= beat - 1e-6) continue;
    if (roleId && !kf.positions[roleId]) continue;
    return kf;
  }
  return undefined;
}
