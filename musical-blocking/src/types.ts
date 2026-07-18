export interface Position {
  x: number; // 0–1, stage left → right
  y: number; // 0–1, upstage → downstage
}

export interface Role {
  id: string;
  name: string;
  shortName: string;
  color: string;
  visible: boolean;
}

export interface StageConfig {
  widthM: number;
  depthM: number;
  showGrid: boolean;
  gridDivisions: number;
}

export type ScriptLineType = 'dialogue' | 'lyric' | 'cue' | 'direction' | 'blank';

export interface ScriptLine {
  id: string;
  type: ScriptLineType;
  speaker?: string;
  text: string;
  beat?: number;
  /** Optional link to musical number id */
  numberId?: string;
}

export interface CharSelection {
  lineId: string;
  start: number;
  end: number;
  text: string;
}

export interface Keyframe {
  id: string;
  beat: number;
  cueLineId?: string;
  cueLabel?: string;
  charSelection?: CharSelection;
  positions: Record<string, Position>;
  note?: string;
}

/** Stepped tempo change at a musical beat. */
export interface TempoPoint {
  id: string;
  beat: number;
  bpm: number;
  label?: string;
  /** Script line that created this point, if any */
  sourceLineId?: string;
}

/** Named musical number / song section spanning a beat range. */
export interface MusicalNumber {
  id: string;
  title: string;
  startBeat: number;
  endBeat?: number;
  /** BPM introduced at the start of this number (also mirrored in tempoMap). */
  bpm?: number;
  color: string;
  sourceLineId?: string;
}

export interface MusicalWork {
  id: string;
  title: string;
  /** Default BPM before the first tempo-map point. */
  bpm: number;
  beatsPerBar: number;
  tempoMap: TempoPoint[];
  numbers: MusicalNumber[];
  stage: StageConfig;
  roles: Role[];
  script: ScriptLine[];
  keyframes: Keyframe[];
  createdAt: number;
  updatedAt: number;
}

export type AppTab = 'stage' | 'settings';
export type SettingsSection = 'works' | 'roles' | 'stage' | 'tempo';
