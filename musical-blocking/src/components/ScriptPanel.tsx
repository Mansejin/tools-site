import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatBeat } from '../lib/interpolation';
import { keyframeForLine, lineAtBeat, lineDurationBeats } from '../lib/cues';
import { numberAtBeat } from '../lib/tempoMap';
import type { ScriptLine } from '../types';

function lineClass(
  line: ScriptLine,
  selected: boolean,
  hasKf: boolean,
  current: boolean,
): string {
  const parts = ['script-line', `type-${line.type}`];
  if (selected) parts.push('selected');
  if (hasKf) parts.push('has-kf');
  if (current) parts.push('current-lyric');
  return parts.join(' ');
}

export function ScriptPanel() {
  const work = useAppStore((s) => s.activeWork());
  const selectedLineIds = useAppStore((s) => s.selectedLineIds);
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const selectedId = selectedLineIds[0];
  const selectedDuration =
    selectedId != null ? lineDurationBeats(work.script, selectedId) : undefined;

  const liveLine = lineAtBeat(work.script, currentBeat);
  const liveNumber = numberAtBeat(currentBeat, work.numbers ?? []);

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

  useEffect(() => {
    const id = liveLine?.id ?? selectedLineIds[0];
    if (!id || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-line-id="${id}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [liveLine?.id, selectedLineIds, currentBeat]);

  return (
    <aside className="script-panel" aria-label="가사 모니터">
      <header className="panel-head">
        <div>
          <h2>가사</h2>
          {liveNumber && <p className="panel-sub">{liveNumber.title}</p>}
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="btn tiny ghost"
            onClick={() => setToolsOpen((v) => !v)}
            aria-expanded={toolsOpen}
          >
            {toolsOpen ? '도구 닫기' : '싱크 도구'}
          </button>
          <button type="button" className="btn tiny ghost" onClick={clearSelection}>
            선택 해제
          </button>
        </div>
      </header>

      {toolsOpen && (
        <div className="script-tools">
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            대본 파일
          </button>
          <button
            type="button"
            className="btn ghost"
            title="가사 줄 간격을 다시 배정"
            onClick={retimeScript}
          >
            박 재배정
          </button>
          <button
            type="button"
            className="btn ghost"
            title="가사 타임라인만 ×2"
            onClick={() => scaleAllTiming(2)}
          >
            간격 ×2
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
          <label className="paste-label">
            대본 붙여넣기 · Ctrl+Enter
            <textarea
              placeholder="【넘버: … / BPM …】"
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
        </div>
      )}

      <p className="script-hint">클릭하면 그 가사로 점프 · 키프레임은 무대 드래그로</p>

      <div className="script-body" ref={listRef}>
        {work.script.length === 0 && (
          <p className="empty">대본을 넣으면 재생에 맞춰 하이라이트됩니다.</p>
        )}
        {work.script.map((line) => {
          if (line.type === 'blank') {
            return <div key={line.id} className="script-blank" />;
          }
          const selected = selectedLineIds.includes(line.id);
          const hasKf = Boolean(keyframeForLine(work.keyframes, line.id));
          const current = liveLine?.id === line.id;
          return (
            <div
              key={line.id}
              data-line-id={line.id}
              className={lineClass(line, selected, hasKf, current)}
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
                title="이 가사로 점프"
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
              {hasKf && <span className="kf-mark" title="근처 키프레임">◆</span>}
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
                    길이(박)
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
    </aside>
  );
}
