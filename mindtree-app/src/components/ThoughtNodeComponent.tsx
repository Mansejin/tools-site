import { memo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useThoughtStore } from '../store/useThoughtStore';

export type ThoughtNodeData = {
  thought: { id: string; title: string; depth: number; importance: number };
  dimmed: boolean;
  selected: boolean;
  isEditing: boolean;
  isRoot: boolean;
};

function ThoughtNodeComponent({ data }: NodeProps & { data: ThoughtNodeData }) {
  const { thought, dimmed, selected, isEditing, isRoot } = data;
  const updateNode = useThoughtStore((s) => s.updateNode);
  const addConnectedThought = useThoughtStore((s) => s.addConnectedThought);
  const deleteNode = useThoughtStore((s) => s.deleteNode);
  const selectNode = useThoughtStore((s) => s.selectNode);
  const setEditingNodeId = useThoughtStore((s) => s.setEditingNodeId);

  const [draft, setDraft] = useState(thought.title);

  useEffect(() => {
    setDraft(thought.title);
  }, [thought.title]);

  const commitTitle = () => {
    const trimmed = draft.trim() || '새 생각';
    if (trimmed !== thought.title) updateNode(thought.id, { title: trimmed });
    setDraft(trimmed);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(thought.id);
    setEditingNodeId(thought.id);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = addConnectedThought(thought.id, 'center', '새 생각');
    selectNode(newId);
    setEditingNodeId(newId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(thought.id);
  };

  return (
    <div className={`neural-wrap ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}>
      <Handle type="target" position={Position.Left} className="neural-handle" />
      <button
        type="button"
        className={`neural-node ${isRoot ? 'root' : ''} ${selected ? 'active' : ''}`}
        onClick={handleClick}
      >
        {isEditing && selected ? (
          <input
            className="neural-input"
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
            autoFocus
          />
        ) : (
          <span className="neural-label">{thought.title}</span>
        )}
      </button>
      {selected && (
        <>
          <button type="button" className="neural-add" onClick={handleAdd} aria-label="연결 추가">
            +
          </button>
          {!isRoot && (
            <button type="button" className="neural-delete" onClick={handleDelete} aria-label="삭제">
              ×
            </button>
          )}
        </>
      )}
      <Handle type="source" position={Position.Right} className="neural-handle" />
    </div>
  );
}

export default memo(ThoughtNodeComponent);
