import type { ThoughtNode } from '../types';

export const ROOT_SIZE = 80;
export const ROOT_SIZE_MOBILE = 64;

export const LAYOUT = {
  horizontalGap: 52,
  verticalGap: 46,
  leftAnchor: -12,
  columnPadding: 10,
  selectedExtra: 52,
  foldExtra: 18,
  maxLabelChars: 12,
  charWidth: 8.2,
  nodePadX: 24,
  minNodeWidth: 52,
  maxNodeWidth: 168,
} as const;

export const LAYOUT_MOBILE = {
  horizontalGap: 36,
  verticalGap: 38,
  leftAnchor: 8,
  columnPadding: 6,
  selectedExtra: 48,
  foldExtra: 16,
  maxLabelChars: 10,
  charWidth: 7.6,
  nodePadX: 20,
  minNodeWidth: 48,
  maxNodeWidth: 140,
} as const;

export type LayoutConfig = {
  horizontalGap: number;
  verticalGap: number;
  leftAnchor: number;
  columnPadding: number;
  selectedExtra: number;
  foldExtra: number;
  maxLabelChars: number;
  charWidth: number;
  nodePadX: number;
  minNodeWidth: number;
  maxNodeWidth: number;
};

export type LayoutPosition = {
  id: string;
  x: number;
  y: number;
};

export type LayoutOptions = {
  mobile?: boolean;
  collapsedIds?: Iterable<string>;
  selectedId?: string | null;
  canvasWidth?: number;
  canvasHeight?: number;
  /** 접기/펼치기 시 이 노드의 Y를 유지해 전체가 순간이동하지 않게 함 */
  anchorId?: string | null;
  /** anchorId의 이전 프레임 Y */
  anchorY?: number | null;
};

function sortNodes(nodes: ThoughtNode[]): ThoughtNode[] {
  return [...nodes].sort(
    (a, b) =>
      b.importance - a.importance ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.title.localeCompare(b.title, 'ko'),
  );
}

export function buildChildrenMap(nodes: ThoughtNode[]): Map<string, ThoughtNode[]> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, ThoughtNode[]>();

  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) {
      const kids = children.get(node.parentId) ?? [];
      kids.push(node);
      children.set(node.parentId, kids);
    }
  }

  for (const kids of children.values()) {
    sortNodes(kids);
  }

  return children;
}

/** 접힌 노드의 모든 자손 id */
export function getHiddenDescendantIds(
  nodes: ThoughtNode[],
  collapsedIds: Iterable<string>,
): Set<string> {
  const children = buildChildrenMap(nodes.filter((n) => !n.inInbox));
  const hidden = new Set<string>();

  const walk = (id: string) => {
    for (const child of children.get(id) ?? []) {
      if (hidden.has(child.id)) continue;
      hidden.add(child.id);
      walk(child.id);
    }
  };

  for (const id of collapsedIds) walk(id);
  return hidden;
}

export function countDescendants(
  nodeId: string,
  children: Map<string, ThoughtNode[]>,
): number {
  let total = 0;
  for (const child of children.get(nodeId) ?? []) {
    total += 1 + countDescendants(child.id, children);
  }
  return total;
}

export function isRootNode(
  node: ThoughtNode,
  byId: Map<string, ThoughtNode>,
): boolean {
  return !node.parentId || !byId.has(node.parentId);
}

/** 라벨 길이·접기·선택 컨트롤을 반영한 대략 너비 */
export function estimateNodeWidth(
  node: ThoughtNode,
  opts: {
    cfg: LayoutConfig;
    isRoot: boolean;
    hasChildren: boolean;
    selected: boolean;
    mobile: boolean;
  },
): number {
  if (opts.isRoot) {
    const size = opts.mobile ? ROOT_SIZE_MOBILE : ROOT_SIZE;
    return opts.selected ? size + 28 : size;
  }

  const chars = Math.min(node.title.length || 2, opts.cfg.maxLabelChars);
  let width = opts.cfg.nodePadX + chars * opts.cfg.charWidth;
  if (opts.hasChildren) width += opts.cfg.foldExtra;
  if (opts.selected) width += opts.cfg.selectedExtra;
  return Math.min(Math.max(width, opts.cfg.minNodeWidth), opts.cfg.maxNodeWidth + (opts.selected ? opts.cfg.selectedExtra : 0));
}

/**
 * 부모-자식 트리 좌→우 배치.
 * - 열 x는 이전 열 최대 너비 + gap으로 동적 산출 (긴 라벨이 다음 단계와 겹치지 않음)
 * - 루트 접힘: 캔버스 중앙에 원형 단독 배치
 * - 루트 펼침: 왼쪽 경계에 크게 두고 자식이 신경망처럼 펼쳐짐
 */
