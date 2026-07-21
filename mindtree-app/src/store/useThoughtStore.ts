import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
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

type ThoughtStore = {
  map: ThoughtMap;
  selectedNodeId: string | null;
  isSaving: boolean;
  showWelcome: boolean;
  editingNodeId: string | null;
  collapsedIds: string[];

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
  persist: () => Promise<void>;
};

function touchMap(map: ThoughtMap) {
  map.updatedAt = new Date().toISOString();
}

function readWelcomeState(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) !== '1';
  } catch {
    return true;
  }
}

export const useThoughtStore = create<ThoughtStore>()(
  immer((set, get) => ({
    map: createSampleMap(),
    selectedNodeId: 'n-root',
    isSaving: false,
    showWelcome: readWelcomeState(),
    editingNodeId: null as string | null,
    collapsedIds: [] as string[],

    setMap: (map) =>
      set({
        map,
        selectedNodeId: map.nodes.find((n) => !n.inInbox)?.id ?? null,
        collapsedIds: [],
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

        // 접힌 하위 안에 선택이 있으면 접은 노드로 선택 이동
        let walk = s.map.nodes.find((n) => n.id === s.selectedNodeId);
        while (walk?.parentId) {
          if (walk.parentId === id) {
            s.selectedNodeId = id;
            s.editingNodeId = null;
            break;
          }
          walk = s.map.nodes.find((n) => n.id === walk!.parentId);
        }
      }),

    addConnectedThought: (parentId, direction, title = '새 생각') => {
      let newId = '';
      set((s) => {
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
        // 자식 추가 시 접힌 부모는 자동 펼침
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
        Object.assign(node, patch, { updatedAt: new Date().toISOString() });
        touchMap(s.map);
      }),

    deleteNode: (id) =>
      set((s) => {
        const removeIds = new Set<string>();
        const collect = (nodeId: string) => {
          removeIds.add(nodeId);
          for (const child of s.map.nodes) {
            if (child.parentId === nodeId) collect(child.id);
          }
        };
        collect(id);

        s.map.nodes = s.map.nodes.filter((n) => !removeIds.has(n.id));
        s.map.edges = s.map.edges.filter(
          (e) => !removeIds.has(e.sourceId) && !removeIds.has(e.targetId),
        );
        s.collapsedIds = s.collapsedIds.filter((cid) => !removeIds.has(cid));
        if (s.selectedNodeId && removeIds.has(s.selectedNodeId)) s.selectedNodeId = null;
        if (s.editingNodeId && removeIds.has(s.editingNodeId)) s.editingNodeId = null;
        touchMap(s.map);
      }),

    addEdge: (sourceId, targetId, relation = 'supports') =>
      set((s) => {
        const exists = s.map.edges.some(
          (e) => e.sourceId === sourceId && e.targetId === targetId,
        );
        if (exists) return;
        s.map.edges.push(createEdge(sourceId, targetId, relation));
        touchMap(s.map);
      }),

    deleteEdge: (id) =>
      set((s) => {
        s.map.edges = s.map.edges.filter((e) => e.id !== id);
        touchMap(s.map);
      }),

    loadSampleMap: () =>
      set({ map: createSampleMap(), selectedNodeId: 'n-root', showWelcome: false, collapsedIds: [] }),

    startWithTopic: (topic) => {
      const map = createTopicMap(topic);
      set({
        map,
        selectedNodeId: map.nodes[0]?.id ?? null,
        showWelcome: false,
        collapsedIds: [],
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
      set({ map, selectedNodeId: root.id, showWelcome: false, collapsedIds: [] });
      try {
        localStorage.setItem(WELCOME_KEY, '1');
      } catch { /* ignore */ }
    },

    newMap: (title) => set({ map: createEmptyMap(title), selectedNodeId: null, collapsedIds: [] }),

    updateMapTitle: (title) =>
      set((s) => {
        s.map.title = title;
        touchMap(s.map);
      }),

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
