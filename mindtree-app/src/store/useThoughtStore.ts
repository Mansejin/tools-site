import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current, isDraft } from 'immer';
import type { ThoughtDirection, ThoughtMap, ThoughtNode, ThoughtRelation } from '../types';
import {
  createEdge,
  createEmptyMap,
  createNode,
  createSampleMap,
  createTopicMap,
  defaultCategoryForDepth,
  nextDepth,
} from '../lib/sampleTemplate';
import { saveMap } from '../lib/db';

const WELCOME_KEY = 'mindtree-welcome-dismissed';
const MAX_HISTORY = 40;

type Snapshot = {
  map: ThoughtMap;
  collapsedIds: string[];
  selectedNodeId: string | null;
  editingNodeId: string | null;
};

type ThoughtStore = {
  map: ThoughtMap;
  selectedNodeId: string | null;
  isSaving: boolean;
  showWelcome: boolean;
  editingNodeId: string | null;
  collapsedIds: string[];
  past: Snapshot[];

  setMap: (map: ThoughtMap) => void;
  selectNode: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  dismissWelcome: () => void;
  openWelcome: () => void;
  toggleCollapse: (id: string) => void;

  addConnectedThought: (
    parentId: string,
    direction: ThoughtDirection,
    title?: string,
  ) => string;
  updateNode: (id: string, patch: Partial<ThoughtNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (sourceId: string, targetId: string, relation?: ThoughtRelation) => void;
  deleteEdge: (id: string) => void;
  loadSampleMap: () => void;
  startWithTopic: (topic: string) => void;
  startBlank: () => void;
  newMap: (title?: string) => void;
  updateMapTitle: (title: string) => void;
  undo: () => boolean;
  persist: () => Promise<void>;
};

function touchMap(map: ThoughtMap) {
  map.updatedAt = new Date().toISOString();
}

function cloneMap(map: ThoughtMap): ThoughtMap {
  // immer draft는 structuredClone 불가 — current()로 평탄화
  const plain = isDraft(map) ? current(map) : map;
  return structuredClone(plain);
}

function readWelcomeState(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) !== '1';
  } catch {
    return true;
  }
}

function pushPast(s: {
  map: ThoughtMap;
  collapsedIds: string[];
  selectedNodeId: string | null;
  editingNodeId: string | null;
  past: Snapshot[];
}) {
  s.past.push({
    map: cloneMap(s.map),
    collapsedIds: [...s.collapsedIds],
    selectedNodeId: s.selectedNodeId,
    editingNodeId: s.editingNodeId,
  });
  if (s.past.length > MAX_HISTORY) s.past.shift();
}

