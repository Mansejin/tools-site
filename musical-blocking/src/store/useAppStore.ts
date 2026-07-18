import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  AppTab,
  CharSelection,
  Keyframe,
  MusicalNumber,
  MusicalWork,
  Position,
  Role,
  SettingsSection,
  StageConfig,
  TempoPoint,
} from '../types';
import { roleColorAt, shortNameFrom } from '../lib/colors';
import {
  extractTimingFromScript,
  formatCueLabel,
  parseScriptBundle,
  SAMPLE_SCRIPT,
} from '../lib/scriptParser';
import {
  assignBeatsToScript,
  ensureScriptBeats,
  keyframeForLine,
  lineAtBeat,
} from '../lib/cues';
import { clampBpm, numberColorAt } from '../lib/tempoMap';

function defaultStage(): StageConfig {
  return { widthM: 12, depthM: 8, showGrid: true, gridDivisions: 8 };
}

/** Real cast only. 배무룡=월직 빙의, 화음=기존 배역이 담당. */
const DEFAULT_ROLE_NAMES = [
  '홍련',
  '바리',
  '강림',
  '월직',
  '일직',
] as const;

function defaultRoles(): Role[] {
  return DEFAULT_ROLE_NAMES.map((name, i) => ({
    id: uuid(),
    name,
    shortName: shortNameFrom(name),
    color: roleColorAt(i),
    visible: true,
  }));
}

function normalizeWork(raw: MusicalWork): MusicalWork {
  const bpm = clampBpm(raw.bpm || 120);
  let script = ensureScriptBeats(raw.script ?? []);
  let numbers = raw.numbers ?? [];
  let tempoMap = raw.tempoMap ?? [];

  if (!raw.tempoMap || !raw.numbers) {
    const extracted = extractTimingFromScript(script, bpm);
    script = extracted.script;
    if (!raw.numbers?.length) numbers = extracted.numbers;
    if (!raw.tempoMap?.length) tempoMap = extracted.tempoMap;
  }

  if (tempoMap.length === 0) {
    tempoMap = [{ id: uuid(), beat: 0, bpm, label: '기본' }];
  }

  return {
    ...raw,
    bpm,
    beatsPerBar: raw.beatsPerBar || 4,
    script,
    numbers,
    tempoMap: [...tempoMap].sort((a, b) => a.beat - b.beat),
    keyframes: raw.keyframes ?? [],
  };
}

function createWork(title = '새 작품'): MusicalWork {
  const now = Date.now();
  const defaultBpm = 120;
  const bundle = parseScriptBundle(SAMPLE_SCRIPT, defaultBpm);
  return normalizeWork({
    id: uuid(),
    title,
    bpm: defaultBpm,
    beatsPerBar: 4,
    tempoMap: bundle.tempoMap,
    numbers: bundle.numbers,
    stage: defaultStage(),
    roles: defaultRoles(),
    script: bundle.script,
    keyframes: [],
    createdAt: now,
    updatedAt: now,
  });
}

function seedPositions(work: MusicalWork, beat: number): Record<string, Position> {
  const seed: Record<string, Position> = {};
  work.roles.forEach((role, i) => {
    const near = [...work.keyframes]
      .sort((a, b) => Math.abs(a.beat - beat) - Math.abs(b.beat - beat))
      .find((kf) => kf.positions[role.id]);
    seed[role.id] = near
      ? { ...near.positions[role.id] }
      : {
          x: 0.2 + (i % 5) * 0.15,
          y: 0.55 + Math.floor(i / 5) * 0.15,
        };
  });
  return seed;
}

interface AppState {
  works: MusicalWork[];
  activeWorkId: string;
  activeTab: AppTab;
  settingsSection: SettingsSection;
  selectedLineIds: string[];
  charSelection: CharSelection | null;
  currentBeat: number;
  isPlaying: boolean;
  snapToBeat: boolean;
  selectedRoleId: string | null;

