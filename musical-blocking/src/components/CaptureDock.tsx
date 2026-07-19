import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { lineAtBeat } from '../lib/cues';
import { bpmAtBeat, numberAtBeat } from '../lib/tempoMap';
import {
  audioMsAtBeat,
  beatAtAudioMs,
  effectiveAnchors,
  formatAudioMs,
} from '../lib/audioSync';
import { formatBeat } from '../lib/interpolation';

/** Unified song transport + live number/lyric readout for capture. */
export function CaptureDock() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const audioFollow = useAppStore((s) => s.audioFollow);
  const audioFileName = useAppStore((s) => s.audioFileName);
  const lastStamp = useAppStore((s) => s.lastStamp);
  const selectedLineIds = useAppStore((s) => s.selectedLineIds);
  const keyframeCount = work.keyframes.length;
  const setPlaying = useAppStore((s) => s.setPlaying);
  const setCurrentBeat = useAppStore((s) => s.setCurrentBeat);
  const setAudioFollow = useAppStore((s) => s.setAudioFollow);
  const setAudioFileName = useAppStore((s) => s.setAudioFileName);
  const clearLastStamp = useAppStore((s) => s.clearLastStamp);
  const setLyricsOpen = useAppStore((s) => s.setLyricsOpen);
  const lyricsOpen = useAppStore((s) => s.lyricsOpen);
  const setAudioOffsetMs = useAppStore((s) => s.setAudioOffsetMs);
  const setSyncStartBeat = useAppStore((s) => s.setSyncStartBeat);
  const upsertSyncAnchor = useAppStore((s) => s.upsertSyncAnchor);
  const removeSyncAnchor = useAppStore((s) => s.removeSyncAnchor);
  const clearSyncAnchors = useAppStore((s) => s.clearSyncAnchors);
  const applyAnchorTempo = useAppStore((s) => s.applyAnchorTempo);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [duration, setDuration] = useState(0);
  const [audioMs, setAudioMs] = useState(0);
  const [stampFlash, setStampFlash] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const syncing = useRef(false);

  const num = numberAtBeat(currentBeat, work.numbers ?? []);
  const line = lineAtBeat(work.script, currentBeat);
  const bpm = bpmAtBeat(currentBeat, work.tempoMap ?? [], work.bpm);
  const anchors = effectiveAnchors(work);
  const userAnchorCount = work.syncAnchors?.length ?? 0;
  const lyric =
    line && line.type !== 'blank' && line.type !== 'direction'
      ? `${line.speaker ? `${line.speaker}: ` : ''}${line.text}`
      : line?.type === 'direction' || line?.type === 'cue'
        ? line.text
        : '가사를 불러오면 재생에 맞춰 여기에 표시됩니다';

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const syncWorkRef = useRef(work);
  syncWorkRef.current = work;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFollow) return;

    const onTime = () => {
      if (syncing.current) return;
      const ms = audio.currentTime * 1000;
      setAudioMs(ms);
      const beat = beatAtAudioMs(ms, syncWorkRef.current);
      setCurrentBeat(beat, { syncSelection: true });
    };
    const onEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioFollow, setCurrentBeat, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFollow || !audioFileName) return;

    const targetSec = audioMsAtBeat(currentBeat, syncWorkRef.current) / 1000;
    if (Math.abs(audio.currentTime - targetSec) > 0.35) {
      syncing.current = true;
      audio.currentTime = Math.max(0, targetSec);
      setAudioMs(Math.max(0, targetSec) * 1000);
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    }

    if (isPlaying && audio.paused) void audio.play().catch(() => setPlaying(false));
    if (!isPlaying && !audio.paused) audio.pause();
  }, [
    currentBeat,
    isPlaying,
    audioFollow,
    audioFileName,
    work.audioOffsetMs,
    work.syncStartBeat,
    work.syncAnchors,
    work.tempoMap,
    work.bpm,
    setPlaying,
  ]);

  useEffect(() => {
    if (!lastStamp) return;
    setStampFlash(lastStamp.label);
    const t = window.setTimeout(() => {
      setStampFlash(null);
      clearLastStamp();
    }, 1600);
    return () => window.clearTimeout(t);
  }, [lastStamp, clearLastStamp]);

  useEffect(() => {
    if (!syncMsg) return;
    const t = window.setTimeout(() => setSyncMsg(null), 2200);
    return () => window.clearTimeout(t);
  }, [syncMsg]);

  const onFile = (file: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    setAudioFileName(file.name);
    setAudioFollow(true);
    setPlaying(false);
    setSyncOpen(true);
  };

  const clearAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setAudioFileName(null);
    setAudioFollow(false);
    setDuration(0);
    setAudioMs(0);
    setPlaying(false);
  };

  const togglePlay = () => {
    if (audioFileName && !audioFollow) setAudioFollow(true);
    setPlaying(!isPlaying);
  };

  const readAudioMs = () => {
    const audio = audioRef.current;
    if (audio) return audio.currentTime * 1000;
    return audioMs;
  };

  const markAnchorAtBeat = (beat: number, label?: string) => {
    if (!audioFileName) {
      setSyncMsg('먼저 노래를 올리세요');
      return;
    }
    const ms = readAudioMs();
    upsertSyncAnchor({
      beat,
      audioMs: ms,
      label: label ?? formatBeat(beat, work.beatsPerBar),
    });
    setSyncMsg(`앵커 · ${formatBeat(beat, work.beatsPerBar)} = ${formatAudioMs(ms)}`);
    setSyncOpen(true);
  };

  const markCurrentBeat = () => {
    markAnchorAtBeat(currentBeat, line?.text?.slice(0, 24) || '현재 박');
  };

  const markSelectedLyric = () => {
    const id = selectedLineIds[0];
    const selected = id ? work.script.find((l) => l.id === id) : undefined;
    if (!selected || selected.beat == null) {
      setSyncMsg('가사에서 줄을 먼저 선택하세요');
      return;
    }
    markAnchorAtBeat(
      selected.beat,
      selected.text.slice(0, 24) || formatBeat(selected.beat, work.beatsPerBar),
    );
  };

  const setOffsetHere = () => {
    if (!audioFileName) {
      setSyncMsg('먼저 노래를 올리세요');
      return;
    }
    const ms = readAudioMs();
    setAudioOffsetMs(ms);
    setSyncMsg(`오프셋 ${formatAudioMs(ms)} → 시작 박 ${formatBeat(work.syncStartBeat ?? 0, work.beatsPerBar)}`);
    setSyncOpen(true);
  };

  const goToStart = () => {
    setPlaying(false);
    const startBeat = work.syncStartBeat ?? 0;
    setCurrentBeat(startBeat, { syncSelection: true });
    const audio = audioRef.current;
    if (audio) {
      const t = audioMsAtBeat(startBeat, work) / 1000;
      audio.currentTime = Math.max(0, t);
      setAudioMs(Math.max(0, t) * 1000);
    }
  };

  return (
    <section className={`capture-dock ${isPlaying ? 'live' : ''}`} aria-label="캡처 컨트롤">
      <div className="capture-now">
        <div className="capture-now-top">
          <span className="capture-number">{num?.title ?? work.title}</span>
          <span className="capture-beat">
            {formatBeat(currentBeat, work.beatsPerBar)}
            <span className="capture-beat-meta">
              {' '}
              · ♩={bpm}
              {audioFileName ? ` · ${formatAudioMs(audioMs)}` : ''}
            </span>
          </span>
        </div>
        <p className="capture-lyric" title={lyric}>
          {lyric}
        </p>
      </div>

      <div className="capture-controls">
        <button
          type="button"
          className={`btn capture-play ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          title="스페이스바"
        >
          {isPlaying ? '일시정지' : audioFileName ? '곡 재생' : '재생'}
        </button>
        <button type="button" className="btn ghost" onClick={goToStart}>
          처음으로
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => fileRef.current?.click()}
        >
          {audioFileName ? '다른 곡' : '노래 올리기'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        {audioFileName && (
          <button type="button" className="btn tiny danger ghost" onClick={clearAudio}>
            곡 제거
          </button>
        )}
        <button
          type="button"
          className="btn ghost"
          onClick={() => setSyncOpen((v) => !v)}
          aria-expanded={syncOpen}
        >
          싱크{userAnchorCount > 0 ? ` ·${userAnchorCount}` : ''}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setLyricsOpen(!lyricsOpen)}
          aria-pressed={lyricsOpen}
        >
          {lyricsOpen ? '가사 숨기기' : '가사 보기'}
        </button>
      </div>

      <div className="capture-meta">
        <span className="capture-guide">
          {isPlaying
            ? '재생 중 · 배역을 옮기면 이 순간에 키프레임 저장'
            : '노래/재생 후 무대에서 배역을 드래그하세요'}
        </span>
        <span className="capture-file">
          {audioFileName
            ? `${audioFileName}${duration ? ` · ${Math.round(duration)}초` : ''}${audioFollow ? ' · 연동' : ''}`
            : '오디오 없음 · 타임라인 재생으로도 찍기 가능'}
          {' · '}
          KF {keyframeCount}
        </span>
        {stampFlash && (
          <span className="capture-stamp" role="status">
            저장됨 · {stampFlash}
          </span>
        )}
        {syncMsg && (
          <span className="capture-stamp sync" role="status">
            {syncMsg}
          </span>
        )}
      </div>

      {syncOpen && (
        <div className="sync-panel">
          <p className="sync-help">
            노래가 밀리면: 연주 시작에서 <strong>오프셋</strong> → 중간마다{' '}
            <strong>앵커</strong> 3~5개 → 필요하면 <strong>앵커→BPM</strong>.
          </p>
          <div className="sync-row">
            <label>
              오프셋(초)
              <input
                type="number"
                min={0}
                step={0.01}
                value={Number(((work.audioOffsetMs ?? 0) / 1000).toFixed(2))}
                onChange={(e) =>
                  setAudioOffsetMs(Math.max(0, (Number(e.target.value) || 0) * 1000))
                }
              />
            </label>
            <label>
              시작 박
              <input
                type="number"
                min={0}
                step={1}
                value={work.syncStartBeat ?? 0}
                onChange={(e) => setSyncStartBeat(Number(e.target.value) || 0)}
              />
            </label>
            <button
              type="button"
              className="btn ghost"
              disabled={!audioFileName}
              onClick={setOffsetHere}
              title="지금 오디오 위치를 오프셋으로"
            >
              지금=오프셋
            </button>
          </div>
          <div className="sync-actions">
            <button
              type="button"
              className="btn"
              disabled={!audioFileName}
              onClick={markCurrentBeat}
            >
              지금=현재 박 앵커
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={!audioFileName}
              onClick={markSelectedLyric}
            >
              지금=선택 가사 앵커
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={userAnchorCount < 1}
              onClick={() => {
                applyAnchorTempo();
                setSyncMsg('앵커 사이 BPM으로 템포맵 갱신');
              }}
            >
              앵커→BPM
            </button>
            <button
              type="button"
              className="btn tiny danger ghost"
              disabled={userAnchorCount === 0}
              onClick={() => {
                clearSyncAnchors();
                setSyncMsg('앵커 삭제됨');
              }}
            >
              앵커 지우기
            </button>
          </div>
          <ul className="sync-anchor-list">
            {anchors.map((a) => (
              <li key={a.id}>
                <span className="sync-anchor-beat">
                  {formatBeat(a.beat, work.beatsPerBar)}
                </span>
                <span className="sync-anchor-ms">{formatAudioMs(a.audioMs)}</span>
                <span className="sync-anchor-label">{a.label || '—'}</span>
                {a.id !== '__sync_start' && (
                  <button
                    type="button"
                    className="btn tiny danger ghost"
                    onClick={() => removeSyncAnchor(a.id)}
                  >
                    삭제
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
