import type { ThoughtNode } from '../types';

export const LAYOUT = {
  horizontalGap: 220,
  verticalGap: 72,
  branchSpread: 140,
  nodeWidth: 180,
  nodeHeight: 56,
  canvasCenterY: 400,
  leftAnchor: 80,
} as const;

export const LAYOUT_MOBILE = {
  horizontalGap: 96,
  verticalGap: 56,
  branchSpread: 44,
  nodeWidth: 108,
  nodeHeight: 36,
  canvasCenterY: 240,
  leftAnchor: 20,
} as const;

export type LayoutConfig = {
  horizontalGap: number;
  verticalGap: number;
  branchSpread: number;
  nodeWidth: number;
  nodeHeight: number;
  canvasCenterY: number;
  leftAnchor?: number;
};

export type LayoutPosition = {
  id: string;
  x: number;
  y: number;
};

function directionSign(direction: ThoughtNode['direction']): number {
  if (direction === 'up') return -1;
  if (direction === 'down') return 1;
  return 0;
}

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
    const layer = byDepth.get(depth) ?? [];
    const upNodes = layer.filter((n) => n.direction === 'up');
    const centerNodes = layer.filter((n) => n.direction === 'center');
    const downNodes = layer.filter((n) => n.direction === 'down');

    const x = depth * cfg.horizontalGap + (cfg.leftAnchor ?? 80);

    placeGroup(upNodes, x, 'up', positions, cfg);
    placeGroup(centerNodes, x, 'center', positions, cfg);
    placeGroup(downNodes, x, 'down', positions, cfg);
  }

  return positions;
}

function placeGroup(
  nodes: ThoughtNode[],
  x: number,
  direction: ThoughtNode['direction'],
  positions: Map<string, LayoutPosition>,
  cfg: LayoutConfig,
) {
  if (nodes.length === 0) return;

  const sorted = [...nodes].sort((a, b) => b.importance - a.importance);
  const sign = directionSign(direction);
  const totalHeight = (sorted.length - 1) * cfg.verticalGap;

  sorted.forEach((node, index) => {
    const importanceOffset = (1 - node.importance) * cfg.branchSpread;
    const siblingOffset = index * cfg.verticalGap - totalHeight / 2;

    let y = cfg.canvasCenterY;
    if (direction === 'center') {
      y += siblingOffset * 0.4;
    } else {
      y += sign * (importanceOffset * 0.7 + cfg.branchSpread * 0.25) + siblingOffset;
    }

    positions.set(node.id, { id: node.id, x, y });
  });
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
