import { v4 as uuid } from 'uuid';
import type {
  MusicalNumber,
  ScriptLine,
  ScriptLineType,
  TempoPoint,
} from '../types';
import { assignBeatsToScript } from './cues';
import { clampBpm, numberColorAt } from './tempoMap';

const SPEAKER_RE =
  /^(?:([A-Z가-힣][A-Z가-힣a-z\s·.-]{0,24}?)\s*[:：]\s*)(.+)$/;
const CUE_RE = /^(?:【|\[|\()(.+?)(?:】|\]|\))\s*$/;
const LYRIC_MARK = /^(?:♪|♫|가사|LYRIC)/i;
const DIR_MARK = /^(?:※|▶|STAGE|무대지시|#)/i;

const NUMBER_RE =
  /(?:넘버|NUMBER|NO\.?)\s*[:：]?\s*([^/|]+?)(?:\s*[|/]\s*|\s*$)/i;
const BPM_RE =
  /(?:BPM|TEMPO|템포|♩\s*=)\s*[:：]?\s*(\d{2,3})/i;

function classify(raw: string): Omit<ScriptLine, 'id'> {
  const text = raw.trimEnd();
  const trimmed = text.trim();

  if (!trimmed) {
    return { type: 'blank', text: '' };
  }

  if (CUE_RE.test(trimmed) || DIR_MARK.test(trimmed)) {
    return {
      type: trimmed.startsWith('【') || trimmed.startsWith('[') ? 'cue' : 'direction',
      text: trimmed,
    };
  }

  if (LYRIC_MARK.test(trimmed)) {
    return {
      type: 'lyric',
      text: trimmed.replace(LYRIC_MARK, '').trim() || trimmed,
    };
  }

  const speakerMatch = trimmed.match(SPEAKER_RE);
  if (speakerMatch) {
    const speaker = speakerMatch[1].trim();
    const body = speakerMatch[2].trim();
    const type: ScriptLineType = /♪|♫/.test(body) ? 'lyric' : 'dialogue';
    return { type, speaker, text: body };
  }

  return { type: 'dialogue', text: trimmed };
}

export interface ParsedScriptBundle {
  script: ScriptLine[];
  numbers: MusicalNumber[];
  tempoMap: TempoPoint[];
}

function cueInner(text: string): string {
  const m = text.trim().match(CUE_RE);
  return (m?.[1] ?? text).trim();
}

/** Build numbers + tempo map from timed script lines. */
export function extractTimingFromScript(
  script: ScriptLine[],
  defaultBpm: number,
): { numbers: MusicalNumber[]; tempoMap: TempoPoint[]; script: ScriptLine[] } {
  const numbers: MusicalNumber[] = [];
  const tempoMap: TempoPoint[] = [];
  let currentNumberId: string | undefined;
  let numberIndex = 0;

  const nextScript = script.map((line) => {
    if (line.type === 'blank' || line.beat == null) return line;

    const inner = cueInner(line.text);
    const numberMatch = inner.match(NUMBER_RE);
    const bpmMatch = inner.match(BPM_RE) || line.text.match(BPM_RE);

    if (numberMatch) {
      const title = numberMatch[1].trim().replace(/\s*BPM.*$/i, '').trim();
      const bpm = bpmMatch ? clampBpm(Number(bpmMatch[1])) : undefined;
      const num: MusicalNumber = {
        id: uuid(),
        title: title || `넘버 ${numberIndex + 1}`,
        startBeat: line.beat,
        bpm,
        color: numberColorAt(numberIndex),
        sourceLineId: line.id,
      };
      // Close previous number
      if (numbers.length > 0 && numbers[numbers.length - 1].endBeat == null) {
        numbers[numbers.length - 1] = {
          ...numbers[numbers.length - 1],
          endBeat: line.beat,
        };
      }
      numbers.push(num);
      currentNumberId = num.id;
      numberIndex += 1;

      if (bpm != null) {
        tempoMap.push({
          id: uuid(),
          beat: line.beat,
          bpm,
          label: num.title,
          sourceLineId: line.id,
        });
      }

      return { ...line, numberId: num.id };
    }

    if (bpmMatch && line.type === 'cue') {
      const bpm = clampBpm(Number(bpmMatch[1]));
      tempoMap.push({
        id: uuid(),
        beat: line.beat,
        bpm,
        label: `BPM ${bpm}`,
        sourceLineId: line.id,
      });
    }

    return currentNumberId ? { ...line, numberId: currentNumberId } : line;
  });

  // Ensure default tempo point at beat 0 if map is empty or starts later
  if (tempoMap.length === 0 || tempoMap[0].beat > 0) {
    tempoMap.unshift({
      id: uuid(),
      beat: 0,
      bpm: defaultBpm,
      label: '기본',
    });
  }

  return {
    script: nextScript,
    numbers,
    tempoMap: tempoMap.sort((a, b) => a.beat - b.beat),
  };
}

/** Parse plain-text script into lines with beats, numbers, and tempo map. */
export function parseScriptBundle(
  raw: string,
  defaultBpm = 120,
  cueSpacing = 2,
): ParsedScriptBundle {
  const lines = raw.replace(/\r\n/g, '\n').split('\n').map((line) => {
    const parsed = classify(line);
    return { id: uuid(), ...parsed };
  });
  const script = assignBeatsToScript(lines, { spacing: cueSpacing });
  return extractTimingFromScript(script, defaultBpm);
}

/** Parse plain-text script into interactive lines with auto-assigned beats. */
export function parseScript(raw: string): ScriptLine[] {
  return parseScriptBundle(raw).script;
}

export function formatCueLabel(
  line: ScriptLine | undefined,
  selectionText?: string,
): string {
  if (!line) return selectionText || '큐';
  const speaker = line.speaker ? `${line.speaker}: ` : '';
  const body = selectionText || line.text;
  const clipped = body.length > 40 ? `${body.slice(0, 40)}…` : body;
  return `${speaker}${clipped}`;
}

export const SAMPLE_SCRIPT = `작품: 샘플 뮤지컬 — 연습용

【넘버: 프롤로그 / BPM 96】
【커튼 오픈】
※ 무대 중앙에 의자 하나

나레이션: 어느 봄날의 저녁이었습니다.

민수: 여기가… 네가 말한 그 자리야?
지아: 응. 기억나지? 우리가 처음 만난 곳.

【넘버: 바람이 불어오면 / BPM 120】
♪ 지아
바람이 불어오면
그 노래를 들을 수 있어

【BPM 144】
※ 템포 업 — 후렴

민수: 같이 가자. 조금만 더 앞으로.
지아: 좋아. 손 잡아.

【넘버: 엔딩 / BPM 88】
※ 두 사람, 무대 앞쪽으로 이동

민수: (속삭이며) 준비됐어?
지아: 언제나.
`;
