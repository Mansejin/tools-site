import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatBeat } from '../lib/interpolation';
import { keyframeForLine, lineDurationBeats } from '../lib/cues';
import type { ScriptLine } from '../types';

function lineClass(line: ScriptLine, selected: boolean, hasKf: boolean): string {
  const parts = ['script-line', `type-${line.type}`];
  if (selected) parts.push('selected');
  if (hasKf) parts.push('has-kf');
  return parts.join(' ');
}

export function ScriptPanel() {
  const work = useAppStore((s) => s.activeWork());
  const selectedLineIds = useAppStore((s) => s.selectedLineIds);
  const charSelection = useAppStore((s) => s.charSelection);
  const currentBeat = useAppStore((s) => s.currentBeat);
  const selectLine = useAppStore((s) => s.selectLine);
  const setCharSelection = useAppStore((s) => s.setCharSelection);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const importScript = useAppStore((s) => s.importScript);
  const setLineBeat = useAppStore((s) => s.setLineBeat);
  const retimeScript = useAppStore((s) => s.retimeScript);
  const scaleAllTiming = useAppStore((s) => s.scaleAllTiming);
  const setSelectedLineDuration = useAppStore((s) => s.setSelectedLineDuration);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedId = selectedLineIds[0];
  const selectedDuration =
    selectedId != null ? lineDurationBeats(work.script, selectedId) : undefined;

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

  // Keep selected line visible while playhead / selection moves
  useEffect(() => {
    const id = selectedLineIds[0];
    if (!id || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-line-id="${id}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedLineIds, currentBeat]);

  return (
    <aside className="script-panel">
      <header className="panel-head">
        <h2>대본 · 큐</h2>
        <div className="panel-actions">
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            업로드
          </button>
          <button
            type="button"
            className="btn ghost"
            title="대사 간격 설정값으로 박을 다시 배정"
            onClick={retimeScript}
          >
            박 재배정
          </button>
          <button
            type="button"
            className="btn ghost"
            title="모든 큐·키프레임 박을 2배로 (재생이 두 배 길어짐)"
            onClick={() => scaleAllTiming(2)}
          >
            간격 ×2
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

      <div className="selection-banner sticky-hint">
        {selectedLineIds.length > 0 || charSelection ? (
          <>
            {charSelection ? (
              <>
                글자 선택: <em>“{charSelection.text}”</em>
              </>
            ) : (
              <>선택한 대사가 현재 큐</>
            )}
            <span> · 무대에서 옮기면 이 줄에 동선 저장</span>
          </>
        ) : (
          <span>대사를 고르면 타임라인 박이 같이 이동합니다</span>
        )}
      </div>

      <div className="script-body" ref={listRef}>
        {work.script.length === 0 && (
          <p className="empty">대본을 업로드하거나 설정에서 샘플을 불러오세요.</p>
        )}
        {work.script.map((line) => {
          if (line.type === 'blank') {
            return <div key={line.id} className="script-blank" />;
          }
          const selected = selectedLineIds.includes(line.id);
          const hasKf = Boolean(keyframeForLine(work.keyframes, line.id));
          return (
            <div
              key={line.id}
              data-line-id={line.id}
              className={lineClass(line, selected, hasKf)}
              onClick={(e) => selectLine(line.id, e.metaKey || e.ctrlKey)}
              onMouseUp={() => onTextMouseUp(line)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectLine(line.id);
                }
              }}
            >
              <button
                type="button"
                className="beat-chip"
                title="이 대사의 박 — 클릭 후 수정하거나 타임라인에서 드래그"
                onClick={(e) => {
                  e.stopPropagation();
                  selectLine(line.id);
                }}
              >
                {line.beat != null
                  ? formatBeat(line.beat, work.beatsPerBar)
                  : '—'}
              </button>
              {line.speaker && <span className="speaker">{line.speaker}</span>}
              <span className="line-text">{line.text}</span>
              {hasKf && <span className="kf-mark" title="동선 키프레임 있음">◆</span>}
              {selected && (
                <div className="beat-edit-row" onClick={(e) => e.stopPropagation()}>
                  <label className="beat-edit">
                    시작 박
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={line.beat ?? 0}
                      onChange={(e) =>
                        setLineBeat(line.id, Number(e.target.value) || 0)
                      }
                    />
                  </label>
                  <label className="beat-edit">
                    이 줄 길이(박)
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={selectedDuration ?? 8}
                      onChange={(e) =>
                        setSelectedLineDuration(Number(e.target.value) || 1)
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <footer className="script-foot">
        <label className="paste-label">
          텍스트 붙여넣기
          <textarea
            placeholder="대본을 붙여넣고 Ctrl+Enter로 적용… (박이 자동 배정됩니다)"
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
