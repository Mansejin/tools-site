import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatBeat } from '../lib/interpolation';
import {
  keyframeForLine,
  maxScriptBeat,
  timedScriptLines,
} from '../lib/cues';
import {
  advanceBeatByMs,
  bpmAtBeat,
  numberAtBeat,
  numberSpan,
} from '../lib/tempoMap';

export function Timeline() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const snapToBeat = useAppStore((s) => s.snapToBeat);
  const selectedLineIds = useAppStore((s) => s.selectedLineIds);
  const setCurrentBeat = useAppStore((s) => s.setCurrentBeat);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const setSnapToBeat = useAppStore((s) => s.setSnapToBeat);
  const selectLine = useAppStore((s) => s.selectLine);
  const setLineBeat = useAppStore((s) => s.setLineBeat);
  const nudgeSelectedCue = useAppStore((s) => s.nudgeSelectedCue);
  const deleteKeyframe = useAppStore((s) => s.deleteKeyframe);
  const updateKeyframe = useAppStore((s) => s.updateKeyframe);
  const addTempoPoint = useAppStore((s) => s.addTempoPoint);
  const audioFollow = useAppStore((s) => s.audioFollow);
  const audioFileName = useAppStore((s) => s.audioFileName);

  const cues = useMemo(() => timedScriptLines(work.script), [work.script]);
  const maxBeat = useMemo(
    () =>
      Math.max(
        maxScriptBeat(work.script, work.beatsPerBar),
        currentBeat + work.beatsPerBar,
        ...(work.tempoMap ?? []).map((p) => p.beat + work.beatsPerBar),
        ...(work.numbers ?? []).map((n) => n.startBeat + work.beatsPerBar),
        ...(work.keyframes ?? []).map((k) => k.beat + work.beatsPerBar),
      ),
    [work.script, work.beatsPerBar, work.tempoMap, work.numbers, work.keyframes, currentBeat],
  );

  const currentBpm = bpmAtBeat(currentBeat, work.tempoMap ?? [], work.bpm);
  const currentNumber = numberAtBeat(currentBeat, work.numbers ?? []);

  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    if (audioFollow && audioFileName) return;
    let frame = 0;
    let prev: number | null = null;

    const tick = (ts: number) => {
      if (prev == null) prev = ts;
      const dt = ts - prev;
      prev = ts;
      const store = useAppStore.getState();
      const w = store.activeWork();
      const next = advanceBeatByMs(
        store.currentBeat,
        dt,
        w.tempoMap ?? [],
        w.bpm,
      );
      if (next >= maxBeat) {
        store.setCurrentBeat(maxBeat, { syncSelection: true });
        store.setPlaying(false);
        return;
      }
      store.setCurrentBeat(next, { syncSelection: true });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, maxBeat, work.tempoMap, work.bpm, audioFollow, audioFileName]);

  useEffect(() => {
    if (!draggingLineId) return;
    const onMove = (e: PointerEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      let beat = ((e.clientX - rect.left) / rect.width) * maxBeat;
      beat = Math.max(0, beat);
      if (useAppStore.getState().snapToBeat) beat = Math.round(beat);
      setLineBeat(draggingLineId, beat);
    };
    const onUp = () => setDraggingLineId(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingLineId, maxBeat, setLineBeat]);

  const pct = (beat: number) => `${(beat / maxBeat) * 100}%`;
  const selectedId = selectedLineIds[0];
  const drivenByAudio = Boolean(audioFollow && audioFileName);

  return (
    <section className="timeline" aria-label="타임라인">
      <div className="timeline-controls">
        {!drivenByAudio && (
          <button type="button" className="btn ghost" onClick={() => setPlaying(!isPlaying)}>
            {isPlaying ? '타임라인 정지' : '타임라인 재생'}
          </button>
        )}
        <button
          type="button"
          className="btn ghost"
          title="선택한 가사 또는 재생헤드 −1박"
          onClick={() => nudgeSelectedCue(-1)}
        >
          −1박
        </button>
        <button
          type="button"
          className="btn ghost"
          title="선택한 가사 또는 재생헤드 +1박"
          onClick={() => nudgeSelectedCue(1)}
        >
          +1박
        </button>
        <button
          type="button"
          className="btn ghost"
          title="현재 박에 템포 변경점"
          onClick={() => addTempoPoint(currentBeat, currentBpm, `BPM ${currentBpm}`)}
        >
          템포
        </button>
        <label className="check">
          <input
            type="checkbox"
            checked={snapToBeat}
            onChange={(e) => setSnapToBeat(e.target.checked)}
          />
          박 스냅
        </label>
        <span className="beat-readout">
          {formatBeat(currentBeat, work.beatsPerBar)}
          <small>
            {' '}
            ♩={currentBpm}
            {currentNumber ? ` · ${currentNumber.title}` : ''}
            {drivenByAudio ? ' · 노래 연동' : ''}
          </small>
        </span>
      </div>

      <div
        ref={trackRef}
        className="timeline-track"
        onClick={(e) => {
          if (draggingLineId) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const t = (e.clientX - rect.left) / rect.width;
          let beat = t * maxBeat;
          if (snapToBeat) beat = Math.round(beat);
          setCurrentBeat(Math.max(0, beat), { syncSelection: true });
        }}
      >
        <div className="number-bands">
          {(work.numbers ?? []).map((num) => {
            const { start, end } = numberSpan(num, work.numbers, maxBeat);
            const left = (start / maxBeat) * 100;
            const width = Math.max(0.5, ((end - start) / maxBeat) * 100);
            return (
              <div
                key={num.id}
                className="number-band"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: num.color,
                }}
                title={`${num.title}${num.bpm ? ` · BPM ${num.bpm}` : ''}`}
              >
                <span>{num.title}</span>
              </div>
            );
          })}
        </div>

        <div className="timeline-bars">
          {Array.from({ length: Math.ceil(maxBeat / work.beatsPerBar) + 1 }, (_, i) => (
            <div key={i} className="bar-mark" style={{ left: pct(i * work.beatsPerBar) }}>
              {i % 4 === 0 && <span>{i + 1}</span>}
            </div>
          ))}
        </div>

        {(work.tempoMap ?? []).map((point) => (
          <div
            key={point.id}
            className="tempo-mark"
            style={{ left: pct(point.beat) }}
            title={`${formatBeat(point.beat, work.beatsPerBar)} · BPM ${point.bpm}${point.label ? ` · ${point.label}` : ''}`}
          >
            <span>{point.bpm}</span>
          </div>
        ))}

        {cues.map((line) => {
          if (line.beat == null) return null;
          const hasKf = Boolean(keyframeForLine(work.keyframes, line.id));
          const active = selectedId === line.id;
          return (
            <button
              key={line.id}
              type="button"
              className={`cue-mark ${hasKf ? 'blocked' : ''} ${active ? 'active' : ''}`}
              style={{ left: pct(line.beat) }}
              title={`${formatBeat(line.beat, work.beatsPerBar)} · ${line.speaker ? `${line.speaker}: ` : ''}${line.text}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                selectLine(line.id);
                setDraggingLineId(line.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                selectLine(line.id);
              }}
            />
          );
        })}

        {[...work.keyframes]
          .sort((a, b) => a.beat - b.beat)
          .map((kf) => (
            <button
              key={`kf-${kf.id}`}
              type="button"
              className={`kf-diamond ${Math.abs(kf.beat - currentBeat) < 0.05 ? 'active' : ''}`}
              style={{ left: pct(kf.beat) }}
              title={kf.cueLabel || `박 ${kf.beat}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentBeat(kf.beat);
              }}
            />
          ))}

        <div className="playhead" style={{ left: pct(currentBeat) }} />
      </div>

      <div className="kf-list-wrap">
        <button
          type="button"
          className="list-toggle"
          onClick={() => setListOpen((v) => !v)}
          aria-expanded={listOpen}
        >
          키프레임 {work.keyframes.length}
          <span>{listOpen ? '접기' : '펼치기'}</span>
        </button>
        {listOpen && (
          <div className="kf-list cue-list">
            {work.keyframes.length === 0 && (
              <p className="empty">아직 없음 · 재생 후 배역을 드래그하세요.</p>
            )}
            {[...work.keyframes]
              .sort((a, b) => a.beat - b.beat)
              .map((kf) => (
                <div
                  key={kf.id}
                  className={`kf-row has-blocking ${Math.abs(kf.beat - currentBeat) < 0.05 ? 'current' : ''}`}
                  onClick={() => setCurrentBeat(kf.beat)}
                >
                  <label>
                    박
                    <input
                      type="number"
                      step={snapToBeat ? 1 : 0.25}
                      min={0}
                      value={Number(kf.beat.toFixed(2))}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateKeyframe(kf.id, { beat: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                  <span className="kf-cue">{kf.cueLabel || '(노래 큐)'}</span>
                  <span className="tempo-chip">
                    ♩={bpmAtBeat(kf.beat, work.tempoMap ?? [], work.bpm)}
                  </span>
                  <button
                    type="button"
                    className="btn tiny danger ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteKeyframe(kf.id);
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