export const useThoughtStore = create<ThoughtStore>()(
  immer((set, get) => ({
    map: createSampleMap(),
    selectedNodeId: null as string | null,
    isSaving: false,
    showWelcome: readWelcomeState(),
    editingNodeId: null as string | null,
    collapsedIds: [] as string[],
    past: [] as Snapshot[],

    setMap: (map) =>
      set({
        map,
        // 루트는 선택하지 않음 — 첫 자식(또는 null)
        selectedNodeId:
          map.nodes.find(
            (n) =>
              !n.inInbox &&
              n.parentId &&
              map.nodes.some((p) => p.id === n.parentId),
          )?.id ?? null,
        collapsedIds: [],
        editingNodeId: null,
        past: [],
      }),

    selectNode: (id) => set({ selectedNodeId: id }),

    setEditingNodeId: (id) => set({ editingNodeId: id }),

    dismissWelcome: () => {
      try {
        localStorage.setItem(WELCOME_KEY, '1');
      } catch { /* ignore */ }
      set({ showWelcome: false });
    },

    openWelcome: () => set({ showWelcome: true }),

    toggleCollapse: (id) =>
      set((s) => {
        const idx = s.collapsedIds.indexOf(id);
        if (idx >= 0) {
          s.collapsedIds.splice(idx, 1);
          return;
        }

        s.collapsedIds.push(id);

        const target = s.map.nodes.find((n) => n.id === id);
        const collapsingRoot =
          !!target &&
          (!target.parentId || !s.map.nodes.some((n) => n.id === target.parentId));

        let walk = s.map.nodes.find((n) => n.id === s.selectedNodeId);
        while (walk?.parentId) {
          if (walk.parentId === id) {
            // 루트는 선택 대상이 아님 — 접으면 선택만 해제
            s.selectedNodeId = collapsingRoot ? null : id;
            s.editingNodeId = null;
            break;
          }
          walk = s.map.nodes.find((n) => n.id === walk!.parentId);
        }
      }),

    addConnectedThought: (parentId, direction, title = '새 생각') => {
      let newId = '';
      set((s) => {
        pushPast(s);
        const parent = s.map.nodes.find((n) => n.id === parentId);
        const node = createNode({
          title,
          parentId,
          direction,
          depth: nextDepth(parent),
          category: defaultCategoryForDepth(nextDepth(parent)),
          importance: parent ? Math.max(0.3, parent.importance - 0.1) : 0.8,
        });
        newId = node.id;
        s.map.nodes.push(node);
        s.map.edges.push(createEdge(parentId, node.id, 'supports'));
        s.collapsedIds = s.collapsedIds.filter((cid) => cid !== parentId);
        touchMap(s.map);
        s.selectedNodeId = node.id;
        s.editingNodeId = node.id;
      });
      return newId;
    },

    updateNode: (id, patch) =>
      set((s) => {
        const node = s.map.nodes.find((n) => n.id === id);
        if (!node) return;
        pushPast(s);
        Object.assign(node, patch, { updatedAt: new Date().toISOString() });
        touchMap(s.map);
      }),

    deleteNode: (id) =>
      set((s) => {
        const target = s.map.nodes.find((n) => n.id === id);
        if (!target) return;
        // 루트는 삭제 불가
        if (!target.parentId || !s.map.nodes.some((n) => n.id === target.parentId)) {
          return;
        }

        pushPast(s);

        const removeIds = new Set<string>();
        const collect = (nodeId: string) => {
          removeIds.add(nodeId);
          for (const child of s.map.nodes) {
            if (child.parentId === nodeId) collect(child.id);
          }
        };
        collect(id);

        const parentId = target.parentId;
        s.map.nodes = s.map.nodes.filter((n) => !removeIds.has(n.id));
        s.map.edges = s.map.edges.filter(
          (e) => !removeIds.has(e.sourceId) && !removeIds.has(e.targetId),
        );
        s.collapsedIds = s.collapsedIds.filter((cid) => !removeIds.has(cid));
        if (s.selectedNodeId && removeIds.has(s.selectedNodeId)) {
          s.selectedNodeId = parentId;
        }
        if (s.editingNodeId && removeIds.has(s.editingNodeId)) s.editingNodeId = null;
        touchMap(s.map);
      }),

    addEdge: (sourceId, targetId, relation = 'supports') =>
      set((s) => {
        const exists = s.map.edges.some(
          (e) => e.sourceId === sourceId && e.targetId === targetId,
        );
        if (exists) return;
        pushPast(s);
        s.map.edges.push(createEdge(sourceId, targetId, relation));
        touchMap(s.map);
      }),

    deleteEdge: (id) =>
      set((s) => {
        pushPast(s);
        s.map.edges = s.map.edges.filter((e) => e.id !== id);
        touchMap(s.map);
      }),

    loadSampleMap: () => {
      set({
        map: createSampleMap(),
        selectedNodeId: null,
        showWelcome: false,
        collapsedIds: [],
        editingNodeId: null,
        past: [],
      });
      try {
        localStorage.setItem(WELCOME_KEY, '1');
      } catch { /* ignore */ }
    },

    startWithTopic: (topic) => {
      const map = createTopicMap(topic);
      set({
        map,
        selectedNodeId: null,
        showWelcome: false,
        collapsedIds: [],
        editingNodeId: null,
        past: [],
      });
      try {
        localStorage.setItem(WELCOME_KEY, '1');
      } catch { /* ignore */ }
    },

    startBlank: () => {
      const map = createEmptyMap('나의 생각');
      const root = createNode({
        title: '나',
        depth: 0,
        importance: 1,
        category: 'question',
      });
      map.nodes.push(root);
      set({
        map,
        selectedNodeId: null,
        showWelcome: false,
        collapsedIds: [],
        editingNodeId: null,
        past: [],
      });
      try {
        localStorage.setItem(WELCOME_KEY, '1');
      } catch { /* ignore */ }
    },

    newMap: (title) =>
      set({
        map: createEmptyMap(title),
        selectedNodeId: null,
        collapsedIds: [],
        editingNodeId: null,
        past: [],
      }),

    updateMapTitle: (title) =>
      set((s) => {
        if (s.map.title === title) return;
        s.map.title = title;
        touchMap(s.map);
      }),

    undo: () => {
      const { past } = get();
      if (past.length === 0) return false;
      const snapshot = past[past.length - 1];
      set((s) => {
        s.past.pop();
        s.map = cloneMap(snapshot.map);
        s.collapsedIds = [...snapshot.collapsedIds];
        s.selectedNodeId = snapshot.selectedNodeId;
        s.editingNodeId = null;
      });
      return true;
    },

    persist: async () => {
      const { map } = get();
      set({ isSaving: true });
      try {
        await saveMap(map);
      } finally {
        set({ isSaving: false });
      }
    },
  })),
);
