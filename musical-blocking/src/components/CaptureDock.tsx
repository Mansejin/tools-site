import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { lineAtBeat } from '../lib/cues';
import { beatAtMs, bpmAtBeat, msAtBeat, numberAtBeat } from '../lib/tempoMap';
import { formatBeat } from '../lib/interpolation';

/** Unified song transport + live number/lyric readout for capture. */
export function CaptureDock() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const audioFollow = useAppStore((s) => s.audioFollow);
  const audioFileName = useAppStore((s) => s.audioFileName);
  const lastStamp = useAppStore((s) => s.lastStamp);
  const keyframeCount = work.keyframes.length;
  const setPlaying = useAppStore((s) => s.setPlaying);
  const setCurrentBeat = useAppStore((s) => s.setCurrentBeat);
  const setAudioFollow = useAppStore((s) => s.setAudioFollow);
  const setAudioFileName = useAppStore((s) => s.setAudioFileName);
  const clearLastStamp = useAppStore((s) => s.clearLastStamp);
  const setLyricsOpen = useAppStore((s) => s.setLyricsOpen);
  const lyricsOpen = useAppStore((s) => s.lyricsOpen);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [duration, setDuration] = useState(0);
  const [stampFlash, setStampFlash] = useState<string | null>(null);
  const syncing = useRef(false);

  const num = numberAtBeat(currentBeat, work.numbers ?? []);
  const line = lineAtBeat(work.script, currentBeat);
  const bpm = bpmAtBeat(currentBeat, work.tempoMap ?? [], work.bpm);
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

  useEffect(() => {
    if (!lastStamp) return;
    setStampFlash(lastStamp.label);
    const t = window.setTimeout(() => {
      setStampFlash(null);
      clearLastStamp();
    }, 1600);
    return () => window.clearTimeout(t);
  }, [lastStamp, clearLastStamp]);

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

  const togglePlay = () => {
    if (audioFileName && !audioFollow) setAudioFollow(true);
    setPlaying(!isPlaying);
  };

  return (
    <section className={`capture-dock ${isPlaying ? 'live' : ''}`} aria-label="캡처 컨트롤">
      <div className="capture-now">
        <div className="capture-now-top">
          <span className="capture-number">{num?.title ?? work.title}</span>
          <span className="capture-beat">
            {formatBeat(currentBeat, work.beatsPerBar)}
            <span className="capture-beat-meta"> · ♩={bpm}</span>
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
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setPlaying(false);
            setCurrentBeat(0, { syncSelection: true });
            const audio = audioRef.current;
            if (audio) audio.currentTime = 0;
          }}
        >
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
      </div>
    </section>
  );
}
