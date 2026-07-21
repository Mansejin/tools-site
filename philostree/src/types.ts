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
  premise: '전제',
  question: '질문',
  argument: '논증',
  objection: '반론',
  synthesis: '종합',
  conclusion: '결론',
  value: '가치',
  intuition: '직관',
};

export const CATEGORY_COLORS: Record<ThoughtCategory, string> = {
  premise: '#6b8cae',
  question: '#9b8ec4',
  argument: '#7ea88a',
  objection: '#c48b8b',
  synthesis: '#c4a882',
  conclusion: '#8b9cb3',
  value: '#d4b896',
  intuition: '#8ba8c4',
};

export const RELATION_LABELS: Record<ThoughtRelation, string> = {
  supports: '뒷받침',
  opposes: '반박',
  implies: '함의',
  questions: '의문',
  analogous: '유사',
};

export const DIRECTION_LABELS: Record<ThoughtDirection, string> = {
  up: '위 (상위 개념)',
  down: '아래 (하위 개념)',
  center: '중앙 (핵심)',
};
