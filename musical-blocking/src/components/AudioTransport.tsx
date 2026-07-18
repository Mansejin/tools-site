import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { beatAtMs, msAtBeat } from '../lib/tempoMap';

/** Song-based capture: play audio and stamp blocking at the playhead. */
export function AudioTransport() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const audioFollow = useAppStore((s) => s.audioFollow);
  const audioFileName = useAppStore((s) => s.audioFileName);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const setCurrentBeat = useAppStore((s) => s.setCurrentBeat);
  const setAudioFollow = useAppStore((s) => s.setAudioFollow);
  const setAudioFileName = useAppStore((s) => s.setAudioFileName);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [duration, setDuration] = useState(0);
  const syncing = useRef(false);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  // Audio → playhead
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFollow) return;

    const onTime = () => {
      if (syncing.current) return;
      const beat = beatAtMs(
        audio.currentTime * 1000,
        work.tempoMap ?? [],
        work.bpm,
      );
      setCurrentBeat(beat, { syncSelection: true });
    };
    const onEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioFollow, work.tempoMap, work.bpm, setCurrentBeat, setPlaying]);

  // Playhead / play state → audio (when not following scrub from audio)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFollow || !audioFileName) return;

    const targetSec =
      msAtBeat(currentBeat, work.tempoMap ?? [], work.bpm) / 1000;
    if (Math.abs(audio.currentTime - targetSec) > 0.35) {
      syncing.current = true;
      audio.currentTime = Math.max(0, targetSec);
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
    work.tempoMap,
    work.bpm,
    setPlaying,
  ]);

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
    setPlaying(false);
  };

  return (
    <div className="audio-transport">
      <div className="audio-transport-head">
        <strong>노래로 찍기</strong>
        <span className="hint">
          곡 올리고 재생 → 배역만 옮기면 현재 순간에 키프레임 저장 (대사 클릭 불필요)
        </span>
      </div>
      <div className="audio-transport-controls">
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
        <button
          type="button"
          className="btn"
          disabled={!audioFileName}
          onClick={() => {
            if (!audioFollow) setAudioFollow(true);
            setPlaying(!isPlaying);
          }}
        >
          {isPlaying ? '일시정지' : '곡 재생'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={!audioFileName}
          onClick={() => {
            setPlaying(false);
            setCurrentBeat(0);
            const audio = audioRef.current;
            if (audio) audio.currentTime = 0;
          }}
        >
          처음으로
        </button>
        {audioFileName && (
          <button type="button" className="btn tiny danger ghost" onClick={clearAudio}>
            곡 제거
          </button>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={audioFollow}
            disabled={!audioFileName}
            onChange={(e) => setAudioFollow(e.target.checked)}
          />
          노래에 타임라인 맞추기
        </label>
        <span className="audio-meta">
          {audioFileName
            ? `${audioFileName}${duration ? ` · ${Math.round(duration)}초` : ''}`
            : '오디오 없음 — 타임라인 재생만으로도 배역 드래그 가능'}
        </span>
      </div>
    </div>
  );
}
