import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ThoughtNode } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';

export type ThoughtNodeData = {
  thought: ThoughtNode;
  dimmed: boolean;
  selected: boolean;
};

function ThoughtNodeComponent({ data }: NodeProps & { data: ThoughtNodeData }) {
  const { thought, dimmed, selected } = data;
  const color = CATEGORY_COLORS[thought.category];

  return (
    <div
      className={`thought-node ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Left} className="thought-handle" />
      <div className="thought-node-category" style={{ color }}>
        {CATEGORY_LABELS[thought.category]}
      </div>
      <div className="thought-node-title">{thought.title}</div>
      <div className="thought-node-meta">
        깊이 {thought.depth}
        {thought.importance >= 0.9 && <span className="importance-badge">중요</span>}
      </div>
      <Handle type="source" position={Position.Right} className="thought-handle" />
    </div>
  );
}

export default memo(ThoughtNodeComponent);
