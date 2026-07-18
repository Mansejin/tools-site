import { useAppStore } from '../store/useAppStore';
import { lineAtBeat } from '../lib/cues';
import { bpmAtBeat, numberAtBeat } from '../lib/tempoMap';
import { formatBeat } from '../lib/interpolation';

/** Live lyric / number readout driven by the playhead (audio or timeline). */
export function NowPlaying() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const audioFollow = useAppStore((s) => s.audioFollow);
  const audioFileName = useAppStore((s) => s.audioFileName);

  const num = numberAtBeat(currentBeat, work.numbers ?? []);
  const line = lineAtBeat(work.script, currentBeat);
  const bpm = bpmAtBeat(currentBeat, work.tempoMap ?? [], work.bpm);

  const lyric =
    line && line.type !== 'blank' && line.type !== 'direction'
      ? `${line.speaker ? `${line.speaker}: ` : ''}${line.text}`
      : line?.type === 'direction' || line?.type === 'cue'
        ? line.text
        : '—';

  return (
    <div className={`now-playing ${isPlaying ? 'live' : ''}`}>
      <div className="now-playing-meta">
        <span className="now-number">{num?.title ?? work.title}</span>
        <span className="now-beat">
          {formatBeat(currentBeat, work.beatsPerBar)} · ♩={bpm}
          {audioFollow && audioFileName ? ' · 노래 연동' : ''}
        </span>
      </div>
      <p className="now-lyric" title={lyric}>
        {lyric}
      </p>
    </div>
  );
}
