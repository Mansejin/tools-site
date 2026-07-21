import type { ThoughtNode } from '../types';

export const LAYOUT = {
  horizontalGap: 120,
  verticalGap: 36,
  leftAnchor: 48,
  canvasCenterY: 320,
} as const;

export const LAYOUT_MOBILE = {
  horizontalGap: 64,
  verticalGap: 28,
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

function sortNodes(nodes: ThoughtNode[]): ThoughtNode[] {
  return [...nodes].sort(
    (a, b) =>
      b.importance - a.importance ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.title.localeCompare(b.title, 'ko'),
  );
}

/** 부모-자식 트리 기준 좌→우 배치 — 자식 Y를 부모에 맞춰 선 교차 최소화 */
export function computeLayout(nodes: ThoughtNode[], mobile = false): Map<string, LayoutPosition> {
  const cfg = mobile ? LAYOUT_MOBILE : LAYOUT;
  const positions = new Map<string, LayoutPosition>();
  const placed = nodes.filter((n) => !n.inInbox);
  if (placed.length === 0) return positions;

  const byId = new Map(placed.map((n) => [n.id, n]));
  const children = new Map<string, ThoughtNode[]>();

  for (const node of placed) {
    if (node.parentId && byId.has(node.parentId)) {
      const kids = children.get(node.parentId) ?? [];
      kids.push(node);
      children.set(node.parentId, kids);
    }
  }

  for (const kids of children.values()) {
    sortNodes(kids);
  }

  const roots = sortNodes(
    placed.filter((node) => !node.parentId || !byId.has(node.parentId)),
  );

  let yCursor = 0;

  function layoutSubtree(node: ThoughtNode, depth: number): number {
    const kids = children.get(node.id) ?? [];
    const x = depth * cfg.horizontalGap + cfg.leftAnchor;

    if (kids.length === 0) {
      const y = yCursor;
      yCursor += cfg.verticalGap;
      positions.set(node.id, { id: node.id, x, y });
      return y;
    }

    const childYs = kids.map((child) => layoutSubtree(child, depth + 1));
    const y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    positions.set(node.id, { id: node.id, x, y });
    return y;
  }

  for (const root of roots) {
    layoutSubtree(root, 0);
    yCursor += cfg.verticalGap * 0.5;
  }

  const ys = [...positions.values()].map((p) => p.y);
  if (ys.length > 0) {
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const offset = cfg.canvasCenterY - (minY + maxY) / 2;
    for (const pos of positions.values()) {
      pos.y += offset;
    }
  }

  return positions;
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
