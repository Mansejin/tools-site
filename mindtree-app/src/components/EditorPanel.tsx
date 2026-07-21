import { useState } from 'react';
import { useThoughtStore } from '../store/useThoughtStore';
import type { ThoughtCategory, ThoughtDirection } from '../types';
import {
  CATEGORY_LABELS,
  DIRECTION_LABELS,
  RELATION_LABELS,
} from '../types';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ThoughtCategory[];
const DIRECTIONS = Object.keys(DIRECTION_LABELS) as ThoughtDirection[];

type EditorPanelProps = {
  className?: string;
};

export default function EditorPanel({ className = '' }: EditorPanelProps) {
  const map = useThoughtStore((s) => s.map);
  const selectedNodeId = useThoughtStore((s) => s.selectedNodeId);
  const updateNode = useThoughtStore((s) => s.updateNode);
  const deleteNode = useThoughtStore((s) => s.deleteNode);
  const addConnectedThought = useThoughtStore((s) => s.addConnectedThought);

  const node = map.nodes.find((n) => n.id === selectedNodeId);
  const [newTitle, setNewTitle] = useState('');

  if (!node || node.inInbox) {
    return (
      <aside className={`editor-panel empty ${className}`.trim()}>
        <p>생각을 선택하면 편집할 수 있습니다.</p>
        <p className="hint">맵이나 목록 탭에서 노드를 탭하세요.</p>
      </aside>
    );
  }

  const connectedEdges = map.edges.filter(
    (e) => e.sourceId === node.id || e.targetId === node.id,
  );

  return (
    <aside className={`editor-panel ${className}`.trim()}>
      <h2 className="editor-title">생각 편집</h2>

      <label className="field">
        <span>제목</span>
        <input
          type="text"
          value={node.title}
          onChange={(e) => updateNode(node.id, { title: e.target.value })}
        />
      </label>

      <label className="field">
        <span>본문 (Markdown)</span>
        <textarea
          rows={6}
          value={node.body}
          onChange={(e) => updateNode(node.id, { body: e.target.value })}
          placeholder="이 생각에 대한 메모, 인용, 질문..."
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>카테고리</span>
          <select
            value={node.category}
            onChange={(e) => updateNode(node.id, { category: e.target.value as ThoughtCategory })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>방향</span>
          <select
            value={node.direction}
            onChange={(e) => updateNode(node.id, { direction: e.target.value as ThoughtDirection })}
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>{DIRECTION_LABELS[d]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>깊이</span>
          <input
            type="number"
            min={0}
            max={10}
            value={node.depth}
            onChange={(e) => updateNode(node.id, { depth: Number(e.target.value) })}
          />
        </label>

        <label className="field">
          <span>중요도 ({Math.round(node.importance * 100)}%)</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={node.importance}
            onChange={(e) => updateNode(node.id, { importance: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="field">
        <span>태그 (쉼표 구분)</span>
        <input
          type="text"
          value={node.tags.join(', ')}
          onChange={(e) =>
            updateNode(node.id, {
              tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
            })
          }
        />
      </label>

      <div className="create-section">
        <span className="section-label">연결된 생각 추가</span>
        <div className="create-buttons">
          <button type="button" onClick={() => addConnectedThought(node.id, 'up')}>
            ↑ 위로
          </button>
          <button type="button" onClick={() => addConnectedThought(node.id, 'center')}>
            → 깊게
          </button>
          <button type="button" onClick={() => addConnectedThought(node.id, 'down')}>
            ↓ 아래로
          </button>
        </div>
        <div className="quick-create">
          <input
            type="text"
            placeholder="제목과 함께 추가..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) {
                addConnectedThought(node.id, 'center', newTitle.trim());
                setNewTitle('');
              }
            }}
          />
        </div>
      </div>

      {connectedEdges.length > 0 && (
        <div className="connections-section">
          <span className="section-label">연결 ({connectedEdges.length})</span>
          <ul className="connection-list">
            {connectedEdges.map((edge) => {
              const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
              const other = map.nodes.find((n) => n.id === otherId);
              const dir = edge.sourceId === node.id ? '→' : '←';
              return (
                <li key={edge.id}>
                  <span className="conn-relation">{RELATION_LABELS[edge.relation]}</span>
                  <span>{dir} {other?.title ?? otherId}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button type="button" className="delete-btn" onClick={() => deleteNode(node.id)}>
        이 생각 삭제
      </button>
    </aside>
  );
}
