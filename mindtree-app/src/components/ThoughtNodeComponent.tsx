import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useThoughtStore } from '../store/useThoughtStore';

export type ThoughtNodeData = {
  thought: { id: string; title: string; depth: number; importance: number };
  dimmed: boolean;
  selected: boolean;
  isEditing: boolean;
  isRoot: boolean;
  childCount: number;
  descendantCount: number;
  collapsed: boolean;
  blooming?: boolean;
};

function ThoughtNodeComponent({ data }: NodeProps & { data: ThoughtNodeData }) {
  const {
    thought,
    dimmed,
    selected,
    isEditing,
    isRoot,
    childCount,
    descendantCount,
    collapsed,
    blooming,
  } = data;
  const updateNode = useThoughtStore((s) => s.updateNode);
  const selectNode = useThoughtStore((s) => s.selectNode);
  const setEditingNodeId = useThoughtStore((s) => s.setEditingNodeId);
  const toggleCollapse = useThoughtStore((s) => s.toggleCollapse);
  const addConnectedThought = useThoughtStore((s) => s.addConnectedThought);
  const deleteNode = useThoughtStore((s) => s.deleteNode);

  const [draft, setDraft] = useState(thought.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);
  const hasChildren = childCount > 0;

  // 루트: 펼쳐져 있을 때만 + (선택 여부 무관). 접힌 센터에서는 숨김
  // 일반: 선택 + 비편집일 때만
  const showControls = isRoot
    ? !collapsed
    : selected && !isEditing;

  // 루트는 접힘 카운트 숨김. 일반 노드는 선택 중이 아닐 때만 ▾ (접힌 채 선택이면 펼치기용)
  const showFold =
    !isRoot && hasChildren && !isEditing && (!selected || collapsed);

  useEffect(() => {
    setDraft(thought.title);
  }, [thought.title]);

  useEffect(() => {
    if (!isEditing || !selected || isRoot) return;
    setDraft(thought.title);
    skipBlurRef.current = true;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      skipBlurRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [isEditing, selected, thought.id, isRoot]);

  const commitTitle = () => {
    const trimmed = draft.trim() || '새 생각';
    if (trimmed !== thought.title) updateNode(thought.id, { title: trimmed });
    setDraft(trimmed);
    setEditingNodeId(null);
  };

  const startEditing = () => {
    if (isRoot) return;
    selectNode(thought.id);
    setEditingNodeId(thought.id);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 루트: 선택/활성화 없음 — 접기·펼치기만 (선택 디밍·링과 충돌 방지)
    if (isRoot) {
      toggleCollapse(thought.id);
      setEditingNodeId(null);
      if (useThoughtStore.getState().selectedNodeId === thought.id) {
        selectNode(null);
      }
      return;
    }
    if (selected && !isEditing) {
      startEditing();
      return;
    }
    selectNode(thought.id);
    setEditingNodeId(null);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 루트는 더블클릭으로 토글하지 않음 — click이 두 번 + dblclick이 겹치면 상태가 뒤집힘
    if (isRoot) {
      e.preventDefault();
      return;
    }
    startEditing();
  };

  const handleFold = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(thought.id);
    setEditingNodeId(null);
    toggleCollapse(thought.id);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = addConnectedThought(thought.id, 'center', '새 생각');
    selectNode(newId);
    setEditingNodeId(newId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRoot) return;
    if (descendantCount > 0) {
      const ok = window.confirm(
        `하위 생각 ${descendantCount}개도 함께 삭제됩니다.\n삭제할까요? (Ctrl+Z로 되돌릴 수 있어요)`,
      );
      if (!ok) return;
    }
    deleteNode(thought.id);
  };

  return (
    <div
      className={`neural-wrap ${isRoot ? 'is-root' : ''} ${!isRoot && selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${collapsed ? 'is-collapsed' : ''} ${isEditing ? 'is-editing' : ''} ${blooming ? 'is-blooming' : ''}`}
    >
      {!isRoot && <Handle type="target" position={Position.Left} className="neural-handle" />}
      <div
        className={`neural-node ${isRoot ? 'root' : ''} ${!isRoot && selected ? 'active' : ''} ${showControls ? 'with-controls' : ''} ${blooming ? 'is-blooming' : ''}`}
      >
        <div className="neural-node-body">
          {isEditing && selected && !isRoot ? (
            <input
              ref={inputRef}
              className="neural-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (skipBlurRef.current) return;
                commitTitle();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTitle();
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === 'Escape') {
                  setDraft(thought.title);
                  setEditingNodeId(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              className="neural-node-main"
              onClick={handleSelect}
              onDoubleClick={handleEdit}
              title={isRoot ? (collapsed ? '펼치기' : '접기') : undefined}
            >
              <span className="neural-label">{thought.title}</span>
            </button>
          )}
          {showFold && (
            <button
              type="button"
              className={`neural-fold-badge ${collapsed ? 'collapsed' : ''}`}
              aria-label={collapsed ? '하위 펼치기' : '하위 접기'}
              title={collapsed ? '펼치기' : '접기'}
              onClick={handleFold}
            >
              {collapsed ? descendantCount : '▾'}
            </button>
          )}
        </div>

        {showControls && (
          <div className="neural-node-controls" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="neural-ctrl neural-ctrl-add"
              onClick={handleAdd}
              aria-label="하위 추가"
              title="하위 추가"
            >
              +
            </button>
            {!isRoot && (
              <button
                type="button"
                className="neural-ctrl neural-ctrl-del"
                onClick={handleDelete}
                aria-label="삭제"
                title="삭제"
              >
                −
              </button>
            )}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={isRoot ? Position.Right : Position.Right}
        className={`neural-handle ${isRoot ? 'neural-handle-root' : ''}`}
        style={isRoot ? { top: '50%', right: 0 } : undefined}
      />
    </div>
  );
}

export default memo(ThoughtNodeComponent);
