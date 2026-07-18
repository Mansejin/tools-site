import { v4 as uuid } from 'uuid';
import type { Keyframe, MusicalWork, Position, ScriptLine } from '../types';

const SNAPSHOT_KEY = 'stagecue-snapshots-v1';
const PERSIST_KEYS = [
  'musical-blocking-v3',
  'musical-blocking-v2',
  'musical-blocking-v1',
];

export interface SnapshotEntry {
  id: string;
  savedAt: string;
  reason: string;
  keyframeCount: number;
  works: MusicalWork[];
  activeWorkId?: string;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normText(s: string): string {
  return s.replace(/\s+/g, '').replace(/[ー\-–—…·.,!?~]/g, '');
}

function lineKey(line: Pick<ScriptLine, 'speaker' | 'text'>): string {
  return normText(`${line.speaker ?? ''}:${line.text}`);
}

/** Read works arrays from known zustand persist keys. */
export function collectWorksFromStorage(): MusicalWork[] {
  const found: MusicalWork[] = [];
  for (const key of PERSIST_KEYS) {
    const raw = safeParse<{ state?: { works?: MusicalWork[] } }>(
      localStorage.getItem(key),
    );
    const works = raw?.state?.works;
    if (Array.isArray(works)) found.push(...works);
  }

  const snaps = safeParse<SnapshotEntry[]>(localStorage.getItem(SNAPSHOT_KEY)) ?? [];
  for (const snap of snaps) {
    if (Array.isArray(snap.works)) found.push(...snap.works);
  }
  return found;
}

export function listSnapshots(): SnapshotEntry[] {
  return safeParse<SnapshotEntry[]>(localStorage.getItem(SNAPSHOT_KEY)) ?? [];
}

/** Keep a recoverable copy before destructive ops. */
export function snapshotCurrentState(reason: string): SnapshotEntry | null {
  const raw = safeParse<{ state?: { works?: MusicalWork[]; activeWorkId?: string } }>(
    localStorage.getItem('musical-blocking-v3'),
  );
  const works = raw?.state?.works;
  if (!works?.length) return null;

  const keyframeCount = works.reduce((n, w) => n + (w.keyframes?.length ?? 0), 0);
  if (keyframeCount === 0 && reason.startsWith('auto')) return null;

  const entry: SnapshotEntry = {
    id: uuid(),
    savedAt: new Date().toISOString(),
    reason,
    keyframeCount,
    works: structuredClone(works),
    activeWorkId: raw?.state?.activeWorkId,
  };

  const prev = listSnapshots();
  const next = [entry, ...prev].slice(0, 12);
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
  return entry;
}

export function bestRecoverableWork(works: MusicalWork[]): MusicalWork | undefined {
  return [...works]
    .filter((w) => (w.keyframes?.length ?? 0) > 0)
    .sort((a, b) => {
      const kf = (b.keyframes?.length ?? 0) - (a.keyframes?.length ?? 0);
      if (kf !== 0) return kf;
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    })[0];
}

/** Remap old keyframes onto a new work (roles by name, cues by dialogue text). */
export function mergeKeyframesOntoWork(
  target: MusicalWork,
  source: MusicalWork,
): { work: MusicalWork; restored: number; unmatched: number } {
  if (!source.keyframes?.length) {
    return { work: target, restored: 0, unmatched: 0 };
  }

  const roleMap = new Map<string, string>();
  for (const oldRole of source.roles ?? []) {
    const next = target.roles.find((r) => r.name === oldRole.name);
    if (next) roleMap.set(oldRole.id, next.id);
  }

  const bySpeakerText = new Map<string, ScriptLine>();
  const byText = new Map<string, ScriptLine>();
  for (const line of target.script) {
    if (line.type === 'blank' || !line.text?.trim()) continue;
    const full = lineKey(line);
    if (!bySpeakerText.has(full)) bySpeakerText.set(full, line);
    const t = normText(line.text);
    if (t && !byText.has(t)) byText.set(t, line);
  }

  let restored = 0;
  let unmatched = 0;
  const merged: Keyframe[] = [];

  for (const kf of source.keyframes) {
    const positions: Record<string, Position> = {};
    for (const [oldId, pos] of Object.entries(kf.positions ?? {})) {
      const newId = roleMap.get(oldId);
      if (newId) positions[newId] = { ...pos };
    }
    if (Object.keys(positions).length === 0) {
      unmatched += 1;
      continue;
    }

    let cueLineId = kf.cueLineId;
    let beat = kf.beat;
    let cueLabel = kf.cueLabel;

    const oldLine = cueLineId
      ? source.script.find((l) => l.id === cueLineId)
      : undefined;

    let matched: ScriptLine | undefined;
    if (oldLine) {
      matched =
        bySpeakerText.get(lineKey(oldLine)) ||
        byText.get(normText(oldLine.text));
    }
    if (!matched && kf.cueLabel) {
      const labelBody = normText(kf.cueLabel.replace(/^[^:]*:/, ''));
      matched = byText.get(labelBody);
    }

    if (matched) {
      cueLineId = matched.id;
      if (matched.beat != null) beat = matched.beat;
      cueLabel =
        cueLabel ||
        `${matched.speaker ? `${matched.speaker}: ` : ''}${matched.text}`;
    }

    merged.push({
      ...kf,
      id: uuid(),
      beat,
      cueLineId,
      cueLabel,
      positions,
    });
    restored += 1;
  }

  // Prefer restored keyframes; keep any already on target that don't collide by beat+roles
  const existingBeats = new Set(merged.map((k) => k.beat.toFixed(3)));
  const kept = (target.keyframes ?? []).filter(
    (k) => !existingBeats.has(k.beat.toFixed(3)),
  );

  return {
    work: {
      ...target,
      keyframes: [...merged, ...kept].sort((a, b) => a.beat - b.beat),
      updatedAt: Date.now(),
    },
    restored,
    unmatched,
  };
}

export function recoverKeyframesInto(
  target: MusicalWork,
): { work: MusicalWork; restored: number; sourceTitle?: string } {
  snapshotCurrentState('pre-recover');
  const pool = collectWorksFromStorage();
  const source = bestRecoverableWork(pool);
  if (!source) return { work: target, restored: 0 };
  const { work, restored } = mergeKeyframesOntoWork(target, source);
  return { work, restored, sourceTitle: source.title };
}
