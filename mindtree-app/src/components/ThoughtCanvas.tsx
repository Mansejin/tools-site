import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  buildChildrenMap,
  computeLayout,
  countDescendants,
  getActiveEdgeIds,
  getActivePathNodeIds,
  getHiddenDescendantIds,
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
  const initialViewportSet = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ThoughtNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const placedNodes = useMemo(
    () => map.nodes.filter((n) => !n.inInbox),
    [map.nodes],
  );

  const childrenMap = useMemo(() => buildChildrenMap(placedNodes), [placedNodes]);

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

  const activeEdgeIds = useMemo(
    () => getActiveEdgeIds(selectedNodeId, placedNodes, treeEdges),
    [selectedNodeId, placedNodes, treeEdges],
  );

  const activePathNodeIds = useMemo(
    () => getActivePathNodeIds(selectedNodeId, placedNodes),
    [selectedNodeId, placedNodes],
  );

  const layout = useMemo(
    () => computeLayout(placedNodes, isMobile, collapsedIds),
    [placedNodes, isMobile, collapsedIds],
  );

  useEffect(() => {
    const flowNodes: Node<ThoughtNodeData>[] = visibleNodes.map((thought) => {
      const pos = layout.get(thought.id) ?? { x: 0, y: 0 };
      const dimmed = selectedNodeId ? !activePathNodeIds.has(thought.id) : false;
      const kids = childrenMap.get(thought.id) ?? [];

      return {
        id: thought.id,
        type: 'thought',
        position: { x: pos.x, y: pos.y },
        data: {
          thought,
          dimmed,
          selected: thought.id === selectedNodeId,
          isEditing: thought.id === editingNodeId,
          isRoot: !thought.parentId || !placedIds.has(thought.parentId),
          childCount: kids.length,
          descendantCount: countDescendants(thought.id, childrenMap),
          collapsed: collapsedSet.has(thought.id),
        },
        draggable: false,
      };
    });
    setNodes(flowNodes);
  }, [
    visibleNodes,
    layout,
    selectedNodeId,
    editingNodeId,
    activePathNodeIds,
    placedIds,
    childrenMap,
    collapsedSet,
    setNodes,
  ]);

  useEffect(() => {
    const flowEdges: Edge[] = treeEdges.map((edge) => {
      const active = activeEdgeIds.has(edge.id);
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'smoothstep',
        pathOptions: { borderRadius: 12, offset: 4 },
        style: {
          stroke: active ? 'rgba(224, 122, 58, 0.7)' : 'rgba(200, 190, 180, 0.35)',
          strokeWidth: active ? 1.5 : 1,
        },
        animated: active,
      };
    });
    setEdges(flowEdges);
  }, [treeEdges, activeEdgeIds, setEdges]);

  useEffect(() => {
    if (!initialViewportSet.current) {
      setViewport({ x: isMobile ? 20 : 40, y: isMobile ? 60 : 40, zoom: 1 });
      initialViewportSet.current = true;
    }
  }, [isMobile, setViewport]);

  useEffect(() => {
    initialViewportSet.current = false;
  }, [map.id]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
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
    <div className="thought-canvas neural-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        minZoom={0.5}
        maxZoom={2}
        panOnScroll
        nodesDraggable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <ViewportBoundary />
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
