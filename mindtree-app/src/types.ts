export const LIFE_TOPICS = [
  '꿈',
  '미래',
  '업무',
  '가족',
  '대인관계',
  '깊은 생각',
  '철학',
] as const;

export type LifeTopic = (typeof LIFE_TOPICS)[number];

export type ThoughtDirection = 'up' | 'down' | 'center';

export type ThoughtCategory =
  | 'premise'
  | 'question'
  | 'argument'
  | 'objection'
  | 'synthesis'
  | 'conclusion'
  | 'value'
  | 'intuition';

export type ThoughtRelation =
  | 'supports'
  | 'opposes'
  | 'implies'
  | 'questions'
  | 'analogous';

export type ThoughtNode = {
  id: string;
  title: string;
  body: string;
  depth: number;
  direction: ThoughtDirection;
  importance: number;
  category: ThoughtCategory;
  tags: string[];
  parentId: string | null;
  inInbox: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ThoughtEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relation: ThoughtRelation;
  label: string;
};

export type ThoughtMap = {
  id: string;
  title: string;
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  createdAt: string;
  updatedAt: string;
};

export const CATEGORY_LABELS: Record<ThoughtCategory, string> = {
  premise: '배경',
  question: '질문',
  argument: '생각',
  objection: '걱정',
  synthesis: '종합',
  conclusion: '결론',
  value: '핵심',
  intuition: '직감',
};

export const CATEGORY_COLORS: Record<ThoughtCategory, string> = {
  premise: '#a8a29a',
  question: '#9a948c',
  argument: '#8a847c',
  objection: '#b0a098',
  synthesis: '#e07a3a',
  conclusion: '#9a948c',
  value: '#e07a3a',
  intuition: '#a8a29a',
};

export const RELATION_LABELS: Record<ThoughtRelation, string> = {
  supports: '뒷받침',
  opposes: '걱정',
  implies: '이어짐',
  questions: '의문',
  analogous: '비슷함',
};

export const DIRECTION_LABELS: Record<ThoughtDirection, string> = {
  up: '위 (큰 그림)',
  down: '아래 (구체적)',
  center: '중앙 (핵심)',
};