  activeWork: () => MusicalWork;
  setTab: (tab: AppTab) => void;
  setSettingsSection: (s: SettingsSection) => void;
  setActiveWork: (id: string) => void;
  addWork: (title?: string) => void;
  renameWork: (id: string, title: string) => void;
  deleteWork: (id: string) => void;
  duplicateWork: (id: string) => void;
  updateWork: (patch: Partial<MusicalWork>) => void;

  addRole: (name: string) => void;
  updateRole: (id: string, patch: Partial<Role>) => void;
  removeRole: (id: string) => void;
  toggleRoleVisible: (id: string) => void;
  setAllRolesVisible: (visible: boolean) => void;
  setSelectedRole: (id: string | null) => void;

  setStage: (patch: Partial<StageConfig>) => void;
  setTempo: (bpm: number, beatsPerBar?: number) => void;
  addTempoPoint: (beat: number, bpm: number, label?: string) => void;
  updateTempoPoint: (id: string, patch: Partial<TempoPoint>) => void;
  removeTempoPoint: (id: string) => void;
  addNumber: (title: string, startBeat: number, bpm?: number) => void;
  updateNumber: (
    id: string,
    patch: Partial<Omit<MusicalNumber, 'bpm'>> & { bpm?: number | null },
  ) => void;
  removeNumber: (id: string) => void;

  importScript: (raw: string) => void;
  clearScript: () => void;
  retimeScript: () => void;
  selectLine: (lineId: string, multi?: boolean) => void;
  clearSelection: () => void;
  setCharSelection: (sel: CharSelection | null) => void;
  setLineBeat: (lineId: string, beat: number) => void;
  nudgeSelectedCue: (delta: number) => void;

  setCurrentBeat: (beat: number, opts?: { syncSelection?: boolean }) => void;
  setPlaying: (playing: boolean) => void;
  setSnapToBeat: (snap: boolean) => void;

  moveRoleAtCurrentCue: (roleId: string, pos: Position) => void;
  updateKeyframe: (id: string, patch: Partial<Keyframe>) => void;
  deleteKeyframe: (id: string) => void;
  deleteBlockingForLine: (lineId: string) => void;
}

function touch(work: MusicalWork): MusicalWork {
  return { ...work, updatedAt: Date.now() };
}

function mapActive(
  works: MusicalWork[],
  activeWorkId: string,
  fn: (w: MusicalWork) => MusicalWork,
): MusicalWork[] {
  return works.map((w) => (w.id === activeWorkId ? touch(fn(w)) : w));
}

