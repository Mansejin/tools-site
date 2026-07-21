import { useCallback, useEffect, useMemo } from 'react';
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
import { useThoughtStore } from '../store/useThoughtStore';
import { computeLayout, getAdjacentNodeIds } from '../lib/layout';
import { useIsMobile } from '../hooks/useIsMobile';

const nodeTypes = { thought: ThoughtNodeComponent };

function CanvasInner() {
  const map = useThoughtStore((s) => s.map);
  const selectedNodeId = useThoughtStore((s) => s.selectedNodeId);
  const calmMode = useThoughtStore((s) => s.calmMode);
  const selectNode = useThoughtStore((s) => s.selectNode);
  const setMobileTab = useThoughtStore((s) => s.setMobileTab);
  const isMobile = useIsMobile();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ThoughtNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const placedNodes = useMemo(
    () => map.nodes.filter((n) => !n.inInbox),
    [map.nodes],
  );

  const adjacentIds = useMemo(() => {
    if (!calmMode || !selectedNodeId) return null;
    return getAdjacentNodeIds(selectedNodeId, placedNodes, map.edges);
  }, [calmMode, selectedNodeId, placedNodes, map.edges]);

  const layout = useMemo(() => computeLayout(placedNodes, isMobile), [placedNodes, isMobile]);

  useEffect(() => {
    const flowNodes: Node<ThoughtNodeData>[] = placedNodes.map((thought) => {
      const pos = layout.get(thought.id) ?? { x: 0, y: 0 };
      const dimmed = adjacentIds ? !adjacentIds.has(thought.id) : false;
      return {
        id: thought.id,
        type: 'thought',
        position: { x: pos.x, y: pos.y },
        data: { thought, dimmed, selected: thought.id === selectedNodeId },
        draggable: false,
      };
    });
    setNodes(flowNodes);
  }, [placedNodes, layout, adjacentIds, selectedNodeId, setNodes]);

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
        return {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          type: 'smoothstep',
          animated: edge.relation === 'implies',
          label: edge.label || undefined,
          style: {
            stroke: dimmed ? '#ebe6df' : '#d4cdc4',
            strokeWidth: dimmed ? 1 : 1.5,
            opacity: dimmed ? 0.4 : 0.9,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: dimmed ? '#ebe6df' : '#c4bcb2',
          },
        };
      });
    setEdges(flowEdges);
  }, [map.edges, map.nodes, adjacentIds, selectedNodeId, setEdges]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: isMobile ? 0.15 : 0.3, duration: 300 }), 80);
    return () => clearTimeout(t);
  }, [layout, isMobile, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      if (isMobile) setMobileTab('edit');
    },
    [selectNode, isMobile, setMobileTab],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

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
        fitView
        fitViewOptions={{ padding: isMobile ? 0.15 : 0.3 }}
        minZoom={isMobile ? 0.2 : 0.3}
        maxZoom={2}
        panOnScroll={!isMobile}
        proOptions={{ hideAttribution: true }}
      >
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
