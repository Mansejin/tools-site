import { useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ScriptLine } from '../types';

function lineClass(line: ScriptLine, selected: boolean): string {
  const parts = ['script-line', `type-${line.type}`];
  if (selected) parts.push('selected');
  return parts.join(' ');
}

export function ScriptPanel() {
  const work = useAppStore((s) => s.activeWork());
  const selectedLineIds = useAppStore((s) => s.selectedLineIds);
  const charSelection = useAppStore((s) => s.charSelection);
  const selectLine = useAppStore((s) => s.selectLine);
  const setCharSelection = useAppStore((s) => s.setCharSelection);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const importScript = useAppStore((s) => s.importScript);
  const setCurrentBeat = useAppStore((s) => s.setCurrentBeat);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    const text = await file.text();
    importScript(text);
  };

  const onTextMouseUp = (line: ScriptLine) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString()) return;
    const text = sel.toString();
    const full = line.text;
    const start = full.indexOf(text);
    if (start < 0) return;
    setCharSelection({
      lineId: line.id,
      start,
      end: start + text.length,
      text,
    });
  };

  const jumpToCueKeyframe = (lineId: string) => {
    const kf = work.keyframes.find((k) => k.cueLineId === lineId);
    if (kf) setCurrentBeat(kf.beat);
  };

  return (
    <aside className="script-panel">
      <header className="panel-head">
        <h2>대본</h2>
        <div className="panel-actions">
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            업로드
          </button>
          <button type="button" className="btn ghost" onClick={clearSelection}>
            선택 해제
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.text,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {(selectedLineIds.length > 0 || charSelection) && (
        <div className="selection-banner">
          {charSelection ? (
            <>
              글자 선택: <em>“{charSelection.text}”</em>
            </>
          ) : (
            <>대사 {selectedLineIds.length}줄 선택됨</>
          )}
          <span> → 무대에서 배역을 옮기면 키프레임 추가</span>
        </div>
      )}

      <div className="script-body">
        {work.script.length === 0 && (
          <p className="empty">대본을 업로드하거나 설정에서 샘플을 불러오세요.</p>
        )}
        {work.script.map((line) => {
          if (line.type === 'blank') {
            return <div key={line.id} className="script-blank" />;
          }
          const selected = selectedLineIds.includes(line.id);
          const hasKf = work.keyframes.some((k) => k.cueLineId === line.id);
          return (
            <div
              key={line.id}
              className={lineClass(line, selected)}
              onClick={(e) => {
                selectLine(line.id, e.metaKey || e.ctrlKey);
                jumpToCueKeyframe(line.id);
              }}
              onMouseUp={() => onTextMouseUp(line)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectLine(line.id);
                  jumpToCueKeyframe(line.id);
                }
              }}
            >
              {line.speaker && <span className="speaker">{line.speaker}</span>}
              <span className="line-text">{line.text}</span>
              {hasKf && <span className="kf-mark" title="키프레임 있음">◆</span>}
            </div>
          );
        })}
      </div>

      <footer className="script-foot">
        <label className="paste-label">
          텍스트 붙여넣기
          <textarea
            placeholder="대본을 붙여넣고 Ctrl+Enter로 적용…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const v = (e.target as HTMLTextAreaElement).value;
                if (v.trim()) {
                  importScript(v);
                  (e.target as HTMLTextAreaElement).value = '';
                }
              }
            }}
          />
        </label>
      </footer>
    </aside>
  );
}
