import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  AppTab,
  CharSelection,
  Keyframe,
  MusicalWork,
  Position,
  Role,
  SettingsSection,
  StageConfig,
} from '../types';
import { roleColorAt, shortNameFrom } from '../lib/colors';
import { formatCueLabel, parseScript, SAMPLE_SCRIPT } from '../lib/scriptParser';
import {
  assignBeatsToScript,
  ensureScriptBeats,
  keyframeForLine,
  lineAtBeat,
} from '../lib/cues';

function defaultStage(): StageConfig {
  return { widthM: 12, depthM: 8, showGrid: true, gridDivisions: 8 };
}

function defaultRoles(): Role[] {
  return [
    { id: uuid(), name: '민수', shortName: '민', color: roleColorAt(0), visible: true },
    { id: uuid(), name: '지아', shortName: '지', color: roleColorAt(1), visible: true },
  ];
}

function createWork(title = '새 작품'): MusicalWork {
  const now = Date.now();
  return {
    id: uuid(),
    title,
    bpm: 120,
    beatsPerBar: 4,
    stage: defaultStage(),
    roles: defaultRoles(),
    script: parseScript(SAMPLE_SCRIPT),
    keyframes: [],
    createdAt: now,
    updatedAt: now,
  };
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
          ...structuredClone(src),
          id: uuid(),
          title: `${src.title} (복사)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          roles: src.roles.map((r) => ({ ...r, id: uuid() })),
          script: src.script.map((l) => ({ ...l, id: uuid() })),
          keyframes: src.keyframes.map((k) => ({ ...k, id: uuid() })),
        };
        const roleMap = new Map(src.roles.map((r, i) => [r.id, copy.roles[i].id]));
        const lineMap = new Map(src.script.map((l, i) => [l.id, copy.script[i].id]));
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
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            bpm: Math.max(40, Math.min(240, bpm)),
            beatsPerBar: beatsPerBar ?? w.beatsPerBar,
          })),
        })),

      importScript: (raw) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            script: parseScript(raw),
            keyframes: [],
          })),
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
          })),
          selectedLineIds: [],
          charSelection: null,
          currentBeat: 0,
        })),

      retimeScript: () =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            const script = assignBeatsToScript(w.script);
            const beatByOld = new Map(
              w.script.filter((l) => l.beat != null).map((l) => [l.id, l.beat as number]),
            );
            const keyframes = w.keyframes.map((kf) => {
              if (!kf.cueLineId) return kf;
              const line = script.find((l) => l.id === kf.cueLineId);
              if (!line || line.beat == null) return kf;
              // Keep relative offset if keyframe wasn't exactly on old beat
              const oldBeat = beatByOld.get(kf.cueLineId);
              const offset =
                oldBeat != null ? kf.beat - oldBeat : 0;
              return { ...kf, beat: Math.max(0, line.beat + offset) };
            });
            return { ...w, script, keyframes };
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
      name: 'musical-blocking-v2',
      partialize: (s) => ({
        works: s.works,
        activeWorkId: s.activeWorkId,
        snapToBeat: s.snapToBeat,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined;
        if (!p?.works) return current;
        const works = p.works.map((w) => ({
          ...w,
          script: ensureScriptBeats(w.script ?? []),
        }));
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
