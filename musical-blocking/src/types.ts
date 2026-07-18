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

export interface MusicalWork {
  id: string;
  title: string;
  bpm: number;
  beatsPerBar: number;
  stage: StageConfig;
  roles: Role[];
  script: ScriptLine[];
  keyframes: Keyframe[];
  createdAt: number;
  updatedAt: number;
}

export type AppTab = 'stage' | 'settings';
export type SettingsSection = 'works' | 'roles' | 'stage' | 'tempo';
