import { useEffect } from 'react';
import { useThoughtStore } from '../store/useThoughtStore';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export default function Header() {
  const map = useThoughtStore((s) => s.map);
  const updateMapTitle = useThoughtStore((s) => s.updateMapTitle);
  const openWelcome = useThoughtStore((s) => s.openWelcome);
  const canUndo = useThoughtStore((s) => s.past.length > 0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useThoughtStore.getState();

      // Ctrl+Z / Cmd+Z — 입력 중에도 맵 제목 필드가 아니면 허용하되,
      // 노드 인라인 편집 중 Enter 커밋 전엔 브라우저 기본 undo 대신 맵 undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (isTypingTarget(e.target) && state.editingNodeId) {
          // 인라인 편집 중 텍스트 undo는 브라우저에 맡김
          return;
        }
        if (isTypingTarget(e.target) && (e.target as HTMLElement).classList.contains('map-title-input')) {
          return;
        }
        e.preventDefault();
        state.undo();
        return;
      }

      if (isTypingTarget(e.target)) return;
      if (state.editingNodeId) return;
      if (!state.selectedNodeId) return;

      const node = state.map.nodes.find((n) => n.id === state.selectedNodeId);
      if (!node) return;
      const root =
        !node.parentId || !state.map.nodes.some((n) => n.id === node.parentId);

      if (root) return;

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const newId = state.addConnectedThought(state.selectedNodeId, 'center', '새 생각');
        state.selectNode(newId);
        state.setEditingNodeId(newId);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const descendants = state.map.nodes.filter((n) => {
          let walk: typeof n | undefined = n;
          while (walk?.parentId) {
            if (walk.parentId === state.selectedNodeId) return true;
            walk = state.map.nodes.find((x) => x.id === walk!.parentId);
          }
          return false;
        }).length;
        if (descendants > 0) {
          const ok = window.confirm(
            `하위 생각 ${descendants}개도 함께 삭제됩니다.\n삭제할까요? (Ctrl+Z로 되돌릴 수 있어요)`,
          );
          if (!ok) return;
        }
        state.deleteNode(state.selectedNodeId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="app-header compact">
      <div className="header-row">
        <div className="header-left">
          <button type="button" className="app-logo" onClick={openWelcome} title="소개 보기">
            Mindtree
          </button>
          <input
            className="map-title-input"
            value={map.title}
            onChange={(e) => updateMapTitle(e.target.value)}
            aria-label="맵 제목"
            placeholder="맵 제목"
          />
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="header-action"
            onClick={() => useThoughtStore.getState().undo()}
            disabled={!canUndo}
            title="되돌리기 (Ctrl+Z)"
          >
            되돌리기
          </button>
        </div>
      </div>
    </header>
  );
}
