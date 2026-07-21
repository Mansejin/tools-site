import { memo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ThoughtDirection } from '../types';
import { CATEGORY_LABELS } from '../types';
import { useThoughtStore } from '../store/useThoughtStore';

export type ThoughtNodeData = {
  thought: { id: string; title: string; depth: number; category: string; importance: number };
  dimmed: boolean;
  selected: boolean;
  isMobile: boolean;
  isEditing: boolean;
};

function truncate(text: string, max = 18): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function ThoughtNodeComponent({ data }: NodeProps & { data: ThoughtNodeData }) {
  const { thought, dimmed, selected, isMobile, isEditing } = data;
  const updateNode = useThoughtStore((s) => s.updateNode);
  const addConnectedThought = useThoughtStore((s) => s.addConnectedThought);
  const selectNode = useThoughtStore((s) => s.selectNode);
  const setEditingNodeId = useThoughtStore((s) => s.setEditingNodeId);

  const [draft, setDraft] = useState(thought.title);
  const expanded = isMobile ? isEditing || selected : selected;
  const isCore = thought.category === 'value' || thought.importance >= 0.9;

  useEffect(() => {
    setDraft(thought.title);
  }, [thought.title]);

  const commitTitle = () => {
    const trimmed = draft.trim() || '새 생각';
    if (trimmed !== thought.title) updateNode(thought.id, { title: trimmed });
    setDraft(trimmed);
  };

  const handleAdd = (e: React.MouseEvent, direction: ThoughtDirection) => {
    e.stopPropagation();
    const newId = addConnectedThought(thought.id, direction, '새 생각');
    selectNode(newId);
    setEditingNodeId(newId);
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(thought.id);
    if (isMobile) setEditingNodeId(thought.id);
  };

  if (isMobile) {
    return (
      <div className={`thought-node-wrap mobile ${expanded ? 'expanded' : 'compact'}`}>
        <div
          className={`thought-node mobile-node ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${isCore ? 'is-core' : ''}`}
          onClick={handleNodeClick}
          role="button"
          tabIndex={0}
        >
          <Handle type="target" position={Position.Left} className="thought-handle" />
          {expanded ? (
            <input
              className="mobile-node-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitTitle();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus={isEditing}
            />
          ) : (
            <span className="mobile-node-label">{truncate(thought.title, 22)}</span>
          )}
          <Handle type="source" position={Position.Right} className="thought-handle" />
        </div>

        <div className="node-add-rail" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="add-btn add-up" onClick={(e) => handleAdd(e, 'up')} aria-label="위로 추가">
            +
          </button>
          <span className="add-line-v" />
          <button type="button" className="add-btn add-right" onClick={(e) => handleAdd(e, 'center')} aria-label="깊게 추가">
            +
          </button>
          <span className="add-line-v" />
          <button type="button" className="add-btn add-down" onClick={(e) => handleAdd(e, 'down')} aria-label="아래로 추가">
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="thought-node-wrap desktop">
      <div
        className={`thought-node ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${isCore ? 'is-core' : ''}`}
      >
        <Handle type="target" position={Position.Left} className="thought-handle" />
        <div className={`thought-node-category ${isCore ? 'accent' : ''}`}>
          {CATEGORY_LABELS[thought.category as keyof typeof CATEGORY_LABELS]}
        </div>
        <div className="thought-node-title">{thought.title}</div>
        {thought.importance >= 0.9 && <span className="importance-badge">중요</span>}
        <Handle type="source" position={Position.Right} className="thought-handle" />
      </div>

      <div className="node-add-rail desktop-rail" onClick={(e) => e.stopPropagation()}>
        <span className="add-line-h" />
        <button type="button" className="add-btn add-right" onClick={(e) => handleAdd(e, 'center')} aria-label="깊게 추가">
          +
        </button>
      </div>
    </div>
  );
}

export default memo(ThoughtNodeComponent);
