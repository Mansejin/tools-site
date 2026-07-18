import { v4 as uuid } from 'uuid';
import type { ScriptLine, ScriptLineType } from '../types';
import { assignBeatsToScript } from './cues';

const SPEAKER_RE =
  /^(?:([A-Z가-힣][A-Z가-힣a-z\s·.-]{0,24}?)\s*[:：]\s*)(.+)$/;
const CUE_RE = /^(?:【|\[|\()(.+?)(?:】|\]|\))\s*$/;
const LYRIC_MARK = /^(?:♪|♫|가사|LYRIC)/i;
const DIR_MARK = /^(?:※|▶|STAGE|무대지시|#)/i;

function classify(raw: string): Omit<ScriptLine, 'id'> {
  const text = raw.trimEnd();
  const trimmed = text.trim();

  if (!trimmed) {
    return { type: 'blank', text: '' };
  }

  if (CUE_RE.test(trimmed) || DIR_MARK.test(trimmed)) {
    return { type: trimmed.startsWith('【') || trimmed.startsWith('[') ? 'cue' : 'direction', text: trimmed };
  }

  if (LYRIC_MARK.test(trimmed)) {
    return { type: 'lyric', text: trimmed.replace(LYRIC_MARK, '').trim() || trimmed };
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

/** Parse plain-text script into interactive lines with auto-assigned beats. */
export function parseScript(raw: string): ScriptLine[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n').map((line) => {
    const parsed = classify(line);
    return { id: uuid(), ...parsed };
  });
  return assignBeatsToScript(lines);
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

【커튼 오픈】
※ 무대 중앙에 의자 하나

나레이션: 어느 봄날의 저녁이었습니다.

민수: 여기가… 네가 말한 그 자리야?
지아: 응. 기억나지? 우리가 처음 만난 곳.

♪ 지아
바람이 불어오면
그 노래를 들을 수 있어

【음악 전환 — 템포 업】

민수: 같이 가자. 조금만 더 앞으로.
지아: 좋아. 손 잡아.

※ 두 사람, 무대 앞쪽으로 이동

민수: (속삭이며) 준비됐어?
지아: 언제나.
`;