const initial = createWork('샘플 뮤지컬');

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      works: [initial],
      activeWorkId: initial.id,
      activeTab: 'stage',
      settingsSection: 'works',
      selectedLineIds: [],
      charSelection: null,
      currentBeat: 0,
      isPlaying: false,
      snapToBeat: true,
      selectedRoleId: null,

      activeWork: () => {
        const { works, activeWorkId } = get();
        return works.find((w) => w.id === activeWorkId) ?? works[0];
      },

      setTab: (tab) => set({ activeTab: tab }),
      setSettingsSection: (s) => set({ settingsSection: s }),

      setActiveWork: (id) =>
        set({
          activeWorkId: id,
          selectedLineIds: [],
          charSelection: null,
          currentBeat: 0,
          isPlaying: false,
          selectedRoleId: null,
        }),

      addWork: (title) => {
        const work = createWork(title);
        set((s) => ({
          works: [...s.works, work],
          activeWorkId: work.id,
          selectedLineIds: [],
          charSelection: null,
          currentBeat: 0,
        }));
      },

      renameWork: (id, title) =>
        set((s) => ({
          works: s.works.map((w) =>
            w.id === id ? touch({ ...w, title: title.trim() || w.title }) : w,
          ),
        })),

      deleteWork: (id) =>
        set((s) => {
          if (s.works.length <= 1) return s;
          const works = s.works.filter((w) => w.id !== id);
          const activeWorkId =
            s.activeWorkId === id ? works[0].id : s.activeWorkId;
          return { works, activeWorkId };
        }),

      duplicateWork: (id) => {
        const src = get().works.find((w) => w.id === id);
        if (!src) return;
        const copy: MusicalWork = {
          ...structuredClone(normalizeWork(src)),
          id: uuid(),
          title: `${src.title} (복사)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          roles: src.roles.map((r) => ({ ...r, id: uuid() })),
          script: src.script.map((l) => ({ ...l, id: uuid() })),
          keyframes: src.keyframes.map((k) => ({ ...k, id: uuid() })),
          tempoMap: (src.tempoMap ?? []).map((t) => ({ ...t, id: uuid() })),
          numbers: (src.numbers ?? []).map((n) => ({ ...n, id: uuid() })),
        };
        const roleMap = new Map(src.roles.map((r, i) => [r.id, copy.roles[i].id]));
        const lineMap = new Map(src.script.map((l, i) => [l.id, copy.script[i].id]));
        const numberMap = new Map(
          (src.numbers ?? []).map((n, i) => [n.id, copy.numbers[i].id]),
        );
        copy.script = copy.script.map((l, i) => ({
          ...l,
          numberId: src.script[i]?.numberId
            ? numberMap.get(src.script[i].numberId!)
            : l.numberId,
        }));
        copy.keyframes = copy.keyframes.map((kf) => {
          const positions: Record<string, Position> = {};
          for (const [oldId, pos] of Object.entries(kf.positions)) {
            const newId = roleMap.get(oldId);
            if (newId) positions[newId] = pos;
          }
          return {
            ...kf,
            positions,
            cueLineId: kf.cueLineId ? lineMap.get(kf.cueLineId) : kf.cueLineId,
          };
        });
        set((s) => ({
          works: [...s.works, copy],
          activeWorkId: copy.id,
        }));
      },

      updateWork: (patch) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({ ...w, ...patch })),
        })),

      addRole: (name) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            const role: Role = {
              id: uuid(),
              name: name.trim() || `배역 ${w.roles.length + 1}`,
              shortName: shortNameFrom(name.trim() || `배${w.roles.length + 1}`),
              color: roleColorAt(w.roles.length),
              visible: true,
            };
            return { ...w, roles: [...w.roles, role] };
          }),
        })),

      updateRole: (id, patch) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            roles: w.roles.map((r) => {
              if (r.id !== id) return r;
              const next = { ...r, ...patch };
              if (patch.name && !patch.shortName) {
                next.shortName = shortNameFrom(patch.name);
              }
              return next;
            }),
          })),
        })),

      removeRole: (id) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            roles: w.roles.filter((r) => r.id !== id),
            keyframes: w.keyframes.map((kf) => {
              const { [id]: _, ...positions } = kf.positions;
              return { ...kf, positions };
            }),
          })),
          selectedRoleId: s.selectedRoleId === id ? null : s.selectedRoleId,
        })),

      toggleRoleVisible: (id) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            roles: w.roles.map((r) =>
              r.id === id ? { ...r, visible: !r.visible } : r,
            ),
          })),
        })),

      setAllRolesVisible: (visible) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            roles: w.roles.map((r) => ({ ...r, visible })),
          })),
        })),

      setSelectedRole: (id) => set({ selectedRoleId: id }),

      setStage: (patch) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            stage: { ...w.stage, ...patch },
          })),
        })),

      setTempo: (bpm, beatsPerBar) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            const nextBpm = clampBpm(bpm);
            let tempoMap = [...(w.tempoMap ?? [])].sort((a, b) => a.beat - b.beat);
            if (tempoMap.length === 0 || tempoMap[0].beat > 0) {
              tempoMap = [
                { id: uuid(), beat: 0, bpm: nextBpm, label: '기본' },
                ...tempoMap,
              ];
            } else {
              tempoMap[0] = { ...tempoMap[0], bpm: nextBpm };
            }
            return {
              ...w,
              bpm: nextBpm,
              beatsPerBar: beatsPerBar ?? w.beatsPerBar,
              tempoMap,
            };
          }),
        })),

      addTempoPoint: (beat, bpm, label) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            let b = Math.max(0, beat);
            if (s.snapToBeat) b = Math.round(b);
            const point: TempoPoint = {
              id: uuid(),
              beat: b,
              bpm: clampBpm(bpm),
              label: label || `BPM ${clampBpm(bpm)}`,
            };
            const tempoMap = [...w.tempoMap.filter((p) => Math.abs(p.beat - b) > 0.01), point].sort(
              (a, c) => a.beat - c.beat,
            );
            return { ...w, tempoMap };
          }),
        })),

      updateTempoPoint: (id, patch) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            tempoMap: w.tempoMap
              .map((p) =>
                p.id === id
                  ? {
                      ...p,
                      ...patch,
                      bpm: patch.bpm != null ? clampBpm(patch.bpm) : p.bpm,
                      beat:
                        patch.beat != null
                          ? Math.max(0, s.snapToBeat ? Math.round(patch.beat) : patch.beat)
                          : p.beat,
                    }
                  : p,
              )
              .sort((a, b) => a.beat - b.beat),
            bpm:
              w.tempoMap[0]?.id === id && patch.bpm != null
                ? clampBpm(patch.bpm)
                : w.bpm,
          })),
        })),

      removeTempoPoint: (id) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            if (w.tempoMap.length <= 1) return w;
            return {
              ...w,
              tempoMap: w.tempoMap.filter((p) => p.id !== id),
            };
          }),
        })),

      addNumber: (title, startBeat, bpm) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            let beat = Math.max(0, startBeat);
            if (s.snapToBeat) beat = Math.round(beat);
            const num: MusicalNumber = {
              id: uuid(),
              title: title.trim() || `넘버 ${w.numbers.length + 1}`,
              startBeat: beat,
              bpm: bpm != null ? clampBpm(bpm) : undefined,
              color: numberColorAt(w.numbers.length),
            };
            const numbers = [...w.numbers, num].sort(
              (a, b) => a.startBeat - b.startBeat,
            );
            let tempoMap = w.tempoMap;
            if (num.bpm != null) {
              tempoMap = [
                ...w.tempoMap.filter((p) => Math.abs(p.beat - beat) > 0.01),
                {
                  id: uuid(),
                  beat,
                  bpm: num.bpm,
                  label: num.title,
                },
              ].sort((a, b) => a.beat - b.beat);
            }
            return { ...w, numbers, tempoMap };
          }),
        })),

      updateNumber: (id, patch) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            const prev = w.numbers.find((n) => n.id === id);
            if (!prev) return w;
            const next: MusicalNumber = {
              ...prev,
              title: patch.title ?? prev.title,
              color: patch.color ?? prev.color,
              endBeat: patch.endBeat !== undefined ? patch.endBeat : prev.endBeat,
              startBeat:
                patch.startBeat != null
                  ? Math.max(
                      0,
                      s.snapToBeat ? Math.round(patch.startBeat) : patch.startBeat,
                    )
                  : prev.startBeat,
              bpm:
                patch.bpm === undefined
                  ? prev.bpm
                  : patch.bpm === null
                    ? undefined
                    : clampBpm(patch.bpm),
            };
            const numbers = w.numbers
              .map((n) => (n.id === id ? next : n))
              .sort((a, b) => a.startBeat - b.startBeat);

            let tempoMap = w.tempoMap;
            if (next.bpm != null) {
              const existing = tempoMap.find(
                (p) =>
                  Math.abs(p.beat - prev.startBeat) < 0.01 ||
                  Math.abs(p.beat - next.startBeat) < 0.01,
              );
              if (existing) {
                tempoMap = tempoMap
                  .map((p) =>
                    p.id === existing.id
                      ? {
                          ...p,
                          beat: next.startBeat,
                          bpm: next.bpm!,
                          label: next.title,
                        }
                      : p,
                  )
                  .sort((a, b) => a.beat - b.beat);
              } else {
                tempoMap = [
                  ...tempoMap,
                  {
                    id: uuid(),
                    beat: next.startBeat,
                    bpm: next.bpm,
                    label: next.title,
                  },
                ].sort((a, b) => a.beat - b.beat);
              }
            }
            return { ...w, numbers, tempoMap };
          }),
        })),

      removeNumber: (id) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            numbers: w.numbers.filter((n) => n.id !== id),
            script: w.script.map((l) =>
              l.numberId === id ? { ...l, numberId: undefined } : l,
            ),
          })),
        })),

      importScript: (raw) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            const bundle = parseScriptBundle(raw, w.bpm);
            return {
              ...w,
              script: bundle.script,
              numbers: bundle.numbers,
              tempoMap: bundle.tempoMap,
              keyframes: [],
            };
          }),
          selectedLineIds: [],
          charSelection: null,
          currentBeat: 0,
        })),

      clearScript: () =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            script: [],
            keyframes: [],
            numbers: [],
            tempoMap: [{ id: uuid(), beat: 0, bpm: w.bpm, label: '기본' }],
          })),
          selectedLineIds: [],
          charSelection: null,
          currentBeat: 0,
        })),

      retimeScript: () =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            const oldBeats = new Map(
              w.script
                .filter((l) => l.beat != null)
                .map((l) => [l.id, l.beat as number]),
            );
            const script = assignBeatsToScript(w.script);
            const keyframes = w.keyframes.map((kf) => {
              if (!kf.cueLineId) return kf;
              const line = script.find((l) => l.id === kf.cueLineId);
              if (!line || line.beat == null) return kf;
              const oldBeat = oldBeats.get(kf.cueLineId);
              const offset = oldBeat != null ? kf.beat - oldBeat : 0;
              return { ...kf, beat: Math.max(0, line.beat + offset) };
            });

            // Remap tempo / number beats via source lines when possible
            const tempoMap = w.tempoMap.map((p) => {
              if (!p.sourceLineId) return p;
              const line = script.find((l) => l.id === p.sourceLineId);
              return line?.beat != null ? { ...p, beat: line.beat } : p;
            });
            const numbers = w.numbers.map((n) => {
              if (!n.sourceLineId) return n;
              const line = script.find((l) => l.id === n.sourceLineId);
              return line?.beat != null ? { ...n, startBeat: line.beat } : n;
            });

            return {
              ...w,
              script,
              keyframes,
              tempoMap: tempoMap.sort((a, b) => a.beat - b.beat),
              numbers: numbers.sort((a, b) => a.startBeat - b.startBeat),
            };
          }),
        })),

      selectLine: (lineId, multi = false) =>
        set((s) => {
          const work = s.activeWork();
          const line = work.script.find((l) => l.id === lineId);
          const beat = line?.beat ?? s.currentBeat;

          if (multi) {
            const has = s.selectedLineIds.includes(lineId);
            return {
              selectedLineIds: has
                ? s.selectedLineIds.filter((id) => id !== lineId)
                : [...s.selectedLineIds, lineId],
              charSelection: null,
              currentBeat: has ? s.currentBeat : beat,
              isPlaying: false,
            };
          }
          return {
            selectedLineIds: [lineId],
            charSelection: null,
            currentBeat: beat,
            isPlaying: false,
          };
        }),

      clearSelection: () => set({ selectedLineIds: [], charSelection: null }),

      setCharSelection: (sel) => {
        const work = get().activeWork();
        const line = sel ? work.script.find((l) => l.id === sel.lineId) : undefined;
        set({
          charSelection: sel,
          selectedLineIds: sel ? [sel.lineId] : [],
          currentBeat: line?.beat ?? get().currentBeat,
          isPlaying: false,
        });
      },

      setLineBeat: (lineId, beat) => {
        const s = get();
        let nextBeat = Math.max(0, beat);
        if (s.snapToBeat) nextBeat = Math.round(nextBeat);

        set({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            script: w.script.map((l) =>
              l.id === lineId ? { ...l, beat: nextBeat } : l,
            ),
            keyframes: w.keyframes.map((kf) =>
              kf.cueLineId === lineId ? { ...kf, beat: nextBeat } : kf,
            ),
          })),
          currentBeat:
            s.selectedLineIds[0] === lineId ? nextBeat : s.currentBeat,
        });
      },

      nudgeSelectedCue: (delta) => {
        const s = get();
        const lineId = s.selectedLineIds[0];
        if (!lineId) {
          s.setCurrentBeat(Math.max(0, s.currentBeat + delta));
          return;
        }
        const line = s.activeWork().script.find((l) => l.id === lineId);
        const base = line?.beat ?? s.currentBeat;
        s.setLineBeat(lineId, base + delta);
      },

      setCurrentBeat: (beat, opts) => {
        const next = Math.max(0, beat);
        const sync = opts?.syncSelection ?? false;
        if (!sync) {
          set({ currentBeat: next });
          return;
        }
        const work = get().activeWork();
        const line = lineAtBeat(work.script, next);
        set({
          currentBeat: next,
          selectedLineIds: line ? [line.id] : get().selectedLineIds,
          charSelection: null,
        });
      },

      setPlaying: (playing) => set({ isPlaying: playing }),
      setSnapToBeat: (snap) => set({ snapToBeat: snap }),

      moveRoleAtCurrentCue: (roleId, pos) => {
        const s = get();
        const work = s.activeWork();
        const lineId = s.selectedLineIds[0];
        const line = lineId
          ? work.script.find((l) => l.id === lineId)
          : lineAtBeat(work.script, s.currentBeat);

        let beat = line?.beat ?? s.currentBeat;
        if (s.snapToBeat) beat = Math.round(beat);

        const resolvedLineId = line?.id;
        const cueLabel = formatCueLabel(line, s.charSelection?.text);

        // Prefer keyframe bound to this script line
        const byLine = resolvedLineId
          ? keyframeForLine(work.keyframes, resolvedLineId)
          : undefined;

        set({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            const script = resolvedLineId
              ? w.script.map((l) =>
                  l.id === resolvedLineId ? { ...l, beat } : l,
                )
              : w.script;

            if (byLine) {
              return {
                ...w,
                script,
                keyframes: w.keyframes.map((kf) =>
                  kf.id === byLine.id
                    ? {
                        ...kf,
                        beat,
                        positions: { ...kf.positions, [roleId]: pos },
                        cueLineId: resolvedLineId ?? kf.cueLineId,
                        cueLabel: cueLabel || kf.cueLabel,
                        charSelection: s.charSelection ?? kf.charSelection,
                      }
                    : kf,
                ),
              };
            }

            const seed = seedPositions(w, beat);
            seed[roleId] = pos;
            const kf: Keyframe = {
              id: uuid(),
              beat,
              cueLineId: resolvedLineId,
              cueLabel,
              charSelection: s.charSelection ?? undefined,
              positions: seed,
            };
            return { ...w, script, keyframes: [...w.keyframes, kf] };
          }),
          currentBeat: beat,
          selectedLineIds: resolvedLineId
            ? [resolvedLineId]
            : s.selectedLineIds,
        });
      },

      updateKeyframe: (id, patch) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            const target = w.keyframes.find((kf) => kf.id === id);
            const keyframes = w.keyframes.map((kf) =>
              kf.id === id ? { ...kf, ...patch } : kf,
            );
            // Keep script line beat in sync when keyframe beat changes
            let script = w.script;
            if (target?.cueLineId && patch.beat != null) {
              script = w.script.map((l) =>
                l.id === target.cueLineId ? { ...l, beat: patch.beat } : l,
              );
            }
            return { ...w, keyframes, script };
          }),
        })),

      deleteKeyframe: (id) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            keyframes: w.keyframes.filter((kf) => kf.id !== id),
          })),
        })),

      deleteBlockingForLine: (lineId) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            keyframes: w.keyframes.filter((kf) => kf.cueLineId !== lineId),
          })),
        })),
    }),
    {
      name: 'musical-blocking-v3',
      partialize: (s) => ({
        works: s.works,
        activeWorkId: s.activeWorkId,
        snapToBeat: s.snapToBeat,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined;
        if (!p?.works) return current;
        const works = p.works.map((w) => normalizeWork(w as MusicalWork));
        return {
          ...current,
          ...p,
          works,
          activeWorkId: p.activeWorkId ?? works[0]?.id ?? current.activeWorkId,
        };
      },
    },
  ),
);
