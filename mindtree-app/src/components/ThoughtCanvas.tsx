import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ThoughtNodeComponent, { type ThoughtNodeData } from './ThoughtNodeComponent';
import { useThoughtStore } from '../store/useThoughtStore';
import { computeLayout, getAdjacentNodeIds } from '../lib/layout';
import { CATEGORY_COLORS } from '../types';

const nodeTypes = { thought: ThoughtNodeComponent };

export default function ThoughtCanvas() {
  const map = useThoughtStore((s) => s.map);
  const selectedNodeId = useThoughtStore((s) => s.selectedNodeId);
  const calmMode = useThoughtStore((s) => s.calmMode);
  const selectNode = useThoughtStore((s) => s.selectNode);

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

  const layout = useMemo(() => computeLayout(placedNodes), [placedNodes]);

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
            stroke: dimmed ? '#2a221c' : '#5a4a3a',
            strokeWidth: dimmed ? 1 : 1.5,
            opacity: dimmed ? 0.25 : 0.8,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: dimmed ? '#2a221c' : '#8a7260',
          },
        };
      });
    setEdges(flowEdges);
  }, [map.edges, map.nodes, adjacentIds, selectedNodeId, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
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
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2a221c" gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as ThoughtNodeData | undefined;
            return data ? CATEGORY_COLORS[data.thought.category] : '#4a5f7a';
          }}
          maskColor="rgba(15, 18, 26, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
