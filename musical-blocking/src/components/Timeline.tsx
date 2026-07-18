import { useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatBeat } from '../lib/interpolation';

export function Timeline() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const snapToBeat = useAppStore((s) => s.snapToBeat);
  const setCurrentBeat = useAppStore((s) => s.setCurrentBeat);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const setSnapToBeat = useAppStore((s) => s.setSnapToBeat);
  const updateKeyframe = useAppStore((s) => s.updateKeyframe);
  const deleteKeyframe = useAppStore((s) => s.deleteKeyframe);
  const addKeyframeAtBeat = useAppStore((s) => s.addKeyframeAtBeat);

  const sorted = useMemo(
    () => [...work.keyframes].sort((a, b) => a.beat - b.beat),
    [work.keyframes],
  );

  const maxBeat = Math.max(
    work.beatsPerBar * 8,
    ...sorted.map((k) => k.beat + work.beatsPerBar),
    currentBeat + work.beatsPerBar,
  );

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    let prev: number | null = null;
    const beatDurationMs = (60 / work.bpm) * 1000;

    const tick = (ts: number) => {
      if (prev == null) prev = ts;
      const dt = ts - prev;
      prev = ts;
      const store = useAppStore.getState();
      const next = store.currentBeat + dt / beatDurationMs;
      if (next >= maxBeat) {
        store.setCurrentBeat(maxBeat);
        store.setPlaying(false);
        return;
      }
      store.setCurrentBeat(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, work.bpm, maxBeat]);

  const pct = (beat: number) => `${(beat / maxBeat) * 100}%`;

  return (
    <section className="timeline">
      <div className="timeline-controls">
        <button type="button" className="btn" onClick={() => setPlaying(!isPlaying)}>
          {isPlaying ? '일시정지' : '재생'}
        </button>
        <button type="button" className="btn ghost" onClick={() => setCurrentBeat(0)}>
          처음으로
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setCurrentBeat(Math.max(0, currentBeat - 1))}
        >
          −1박
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setCurrentBeat(currentBeat + 1)}
        >
          +1박
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => addKeyframeAtBeat(currentBeat)}
        >
          키프레임 추가
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
            / BPM {work.bpm} · {work.beatsPerBar}/4
          </small>
        </span>
      </div>

      <div
        className="timeline-track"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const t = (e.clientX - rect.left) / rect.width;
          let beat = t * maxBeat;
          if (snapToBeat) beat = Math.round(beat);
          setCurrentBeat(Math.max(0, beat));
        }}
      >
        <div className="timeline-bars">
          {Array.from({ length: Math.ceil(maxBeat / work.beatsPerBar) + 1 }, (_, i) => (
            <div key={i} className="bar-mark" style={{ left: pct(i * work.beatsPerBar) }}>
              <span>{i + 1}</span>
            </div>
          ))}
        </div>

        {sorted.map((kf) => (
          <button
            key={kf.id}
            type="button"
            className="kf-diamond"
            style={{ left: pct(kf.beat) }}
            title={kf.cueLabel || `Beat ${kf.beat}`}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentBeat(kf.beat);
            }}
          />
        ))}

        <div className="playhead" style={{ left: pct(currentBeat) }} />
      </div>

      <div className="kf-list">
        {sorted.length === 0 && (
          <p className="empty">아직 키프레임이 없습니다. 대사를 고르고 배역을 옮기세요.</p>
        )}
        {sorted.map((kf) => (
          <div
            key={kf.id}
            className={`kf-row ${Math.abs(kf.beat - currentBeat) < 0.01 ? 'current' : ''}`}
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
            <span className="kf-cue">{kf.cueLabel || '(큐 없음)'}</span>
            <input
              className="kf-note"
              placeholder="메모"
              value={kf.note || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => updateKeyframe(kf.id, { note: e.target.value })}
            />
            <button
              type="button"
              className="btn tiny danger"
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
    </section>
  );
}
