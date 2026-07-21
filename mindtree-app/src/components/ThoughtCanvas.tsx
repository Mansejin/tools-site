import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ThoughtNodeComponent, { type ThoughtNodeData } from './ThoughtNodeComponent';
import ViewportBoundary from './ViewportBoundary';
import { useThoughtStore } from '../store/useThoughtStore';
import { computeLayout, getAdjacentNodeIds } from '../lib/layout';
import { useIsMobile } from '../hooks/useIsMobile';

const nodeTypes = { thought: ThoughtNodeComponent };

function CanvasInner() {
  const map = useThoughtStore((s) => s.map);
  const selectedNodeId = useThoughtStore((s) => s.selectedNodeId);
  const editingNodeId = useThoughtStore((s) => s.editingNodeId);
  const calmMode = useThoughtStore((s) => s.calmMode);
  const selectNode = useThoughtStore((s) => s.selectNode);
  const setEditingNodeId = useThoughtStore((s) => s.setEditingNodeId);
  const isMobile = useIsMobile();
  const { fitView, setViewport } = useReactFlow();
  const initialViewportSet = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ThoughtNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const placedNodes = useMemo(
    () => map.nodes.filter((n) => !n.inInbox),
    [map.nodes],
  );

  const adjacentIds = useMemo(() => {
    if (isMobile || !calmMode || !selectedNodeId) return null;
    return getAdjacentNodeIds(selectedNodeId, placedNodes, map.edges);
  }, [isMobile, calmMode, selectedNodeId, placedNodes, map.edges]);

  const layout = useMemo(() => computeLayout(placedNodes, isMobile), [placedNodes, isMobile]);

  useEffect(() => {
    const flowNodes: Node<ThoughtNodeData>[] = placedNodes.map((thought) => {
      const pos = layout.get(thought.id) ?? { x: 0, y: 0 };
      const dimmed = adjacentIds ? !adjacentIds.has(thought.id) : false;
      return {
        id: thought.id,
        type: 'thought',
        position: { x: pos.x, y: pos.y },
        data: {
          thought,
          dimmed,
          selected: thought.id === selectedNodeId,
          isMobile,
          isEditing: thought.id === editingNodeId,
        },
        draggable: false,
      };
    });
    setNodes(flowNodes);
  }, [placedNodes, layout, adjacentIds, selectedNodeId, editingNodeId, isMobile, setNodes]);

  useEffect(() => {
    const flowEdges: Edge[] = map.edges
      .filter((e) => {
        const src = map.nodes.find((n) => n.id === e.sourceId);
        const tgt = map.nodes.find((n) => n.id === e.targetId);
        return src && tgt && !src.inInbox && !tgt.inInbox;
      })
      .map((edge) => {
        const dimmed =
          adjacentIds &&
          selectedNodeId &&
          !(adjacentIds.has(edge.sourceId) && adjacentIds.has(edge.targetId));
        const mobileFaint = isMobile;
        return {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          type: 'smoothstep',
          animated: !isMobile && edge.relation === 'implies',
          label: edge.label || undefined,
          style: {
            stroke: mobileFaint ? '#ebe6df' : dimmed ? '#ebe6df' : '#d4cdc4',
            strokeWidth: mobileFaint ? 1 : dimmed ? 1 : 1.5,
            opacity: mobileFaint ? 0.35 : dimmed ? 0.35 : 0.85,
          },
          markerEnd: isMobile
            ? undefined
            : {
                type: MarkerType.ArrowClosed,
                color: dimmed ? '#ebe6df' : '#c4bcb2',
                width: 16,
                height: 16,
              },
        };
      });
    setEdges(flowEdges);
  }, [map.edges, map.nodes, adjacentIds, selectedNodeId, isMobile, setEdges]);

  useEffect(() => {
    if (isMobile) {
      if (!initialViewportSet.current) {
        setViewport({ x: 24, y: 80, zoom: 1 });
        initialViewportSet.current = true;
      }
      return;
    }
    const t = setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 80);
    return () => clearTimeout(t);
  }, [isMobile, layout, fitView, setViewport]);

  useEffect(() => {
    initialViewportSet.current = false;
  }, [map.id]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      if (isMobile) setEditingNodeId(node.id);
    },
    [selectNode, isMobile, setEditingNodeId],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setEditingNodeId(null);
  }, [selectNode, setEditingNodeId]);

  return (
    <div className="thought-canvas">
      <div className="depth-axis">
        <span>시작</span>
        <div className="depth-line" />
        <span>핵심</span>
        <div className="depth-line" />
        <span>다음</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        minZoom={isMobile ? 0.65 : 0.3}
        maxZoom={isMobile ? 1.4 : 2}
        panOnScroll={!isMobile}
        nodesDraggable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <ViewportBoundary />
        <Background color="#ebe6df" gap={28} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
        {!isMobile && (
          <MiniMap
            nodeColor={() => '#e07a3a'}
            maskColor="rgba(250, 248, 245, 0.85)"
          />
        )}
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
