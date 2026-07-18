import type { MusicalWork, SyncAnchor, TempoPoint } from '../types';
import { clampBpm, msAtBeat } from './tempoMap';

/** Ideal musical duration from beat A → B using the tempo map (not audio). */
export function idealMsBetween(
  fromBeat: number,
  toBeat: number,
  work: Pick<MusicalWork, 'tempoMap' | 'bpm'>,
): number {
  return (
    msAtBeat(toBeat, work.tempoMap ?? [], work.bpm) -
    msAtBeat(fromBeat, work.tempoMap ?? [], work.bpm)
  );
}

/**
 * Effective anchors: sync start (offset) + user anchors, sorted by beat.
 * Duplicate beats near the start are dropped in favor of the start point.
 */
export function effectiveAnchors(
  work: Pick<MusicalWork, 'audioOffsetMs' | 'syncStartBeat' | 'syncAnchors'>,
): SyncAnchor[] {
  const startBeat = work.syncStartBeat ?? 0;
  const offset = Math.max(0, work.audioOffsetMs ?? 0);
  const start: SyncAnchor = {
    id: '__sync_start',
    beat: startBeat,
    audioMs: offset,
    label: '시작(오프셋)',
  };
  const rest = (work.syncAnchors ?? []).filter(
    (a) => Math.abs(a.beat - startBeat) > 0.05,
  );
  return [start, ...rest].sort((a, b) => a.beat - b.beat || a.audioMs - b.audioMs);
}

function segmentRatio(
  a: SyncAnchor,
  b: SyncAnchor,
  work: Pick<MusicalWork, 'tempoMap' | 'bpm'>,
): number {
  const ideal = idealMsBetween(a.beat, b.beat, work);
  const actual = b.audioMs - a.audioMs;
  if (ideal <= 1e-6 || actual <= 0) {
    const db = b.beat - a.beat;
    if (db <= 1e-9) return 1;
    // Fall back to constant BPM implied by anchors
    return 1;
  }
  return actual / ideal;
}

/**
 * Map musical beat → absolute audio file milliseconds.
 * Uses tempo-map shape inside each anchor segment, scaled to fit real audio.
 */
export function audioMsAtBeat(
  beat: number,
  work: Pick<
    MusicalWork,
    'tempoMap' | 'bpm' | 'audioOffsetMs' | 'syncStartBeat' | 'syncAnchors'
  >,
): number {
  const anchors = effectiveAnchors(work);
  if (anchors.length === 1) {
    const a = anchors[0];
    return a.audioMs + idealMsBetween(a.beat, beat, work);
  }

  // Before first anchor
  if (beat <= anchors[0].beat) {
    const a = anchors[0];
    const b = anchors[1];
    const ratio = segmentRatio(a, b, work);
    return a.audioMs - idealMsBetween(beat, a.beat, work) * ratio;
  }

  // After last anchor
  const last = anchors[anchors.length - 1];
  if (beat >= last.beat) {
    const prev = anchors[anchors.length - 2];
    const ratio = segmentRatio(prev, last, work);
    return last.audioMs + idealMsBetween(last.beat, beat, work) * ratio;
  }

  // Between anchors
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (beat > b.beat + 1e-9) continue;
    const ideal = idealMsBetween(a.beat, b.beat, work);
    const actual = b.audioMs - a.audioMs;
    if (ideal <= 1e-6) {
      const t = (beat - a.beat) / Math.max(1e-9, b.beat - a.beat);
      return a.audioMs + t * actual;
    }
    const ratio = actual / ideal;
    return a.audioMs + idealMsBetween(a.beat, beat, work) * ratio;
  }

  return last.audioMs;
}

/**
 * Inverse: absolute audio file ms → musical beat.
 */
