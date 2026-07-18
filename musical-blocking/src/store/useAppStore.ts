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
import { nearestKeyframe } from '../lib/interpolation';

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
  selectLine: (lineId: string, multi?: boolean) => void;
  clearSelection: () => void;
  setCharSelection: (sel: CharSelection | null) => void;

  setCurrentBeat: (beat: number) => void;
  setPlaying: (playing: boolean) => void;
  setSnapToBeat: (snap: boolean) => void;

  moveRoleAtCurrentCue: (roleId: string, pos: Position) => void;
  updateKeyframe: (id: string, patch: Partial<Keyframe>) => void;
  deleteKeyframe: (id: string) => void;
  addKeyframeAtBeat: (beat: number) => void;
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
        // Remap role ids in keyframes
        const roleMap = new Map(src.roles.map((r, i) => [r.id, copy.roles[i].id]));
        copy.keyframes = copy.keyframes.map((kf) => {
          const positions: Record<string, Position> = {};
          for (const [oldId, pos] of Object.entries(kf.positions)) {
            const newId = roleMap.get(oldId);
            if (newId) positions[newId] = pos;
          }
          return { ...kf, positions };
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
          })),
          selectedLineIds: [],
          charSelection: null,
        })),

      clearScript: () =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            script: [],
          })),
          selectedLineIds: [],
          charSelection: null,
        })),

      selectLine: (lineId, multi = false) =>
        set((s) => {
          if (multi) {
            const has = s.selectedLineIds.includes(lineId);
            return {
              selectedLineIds: has
                ? s.selectedLineIds.filter((id) => id !== lineId)
                : [...s.selectedLineIds, lineId],
              charSelection: null,
            };
          }
          return { selectedLineIds: [lineId], charSelection: null };
        }),

      clearSelection: () => set({ selectedLineIds: [], charSelection: null }),

      setCharSelection: (sel) =>
        set({
          charSelection: sel,
          selectedLineIds: sel ? [sel.lineId] : [],
        }),

      setCurrentBeat: (beat) => set({ currentBeat: Math.max(0, beat) }),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setSnapToBeat: (snap) => set({ snapToBeat: snap }),

      moveRoleAtCurrentCue: (roleId, pos) => {
        const s = get();
        const work = s.activeWork();
        let beat = s.currentBeat;
        if (s.snapToBeat) beat = Math.round(beat);

        const lineId = s.selectedLineIds[0];
        const line = work.script.find((l) => l.id === lineId);
        const cueLabel = formatCueLabel(line, s.charSelection?.text);

        // If a line has an assigned beat, prefer that
        if (line?.beat != null) beat = line.beat;

        const existing = nearestKeyframe(work.keyframes, beat, 0.01);

        set({
          works: mapActive(s.works, s.activeWorkId, (w) => {
            if (existing) {
              return {
                ...w,
                keyframes: w.keyframes.map((kf) =>
                  kf.id === existing.id
                    ? {
                        ...kf,
                        positions: { ...kf.positions, [roleId]: pos },
                        cueLineId: lineId ?? kf.cueLineId,
                        cueLabel: cueLabel || kf.cueLabel,
                        charSelection: s.charSelection ?? kf.charSelection,
                      }
                    : kf,
                ),
              };
            }

            // Seed positions from neighbors / defaults
            const seed: Record<string, Position> = {};
            for (const role of w.roles) {
              const fromExisting = [...w.keyframes]
                .sort((a, b) => Math.abs(a.beat - beat) - Math.abs(b.beat - beat))
                .find((kf) => kf.positions[role.id]);
              seed[role.id] = fromExisting
                ? { ...fromExisting.positions[role.id] }
                : {
                    x: 0.2 + (w.roles.indexOf(role) % 5) * 0.15,
                    y: 0.55 + Math.floor(w.roles.indexOf(role) / 5) * 0.15,
                  };
            }
            seed[roleId] = pos;

            const kf: Keyframe = {
              id: uuid(),
              beat,
              cueLineId: lineId,
              cueLabel,
              charSelection: s.charSelection ?? undefined,
              positions: seed,
            };
            return { ...w, keyframes: [...w.keyframes, kf] };
          }),
          currentBeat: beat,
        });
      },

      updateKeyframe: (id, patch) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            keyframes: w.keyframes.map((kf) =>
              kf.id === id ? { ...kf, ...patch } : kf,
            ),
          })),
        })),

      deleteKeyframe: (id) =>
        set((s) => ({
          works: mapActive(s.works, s.activeWorkId, (w) => ({
            ...w,
            keyframes: w.keyframes.filter((kf) => kf.id !== id),
          })),
        })),

      addKeyframeAtBeat: (beat) => {
        const s = get();
        const work = s.activeWork();
        const b = s.snapToBeat ? Math.round(beat) : beat;
        if (nearestKeyframe(work.keyframes, b, 0.01)) {
          set({ currentBeat: b });
          return;
        }
        const positions: Record<string, Position> = {};
        work.roles.forEach((role, i) => {
          const near = [...work.keyframes]
            .sort((a, c) => Math.abs(a.beat - b) - Math.abs(c.beat - b))
            .find((kf) => kf.positions[role.id]);
          positions[role.id] = near
            ? { ...near.positions[role.id] }
            : { x: 0.2 + (i % 5) * 0.15, y: 0.55 };
        });
        const kf: Keyframe = { id: uuid(), beat: b, positions };
        set((st) => ({
          works: mapActive(st.works, st.activeWorkId, (w) => ({
            ...w,
            keyframes: [...w.keyframes, kf],
          })),
          currentBeat: b,
        }));
      },
    }),
    {
      name: 'musical-blocking-v1',
      partialize: (s) => ({
        works: s.works,
        activeWorkId: s.activeWorkId,
        snapToBeat: s.snapToBeat,
      }),
    },
  ),
);
