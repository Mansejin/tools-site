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
  const deleteBlockingForLine = useAppStore((s) => s.deleteBlockingForLine);
  const addTempoPoint = useAppStore((s) => s.addTempoPoint);

  const cues = useMemo(() => timedScriptLines(work.script), [work.script]);
  const maxBeat = useMemo(
    () =>
      Math.max(
        maxScriptBeat(work.script, work.beatsPerBar),
        currentBeat + work.beatsPerBar,
        ...(work.tempoMap ?? []).map((p) => p.beat + work.beatsPerBar),
        ...(work.numbers ?? []).map((n) => n.startBeat + work.beatsPerBar),
      ),
    [work.script, work.beatsPerBar, work.tempoMap, work.numbers, currentBeat],
  );

  const currentBpm = bpmAtBeat(currentBeat, work.tempoMap ?? [], work.bpm);
  const currentNumber = numberAtBeat(currentBeat, work.numbers ?? []);

  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
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
  }, [isPlaying, maxBeat, work.tempoMap, work.bpm]);

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
  const selectedLine = cues.find((c) => c.id === selectedId);

  return (
    <section className="timeline">
      <div className="timeline-controls">
        <button type="button" className="btn" onClick={() => setPlaying(!isPlaying)}>
          {isPlaying ? '일시정지' : '재생'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setCurrentBeat(0, { syncSelection: true });
            setPlaying(false);
          }}
        >
          처음으로
        </button>
        <button
          type="button"
          className="btn ghost"
          title={selectedLine ? '선택한 대사 박 −1' : '재생헤드 −1'}
          onClick={() => nudgeSelectedCue(-1)}
        >
          −1박
        </button>
        <button
          type="button"
          className="btn ghost"
          title={selectedLine ? '선택한 대사 박 +1' : '재생헤드 +1'}
          onClick={() => nudgeSelectedCue(1)}
        >
          +1박
        </button>
        <button
          type="button"
          className="btn ghost"
          title="현재 박에 템포 변경점 추가"
          onClick={() => addTempoPoint(currentBeat, currentBpm, `BPM ${currentBpm}`)}
        >
          템포 포인트
        </button>
        <label className="check">
          <input
            type="checkbox"
            checked={snapToBeat}
            onChange={(e) => setSnapToBeat(e.target.checked)}
          />
          박자 스냅
        </label>
        <span className="beat-readout">
          {formatBeat(currentBeat, work.beatsPerBar)}
          <small>
            {' '}
            / BPM {currentBpm}
            {currentNumber ? ` · ${currentNumber.title}` : ''} · 큐 {cues.length}
          </small>
        </span>
      </div>

      <p className="timeline-hint">
        동선은 박 기준으로 유지됩니다. 넘버·BPM이 바뀌어도 키프레임은 그대로이고, 재생 속도만 템포 맵을 따릅니다.
      </p>

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
              <span>{i + 1}</span>
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

        <div className="playhead" style={{ left: pct(currentBeat) }} />
      </div>

      <div className="kf-list cue-list">
        {cues.length === 0 && (
          <p className="empty">대본이 있으면 여기에 큐가 나타납니다.</p>
        )}
        {cues.map((line) => {
          const kf = keyframeForLine(work.keyframes, line.id);
          const active = selectedId === line.id;
          const lineBpm =
            line.beat != null
              ? bpmAtBeat(line.beat, work.tempoMap ?? [], work.bpm)
              : work.bpm;
          return (
            <div
              key={line.id}
              className={`kf-row ${active ? 'current' : ''} ${kf ? 'has-blocking' : ''}`}
              onClick={() => selectLine(line.id)}
            >
              <label>
                박
                <input
                  type="number"
                  step={snapToBeat ? 1 : 0.25}
                  min={0}
                  value={Number((line.beat ?? 0).toFixed(2))}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setLineBeat(line.id, Number(e.target.value) || 0)
                  }
                />
              </label>
              <span className="kf-cue">
                {line.speaker ? `${line.speaker}: ` : ''}
                {line.text}
              </span>
              <span className="tempo-chip">♩={lineBpm}</span>
              <span className={`block-status ${kf ? 'on' : 'off'}`}>
                {kf ? '동선 ◆' : '동선 없음'}
              </span>
              {kf && (
                <button
                  type="button"
                  className="btn tiny danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBlockingForLine(line.id);
                  }}
                >
                  동선 삭제
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