export function computeLayout(
  nodes: ThoughtNode[],
  options: LayoutOptions = {},
): Map<string, LayoutPosition> {
  const mobile = options.mobile ?? false;
  const cfg = mobile ? LAYOUT_MOBILE : LAYOUT;
  const rootSize = mobile ? ROOT_SIZE_MOBILE : ROOT_SIZE;
  const collapsed = new Set(options.collapsedIds ?? []);
  const selectedId = options.selectedId ?? null;
  const canvasW = options.canvasWidth ?? 960;
  const canvasH = options.canvasHeight ?? 640;

  const positions = new Map<string, LayoutPosition>();
  const placed = nodes.filter((n) => !n.inInbox);
  if (placed.length === 0) return positions;

  const byId = new Map(placed.map((n) => [n.id, n]));
  const children = buildChildrenMap(placed);
  const hidden = getHiddenDescendantIds(placed, collapsed);

  const roots = sortNodes(
    placed.filter((node) => isRootNode(node, byId)),
  );
  if (roots.length === 0) return positions;

  const primaryRoot = roots[0];
  const rootCollapsed = collapsed.has(primaryRoot.id);

  // ── 루트만 접힌 상태: 화면 중앙 ──
  if (rootCollapsed) {
    positions.set(primaryRoot.id, {
      id: primaryRoot.id,
      x: Math.max(cfg.leftAnchor, (canvasW - rootSize) / 2),
      y: Math.max(40, (canvasH - rootSize) / 2),
    });
    return positions;
  }

  const depthOf = new Map<string, number>();
  const visibleKids = (id: string) =>
    collapsed.has(id) || hidden.has(id)
      ? []
      : (children.get(id) ?? []).filter((c) => !hidden.has(c.id));

  function assignDepth(node: ThoughtNode, depth: number) {
    depthOf.set(node.id, depth);
    for (const child of visibleKids(node.id)) {
      assignDepth(child, depth + 1);
    }
  }

  for (const root of roots) {
    if (hidden.has(root.id)) continue;
    assignDepth(root, 0);
  }

  const widths = new Map<string, number>();
  for (const node of placed) {
    if (hidden.has(node.id) && node.id !== primaryRoot.id) continue;
    if (!depthOf.has(node.id)) continue;
    const root = isRootNode(node, byId);
    widths.set(
      node.id,
      estimateNodeWidth(node, {
        cfg,
        isRoot: root,
        hasChildren: (children.get(node.id)?.length ?? 0) > 0,
        selected: node.id === selectedId,
        mobile,
      }),
    );
  }

  const maxDepth = Math.max(0, ...depthOf.values());
  const columnMaxWidth: number[] = Array.from({ length: maxDepth + 1 }, () => 0);
  for (const [id, depth] of depthOf) {
    columnMaxWidth[depth] = Math.max(columnMaxWidth[depth], widths.get(id) ?? cfg.minNodeWidth);
  }

  const columnX: number[] = Array.from({ length: maxDepth + 1 }, () => cfg.leftAnchor);
  columnX[0] = cfg.leftAnchor;
  for (let d = 1; d <= maxDepth; d++) {
    columnX[d] =
      columnX[d - 1] +
      columnMaxWidth[d - 1] +
      cfg.horizontalGap +
      cfg.columnPadding;
  }

  let yCursor = 0;

  function layoutSubtree(node: ThoughtNode): number {
    const depth = depthOf.get(node.id) ?? 0;
    const kids = visibleKids(node.id);
    const x = columnX[depth];

    if (kids.length === 0) {
      const y = yCursor;
      yCursor += cfg.verticalGap;
      positions.set(node.id, { id: node.id, x, y });
      return y;
    }

    const childYs = kids.map((child) => layoutSubtree(child));
    // 자식들 사이 최소 간격 보장 후 부모는 중앙
    const y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    positions.set(node.id, { id: node.id, x, y });
    return y;
  }

  for (const root of roots) {
    if (hidden.has(root.id)) continue;
    layoutSubtree(root);
    yCursor += cfg.verticalGap * 0.35;
  }

  // 세로 배치: 앵커 Y 고정(접기/펼침 안정) → 없으면 캔버스 중앙
  const ys = [...positions.values()].map((p) => p.y);
  if (ys.length > 0) {
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const anchorId = options.anchorId ?? null;
    const anchorY = options.anchorY;
    const anchor = anchorId ? positions.get(anchorId) : undefined;

    let offset = 0;
    if (anchor && typeof anchorY === 'number' && Number.isFinite(anchorY)) {
      // 접은/펼친 노드(또는 루트)는 제자리 — 주변만 미끄러지듯 재배치
      offset = anchorY - anchor.y;
    } else {
      const targetCenter = canvasH / 2;
      const currentCenter = (minY + maxY) / 2;
      offset = targetCenter - currentCenter;
    }

    // 위쪽 잘림 방지 (과도한 점프는 막되, 살짝만 보정)
    if (minY + offset < 24) {
      offset = 24 - minY;
    }

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

/** 조상 경로 + 선택 노드 + 직계 자식 (포커스 dim 기준) */
export function getFocusNodeIds(
  selectedId: string | null,
  nodes: ThoughtNode[],
): Set<string> {
  const focus = getActivePathNodeIds(selectedId, nodes);
  if (!selectedId) return focus;

  for (const node of nodes) {
    if (node.parentId === selectedId && !node.inInbox) {
      focus.add(node.id);
    }
  }
  return focus;
}

/** 조상 경로 엣지 + 직계 자식 엣지 */
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

  for (const edge of edges) {
    if (edge.sourceId === selectedId) active.add(edge.id);
  }

  return active;
}
