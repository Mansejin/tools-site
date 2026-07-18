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