export function beatAtAudioMs(
  audioMs: number,
  work: Pick<
    MusicalWork,
    'tempoMap' | 'bpm' | 'audioOffsetMs' | 'syncStartBeat' | 'syncAnchors'
  >,
): number {
  const anchors = effectiveAnchors(work);

  const solveSegment = (a: SyncAnchor, b: SyncAnchor, ms: number): number => {
    const ideal = idealMsBetween(a.beat, b.beat, work);
    const actual = b.audioMs - a.audioMs;
    if (actual <= 1e-6) return a.beat;
    if (ideal <= 1e-6) {
      const t = (ms - a.audioMs) / actual;
      return a.beat + t * (b.beat - a.beat);
    }
    const ratio = actual / ideal;
    // Find beat where a.audioMs + ideal(a→beat)*ratio = ms
    const targetIdeal = (ms - a.audioMs) / ratio;
    // Binary search beat in [a.beat, b.beat]
    let lo = a.beat;
    let hi = b.beat;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const got = idealMsBetween(a.beat, mid, work);
      if (got < targetIdeal) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  if (anchors.length === 1) {
    const a = anchors[0];
    // Extrapolate with tempo map only
    const delta = audioMs - a.audioMs;
    if (delta <= 0) {
      // search backward
      let lo = Math.min(a.beat, a.beat - 64);
      let hi = a.beat;
      // expand lo until ideal covers delta
      while (idealMsBetween(lo, a.beat, work) < -delta && lo > -10000) lo -= 64;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        const got = idealMsBetween(mid, a.beat, work);
        if (got < -delta) hi = mid;
        else lo = mid;
      }
      return Math.max(0, (lo + hi) / 2);
    }
    // forward from a
    let lo = a.beat;
    let hi = a.beat + 64;
    while (idealMsBetween(a.beat, hi, work) < delta) hi += 64;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const got = idealMsBetween(a.beat, mid, work);
      if (got < delta) lo = mid;
      else hi = mid;
    }
    return Math.max(0, (lo + hi) / 2);
  }

  if (audioMs <= anchors[0].audioMs) {
    // before first — use first segment ratio
    const a = anchors[0];
    const b = anchors[1];
    const ratio = segmentRatio(a, b, work);
    const targetIdeal = (a.audioMs - audioMs) / Math.max(ratio, 1e-9);
    let lo = a.beat - 64;
    let hi = a.beat;
    while (idealMsBetween(lo, a.beat, work) < targetIdeal && lo > -10000) lo -= 64;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const got = idealMsBetween(mid, a.beat, work);
      if (got < targetIdeal) hi = mid;
      else lo = mid;
    }
    return Math.max(0, (lo + hi) / 2);
  }

  const last = anchors[anchors.length - 1];
  if (audioMs >= last.audioMs) {
    const prev = anchors[anchors.length - 2];
    const ratio = segmentRatio(prev, last, work);
    const targetIdeal = (audioMs - last.audioMs) / Math.max(ratio, 1e-9);
    let lo = last.beat;
    let hi = last.beat + 64;
    while (idealMsBetween(last.beat, hi, work) < targetIdeal) hi += 64;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const got = idealMsBetween(last.beat, mid, work);
      if (got < targetIdeal) lo = mid;
      else hi = mid;
    }
    return Math.max(0, (lo + hi) / 2);
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (audioMs > b.audioMs + 1e-6) continue;
    return solveSegment(a, b, audioMs);
  }

  return Math.max(0, last.beat);
}

/** BPM implied by two anchors. */
export function bpmBetweenAnchors(a: SyncAnchor, b: SyncAnchor): number | null {
  const db = b.beat - a.beat;
  const dt = b.audioMs - a.audioMs;
  if (db <= 1e-6 || dt <= 1e-6) return null;
  return clampBpm((db * 60_000) / dt);
}

/**
 * Build tempo-map points from consecutive effective anchors.
 * Keeps labels; replaces BPM at each segment start.
 */
export function tempoMapFromAnchors(
  work: Pick<
    MusicalWork,
    'tempoMap' | 'bpm' | 'audioOffsetMs' | 'syncStartBeat' | 'syncAnchors'
  >,
): TempoPoint[] {
  const anchors = effectiveAnchors(work);
  if (anchors.length < 2) {
    return work.tempoMap?.length
      ? work.tempoMap
      : [{ id: '__t0', beat: work.syncStartBeat ?? 0, bpm: work.bpm, label: '기본' }];
  }

  const points: TempoPoint[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const bpm = bpmBetweenAnchors(a, b);
    if (bpm == null) continue;
    points.push({
      id: `anchor-tempo-${i}-${a.beat}`,
      beat: a.beat,
      bpm,
      label: a.label || `앵커 BPM ${bpm}`,
    });
  }
  // Ensure a point at absolute 0 if sync starts later
  if (points.length && points[0].beat > 0) {
    points.unshift({
      id: 'anchor-tempo-pre',
      beat: 0,
      bpm: points[0].bpm,
      label: '인트로',
    });
  }
  return points.sort((a, b) => a.beat - b.beat);
}

export function formatAudioMs(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}:${rem.toFixed(2).padStart(5, '0')}`;
}
