import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ThoughtNode } from '../types';
import { CATEGORY_LABELS } from '../types';

export type ThoughtNodeData = {
  thought: ThoughtNode;
  dimmed: boolean;
  selected: boolean;
};

function ThoughtNodeComponent({ data }: NodeProps & { data: ThoughtNodeData }) {
  const { thought, dimmed, selected } = data;
  const isCore = thought.category === 'value' || thought.importance >= 0.9;

  return (
    <div
      className={`thought-node ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${isCore ? 'is-core' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="thought-handle" />
      <div className={`thought-node-category ${isCore ? 'accent' : ''}`}>
        {CATEGORY_LABELS[thought.category]}
      </div>
      <div className="thought-node-title">{thought.title}</div>
      {thought.importance >= 0.9 && (
        <span className="importance-badge">중요</span>
      )}
      <Handle type="source" position={Position.Right} className="thought-handle" />
    </div>
  );
}

export default memo(ThoughtNodeComponent);
