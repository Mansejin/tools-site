import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ThoughtDirection, ThoughtMap, ThoughtNode, ThoughtRelation } from '../types';
import {
  createEdge,
  createEmptyMap,
  createNode,
  createSampleMap,
  defaultCategoryForDepth,
  nextDepth,
} from '../lib/sampleTemplate';
import { saveMap } from '../lib/db';

type ThoughtStore = {
  map: ThoughtMap;
  selectedNodeId: string | null;
  calmMode: boolean;
  isSaving: boolean;

  setMap: (map: ThoughtMap) => void;
  selectNode: (id: string | null) => void;
  toggleCalmMode: () => void;

  addInboxThought: (title: string) => void;
  placeInboxThought: (inboxId: string, parentId: string | null, direction: ThoughtDirection) => void;
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
  newMap: (title?: string) => void;
  updateMapTitle: (title: string) => void;
  persist: () => Promise<void>;
};

function touchMap(map: ThoughtMap) {
  map.updatedAt = new Date().toISOString();
}

export const useThoughtStore = create<ThoughtStore>()(
  immer((set, get) => ({
    map: createSampleMap(),
    selectedNodeId: 'n-value-1',
    calmMode: true,
    isSaving: false,

    setMap: (map) => set({ map, selectedNodeId: map.nodes.find((n) => !n.inInbox)?.id ?? null }),

    selectNode: (id) => set({ selectedNodeId: id }),

    toggleCalmMode: () => set((s) => ({ calmMode: !s.calmMode })),

    addInboxThought: (title) =>
      set((s) => {
        const node = createNode({ title, inInbox: true });
        s.map.nodes.push(node);
        touchMap(s.map);
      }),

    placeInboxThought: (inboxId, parentId, direction) =>
      set((s) => {
        const inbox = s.map.nodes.find((n) => n.id === inboxId);
        if (!inbox) return;

        const parent = parentId ? s.map.nodes.find((n) => n.id === parentId) : undefined;
        inbox.inInbox = false;
        inbox.parentId = parentId;
        inbox.direction = direction;
        inbox.depth = nextDepth(parent);
        inbox.category = defaultCategoryForDepth(inbox.depth);
        inbox.importance = parent ? Math.max(0.3, parent.importance - 0.15) : 0.8;
        inbox.updatedAt = new Date().toISOString();

        if (parentId) {
          s.map.edges.push(createEdge(parentId, inboxId, 'supports'));
        }
        touchMap(s.map);
        s.selectedNodeId = inboxId;
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
        touchMap(s.map);
        s.selectedNodeId = node.id;
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
        s.map.nodes = s.map.nodes.filter((n) => n.id !== id);
        s.map.edges = s.map.edges.filter((e) => e.sourceId !== id && e.targetId !== id);
        if (s.selectedNodeId === id) s.selectedNodeId = null;
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

    loadSampleMap: () => set({ map: createSampleMap(), selectedNodeId: 'n-value-1' }),

    newMap: (title) => set({ map: createEmptyMap(title), selectedNodeId: null }),

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

// Fix newMap to not use require - I'll update this
