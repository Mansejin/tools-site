export type Side = 'white' | 'black';

export type RepertoireLine = {
  id: string;
  side: Side;
  titleKo: string;
  titleEn: string;
  why: string;
  ideas: string[];
  eco: string;
  openingName: string;
  pgn: string;
  moves: string[];
};

export type CatalogOpening = {
  eco: string;
  name: string;
  moves: string[];
};

export type Phase = 'pick' | 'drill' | 'play' | 'done';

export type DrillFeedback = {
  kind: 'ok' | 'wrong' | 'hint' | 'complete';
  message: string;
  expectedSan?: string;
};

export type LineProgress = {
  drills: number;
  perfect: number;
  bestStreak: number;
  lastPlayedAt: number;
  weakPlies: number[];
};
