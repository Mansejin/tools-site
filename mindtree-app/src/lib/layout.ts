import type { ThoughtNode } from '../types';

export const LAYOUT = {
  horizontalGap: 140,
  verticalGap: 40,
  leftAnchor: 48,
  canvasCenterY: 320,
} as const;

export const LAYOUT_MOBILE = {
  horizontalGap: 72,
  verticalGap: 32,
  leftAnchor: 12,
  canvasCenterY: 260,
} as const;

export type LayoutConfig = {
  horizontalGap: number;
  verticalGap: number;
  leftAnchor: number;
  canvasCenterY: number;
};

export type LayoutPosition = {
  id: string;
  x: number;
  y: number;
};

/** 깊이별 세로 컬럼 — LLM/신경망 트리처럼 좌→우로만 뻗음 */
export function computeLayout(nodes: ThoughtNode[], mobile = false): Map<string, LayoutPosition> {
  const cfg = mobile ? LAYOUT_MOBILE : LAYOUT;
  const positions = new Map<string, LayoutPosition>();
  if (nodes.length === 0) return positions;

  const byDepth = new Map<number, ThoughtNode[]>();
  for (const node of nodes) {
    if (node.inInbox) continue;
    const group = byDepth.get(node.depth) ?? [];
    group.push(node);
    byDepth.set(node.depth, group);
  }

  const depths = [...byDepth.keys()].sort((a, b) => a - b);

  for (const depth of depths) {
    const layer = [...(byDepth.get(depth) ?? [])].sort(
      (a, b) => b.importance - a.importance || a.title.localeCompare(b.title, 'ko'),
    );
    const count = layer.length;
    const totalH = Math.max(0, count - 1) * cfg.verticalGap;
    const startY = cfg.canvasCenterY - totalH / 2;

    layer.forEach((node, index) => {
      positions.set(node.id, {
        id: node.id,
        x: depth * cfg.horizontalGap + cfg.leftAnchor,
        y: startY + index * cfg.verticalGap,
      });
    });
  }

  return positions;
}

export function getAdjacentNodeIds(
  nodeId: string,
  nodes: ThoughtNode[],
  edges: { sourceId: string; targetId: string }[],
): Set<string> {
  const adjacent = new Set<string>([nodeId]);

  for (const edge of edges) {
    if (edge.sourceId === nodeId) adjacent.add(edge.targetId);
    if (edge.targetId === nodeId) adjacent.add(edge.sourceId);
  }

  const node = nodes.find((n) => n.id === nodeId);
  if (node?.parentId) adjacent.add(node.parentId);

  for (const child of nodes) {
    if (child.parentId === nodeId) adjacent.add(child.id);
  }

  return adjacent;
}

/** 선택 노드에서 뿌리까지 경로上的 node id */
export function getActivePathNodeIds(
  selectedId: string | null,
  nodes: ThoughtNode[],
): Set<string> {
  const active = new Set<string>();
  if (!selectedId) return active;

  let current = nodes.find((n) => n.id === selectedId);
  while (current) {
    active.add(current.id);
    current = current.parentId
      ? nodes.find((n) => n.id === current!.parentId)
      : undefined;
  }
  return active;
}

/** 선택 노드에서 뿌리까지 경로上的 edge id */
export function getActiveEdgeIds(
  selectedId: string | null,
  nodes: ThoughtNode[],
  edges: { id: string; sourceId: string; targetId: string }[],
): Set<string> {
  const active = new Set<string>();
  if (!selectedId) return active;

  let current = nodes.find((n) => n.id === selectedId);
  while (current?.parentId) {
    const edge = edges.find(
      (e) => e.sourceId === current!.parentId && e.targetId === current!.id,
    );
    if (edge) active.add(edge.id);
    current = nodes.find((n) => n.id === current!.parentId);
  }
  return active;
}
