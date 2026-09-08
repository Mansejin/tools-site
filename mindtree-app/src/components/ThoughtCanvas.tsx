import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ThoughtNodeComponent, { type ThoughtNodeData } from './ThoughtNodeComponent';
import ViewportBoundary from './ViewportBoundary';
import { useThoughtStore } from '../store/useThoughtStore';
import {
  ROOT_SIZE,
  ROOT_SIZE_MOBILE,
  buildChildrenMap,
  computeLayout,
  countDescendants,
  getActiveEdgeIds,
  getFocusNodeIds,
  getHiddenDescendantIds,
  isRootNode,
} from '../lib/layout';
import { useIsMobile } from '../hooks/useIsMobile';

const nodeTypes = { thought: ThoughtNodeComponent };

function CanvasInner() {
  const map = useThoughtStore((s) => s.map);
  const selectedNodeId = useThoughtStore((s) => s.selectedNodeId);
  const editingNodeId = useThoughtStore((s) => s.editingNodeId);
  const collapsedIds = useThoughtStore((s) => s.collapsedIds);
  const selectNode = useThoughtStore((s) => s.selectNode);
  const setEditingNodeId = useThoughtStore((s) => s.setEditingNodeId);
  const isMobile = useIsMobile();
  const { setViewport } = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 640 });
  const prevRootCollapsed = useRef<boolean | null>(null);
  const prevVisibleIds = useRef<Set<string>>(new Set());
  const prevEdgeIds = useRef<Set<string>>(new Set());
  const prevCollapsedIds = useRef<string[]>([]);
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const layoutAnchor = useRef<{ id: string; y: number } | null>(null);
  const [enteringNodeIds, setEnteringNodeIds] = useState<Set<string>>(() => new Set());
  const [enteringEdgeIds, setEnteringEdgeIds] = useState<Set<string>>(() => new Set());
  const [rootBlooming, setRootBlooming] = useState(false);
  const enterClearTimer = useRef<number | null>(null);
  const edgeClearTimer = useRef<number | null>(null);
  const bloomTimer = useRef<number | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ThoughtNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const placedNodes = useMemo(
    () => map.nodes.filter((n) => !n.inInbox),
    [map.nodes],
  );

  const childrenMap = useMemo(() => buildChildrenMap(placedNodes), [placedNodes]);
  const byId = useMemo(() => new Map(placedNodes.map((n) => [n.id, n])), [placedNodes]);

  const rootNode = useMemo(
    () => placedNodes.find((n) => isRootNode(n, byId)) ?? null,
    [placedNodes, byId],
  );

  const rootCollapsed = !!(rootNode && collapsedIds.includes(rootNode.id));

  const hiddenIds = useMemo(
    () => getHiddenDescendantIds(placedNodes, collapsedIds),
    [placedNodes, collapsedIds],
  );

  const visibleNodes = useMemo(
    () => placedNodes.filter((n) => !hiddenIds.has(n.id)),
    [placedNodes, hiddenIds],
  );

  const placedIds = useMemo(() => new Set(placedNodes.map((n) => n.id)), [placedNodes]);
  const collapsedSet = useMemo(() => new Set(collapsedIds), [collapsedIds]);

  const treeEdges = useMemo(
    () =>
      map.edges.filter((e) => {
        const src = map.nodes.find((n) => n.id === e.sourceId);
        const tgt = map.nodes.find((n) => n.id === e.targetId);
        return (
          src &&
          tgt &&
          !src.inInbox &&
          !tgt.inInbox &&
          tgt.parentId === src.id &&
          !hiddenIds.has(src.id) &&
          !hiddenIds.has(tgt.id)
        );
      }),
    [map.edges, map.nodes, hiddenIds],
  );

  const focusSelectedId =
    selectedNodeId && rootNode && selectedNodeId === rootNode.id
      ? null
      : selectedNodeId;

  const activeEdgeIds = useMemo(
    () => getActiveEdgeIds(focusSelectedId, placedNodes, treeEdges),
    [focusSelectedId, placedNodes, treeEdges],
  );

  const focusNodeIds = useMemo(
    () => getFocusNodeIds(focusSelectedId, placedNodes),
    [focusSelectedId, placedNodes],
  );

  const layout = useMemo(() => {
    const prev = new Set(prevCollapsedIds.current);
    const next = new Set(collapsedIds);
    let toggledId: string | null = null;
    for (const id of next) {
      if (!prev.has(id)) {
        toggledId = id;
        break;
      }
    }
    if (!toggledId) {
      for (const id of prev) {
        if (!next.has(id)) {
          toggledId = id;
          break;
        }
      }
    }

    let anchorId: string | null = null;
    let anchorY: number | null = null;

    if (!rootCollapsed) {
      if (toggledId && prevPositions.current.has(toggledId)) {
        anchorId = toggledId;
        anchorY = prevPositions.current.get(toggledId)!.y;
      } else if (layoutAnchor.current) {
        anchorId = layoutAnchor.current.id;
        anchorY = layoutAnchor.current.y;
      } else if (rootNode && prevPositions.current.has(rootNode.id)) {
        anchorId = rootNode.id;
        anchorY = prevPositions.current.get(rootNode.id)!.y;
      }
    }

    return {
      positions: computeLayout(placedNodes, {
        mobile: isMobile,
        collapsedIds,
        selectedId: selectedNodeId,
        canvasWidth: canvasSize.w,
        canvasHeight: canvasSize.h,
        anchorId,
        anchorY,
      }),
      toggledId,
    };
  }, [
    placedNodes,
    isMobile,
    collapsedIds,
    selectedNodeId,
    canvasSize,
    rootCollapsed,
    rootNode,
  ]);

  const positions = layout.positions;

  // 앵커/이전 좌표는 레이아웃 확정 후 커밋 (Strict Mode 안전)
  useEffect(() => {
    prevCollapsedIds.current = [...collapsedIds];
    prevPositions.current = new Map(
      [...positions.entries()].map(([id, p]) => [id, { x: p.x, y: p.y }]),
    );

    const toggledId = layout.toggledId;
    if (toggledId && positions.has(toggledId)) {
      const tp = positions.get(toggledId)!;
      layoutAnchor.current = { id: toggledId, y: tp.y };
    } else if (rootNode && positions.has(rootNode.id) && !rootCollapsed) {
      const rp = positions.get(rootNode.id)!;
      layoutAnchor.current = { id: rootNode.id, y: rp.y };
    }
  }, [positions, collapsedIds, layout.toggledId, rootNode, rootCollapsed]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setCanvasSize({ w: Math.max(320, r.width), h: Math.max(240, r.height) });
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 새로 나타난 노드/엣지 → 신경망 퍼짐 애니메이션
  useEffect(() => {
    const nextIds = new Set(visibleNodes.map((n) => n.id));
    const prev = prevVisibleIds.current;
    const booting = prev.size === 0;

    if (!booting) {
      const fresh: string[] = [];
      for (const id of nextIds) {
        if (!prev.has(id)) fresh.push(id);
      }
      if (fresh.length > 0) {
        setEnteringNodeIds(new Set(fresh));
        const maxDepth = Math.max(
          0,
          ...fresh.map((id) => byId.get(id)?.depth ?? 0),
        );
        if (enterClearTimer.current) window.clearTimeout(enterClearTimer.current);
        enterClearTimer.current = window.setTimeout(
          () => setEnteringNodeIds(new Set()),
          820 + maxDepth * 70,
        );
      }
    }

    prevVisibleIds.current = nextIds;
    return () => {
      if (enterClearTimer.current) window.clearTimeout(enterClearTimer.current);
    };
  }, [visibleNodes, byId]);

  useEffect(() => {
    const nextIds = new Set(treeEdges.map((e) => e.id));
    const prev = prevEdgeIds.current;
    const booting = prev.size === 0;

    if (!booting) {
      const fresh: string[] = [];
      for (const id of nextIds) {
        if (!prev.has(id)) fresh.push(id);
      }
      if (fresh.length > 0) {
        setEnteringEdgeIds(new Set(fresh));
        if (edgeClearTimer.current) window.clearTimeout(edgeClearTimer.current);
        edgeClearTimer.current = window.setTimeout(
          () => setEnteringEdgeIds(new Set()),
          1100,
        );
      }
    }

    prevEdgeIds.current = nextIds;
    return () => {
      if (edgeClearTimer.current) window.clearTimeout(edgeClearTimer.current);
    };
  }, [treeEdges]);

  useEffect(() => {
    const rootPx = isMobile ? ROOT_SIZE_MOBILE : ROOT_SIZE;
    const flowNodes: Node<ThoughtNodeData>[] = visibleNodes.map((thought) => {
      const pos = positions.get(thought.id) ?? { x: 0, y: 0 };
      const root = isRootNode(thought, byId);
      const dimmed =
        !!focusSelectedId && !root && !focusNodeIds.has(thought.id);
      const kids = childrenMap.get(thought.id) ?? [];
      const entering = enteringNodeIds.has(thought.id);
      const delay = Math.min(thought.depth, 8) * 48;

      return {
        id: thought.id,
        type: 'thought',
        position: { x: pos.x, y: pos.y },
        ...(root ? { width: rootPx, height: rootPx } : {}),
        className: [
          entering ? 'neural-entering' : '',
          root ? 'is-root-node' : '',
        ]
          .filter(Boolean)
          .join(' '),
        data: {
          thought,
          dimmed,
          selected: !root && thought.id === selectedNodeId,
          isEditing: !root && thought.id === editingNodeId,
          isRoot: root,
          childCount: kids.length,
          descendantCount: countDescendants(thought.id, childrenMap),
          collapsed: collapsedSet.has(thought.id),
          blooming: root && rootBlooming,
        },
        draggable: false,
        selectable: !root,
        style: {
          // 위치 이동은 CSS transition — 접기/펼침 시 미끄러지듯
          ...(entering
            ? ({
                transition: 'none',
                ['--neural-delay']: `${delay}ms`,
              } as CSSProperties)
            : {
                transition: 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
              }),
        },
      };
    });
    setNodes(flowNodes);
  }, [
    visibleNodes,
    positions,
    selectedNodeId,
    editingNodeId,
    focusSelectedId,
    focusNodeIds,
    placedIds,
    childrenMap,
    collapsedSet,
    byId,
    isMobile,
    enteringNodeIds,
    rootBlooming,
    setNodes,
  ]);

  useEffect(() => {
    const flowEdges: Edge[] = treeEdges.map((edge) => {
      const active = activeEdgeIds.has(edge.id);
      const fromRoot = rootNode && edge.sourceId === rootNode.id;
      const entering = enteringEdgeIds.has(edge.id);
      const target = byId.get(edge.targetId);
      const delay = Math.min(target?.depth ?? 1, 8) * 45;

      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: fromRoot ? 'default' : 'smoothstep',
        pathOptions: fromRoot ? undefined : { borderRadius: 14, offset: 6 },
        style: {
          stroke: active
            ? 'rgba(224, 122, 58, 0.72)'
            : 'rgba(150, 138, 126, 0.48)',
          strokeWidth: active ? 2 : fromRoot ? 1.45 : 1.2,
          ...(entering
            ? ({ ['--neural-delay']: `${delay}ms` } as CSSProperties)
            : {}),
        },
        animated: false,
        className: [
          fromRoot ? 'neural-root-edge' : '',
          entering ? 'neural-entering' : '',
        ]
          .filter(Boolean)
          .join(' '),
      };
    });
    setEdges(flowEdges);
  }, [treeEdges, activeEdgeIds, rootNode, enteringEdgeIds, byId, setEdges]);

  // 루트 접기/펼치기 시 뷰포트 + 펼칠 때 리플
  useEffect(() => {
    if (prevRootCollapsed.current === null) {
      prevRootCollapsed.current = rootCollapsed;
      setViewport(
        rootCollapsed
          ? { x: 0, y: 0, zoom: 1 }
          : { x: isMobile ? 8 : 16, y: 20, zoom: 1 },
      );
      return;
    }
    if (prevRootCollapsed.current === rootCollapsed) return;
    const wasCollapsed = prevRootCollapsed.current;
    prevRootCollapsed.current = rootCollapsed;

    if (wasCollapsed && !rootCollapsed) {
      setRootBlooming(true);
      if (bloomTimer.current) window.clearTimeout(bloomTimer.current);
      bloomTimer.current = window.setTimeout(() => setRootBlooming(false), 1000);
    }

    setViewport(
      rootCollapsed
        ? { x: 0, y: 0, zoom: 1 }
        : { x: isMobile ? 8 : 16, y: 20, zoom: 1 },
    );
  }, [rootCollapsed, isMobile, setViewport]);

  useEffect(() => {
    prevRootCollapsed.current = null;
    prevVisibleIds.current = new Set();
    prevEdgeIds.current = new Set();
    prevCollapsedIds.current = [];
    prevPositions.current = new Map();
    layoutAnchor.current = null;
  }, [map.id]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const state = useThoughtStore.getState();
      const thought = state.map.nodes.find((n) => n.id === node.id);
      const root =
        !!thought &&
        (!thought.parentId || !state.map.nodes.some((n) => n.id === thought.parentId));

      // 루트는 선택/활성화 대상 아님 (접기·펼치기는 노드 버튼에서만)
      if (root) return;

      if (state.selectedNodeId === node.id) {
        if (state.editingNodeId !== node.id) {
          setEditingNodeId(node.id);
        }
        return;
      }
      selectNode(node.id);
      setEditingNodeId(null);
    },
    [selectNode, setEditingNodeId],
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const state = useThoughtStore.getState();
      const thought = state.map.nodes.find((n) => n.id === node.id);
      const root =
        !!thought &&
        (!thought.parentId || !state.map.nodes.some((n) => n.id === thought.parentId));
      if (root) return;
      selectNode(node.id);
      setEditingNodeId(node.id);
    },
    [selectNode, setEditingNodeId],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setEditingNodeId(null);
  }, [selectNode, setEditingNodeId]);

  return (
    <div
      className={`thought-canvas neural-canvas ${rootCollapsed ? 'root-collapsed' : 'root-expanded'}`}
      ref={canvasRef}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        minZoom={0.4}
        maxZoom={2.2}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        panOnScroll={false}
        panOnDrag
        preventScrolling
        nodesDraggable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <ViewportBoundary relaxed={rootCollapsed} />
      </ReactFlow>
    </div>
  );
}

export default function ThoughtCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
