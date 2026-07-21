import { v4 as uuid } from 'uuid';
import type { ThoughtCategory, ThoughtDirection, ThoughtMap, ThoughtNode, ThoughtRelation } from '../types';

export function createEmptyMap(title = '새 사유 맵'): ThoughtMap {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    title,
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createNode(
  partial: Partial<ThoughtNode> & Pick<ThoughtNode, 'title'>,
): ThoughtNode {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? uuid(),
    title: partial.title,
    body: partial.body ?? '',
    depth: partial.depth ?? 0,
    direction: partial.direction ?? 'center',
    importance: partial.importance ?? 0.8,
    category: partial.category ?? 'argument',
    tags: partial.tags ?? [],
    parentId: partial.parentId ?? null,
    inInbox: partial.inInbox ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEdge(
  sourceId: string,
  targetId: string,
  relation: ThoughtRelation = 'supports',
  label = '',
) {
  return {
    id: uuid(),
    sourceId,
    targetId,
    relation,
    label,
  };
}

export function createSampleMap(): ThoughtMap {
  const now = new Date().toISOString();
  const mapId = uuid();

  const nodes: ThoughtNode[] = [
    {
      id: 'n-premise-1',
      title: '인간은 자유로운가?',
      body: '자유의지 문제의 출발점 — 결정론과 자유의지의 대립',
      depth: 0,
      direction: 'center',
      importance: 0.9,
      category: 'question',
      tags: ['자유의지'],
      parentId: null,
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-premise-2',
      title: '모든 사건에는 원인이 있다',
      body: '라플라스의 결정론적 세계관',
      depth: 0,
      direction: 'up',
      importance: 0.6,
      category: 'premise',
      tags: ['결정론'],
      parentId: null,
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-premise-3',
      title: '도덕적 책임은 선택에서 온다',
      body: '책임의 전제로서 자유 선택의 필요성',
      depth: 0,
      direction: 'down',
      importance: 0.6,
      category: 'premise',
      tags: ['윤리학'],
      parentId: null,
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-value-1',
      title: '자유는 인간 존엄의 핵심',
      body: '칸트: 자율성(autonomy)은 인간 존엄의 근거',
      depth: 1,
      direction: 'center',
      importance: 1.0,
      category: 'value',
      tags: ['칸트', '존엄'],
      parentId: 'n-premise-1',
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-arg-1',
      title: '양자역학은 비결정론을 시사한다',
      body: '미시세계의 확률적 본질이 거시적 자유를 열 수 있는가?',
      depth: 2,
      direction: 'up',
      importance: 0.7,
      category: 'argument',
      tags: ['양자역학'],
      parentId: 'n-value-1',
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-arg-2',
      title: '자유는 환상일 수 있다',
      body: '자유의지는 뇌의 사후 합리화일 뿐이라는 주장',
      depth: 2,
      direction: 'down',
      importance: 0.7,
      category: 'objection',
      tags: ['신경과학'],
      parentId: 'n-value-1',
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-conc-1',
      title: '실용적 자유로서의 자율성',
      body: '형이상학적 자유 여부와 무관하게, 자율적 행위의 개념은 유효하다',
      depth: 3,
      direction: 'center',
      importance: 0.85,
      category: 'conclusion',
      tags: ['실용주의'],
      parentId: 'n-arg-2',
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const edges = [
    createEdge('n-premise-1', 'n-value-1', 'implies'),
    createEdge('n-premise-2', 'n-value-1', 'opposes'),
    createEdge('n-premise-3', 'n-value-1', 'supports'),
    createEdge('n-value-1', 'n-arg-1', 'supports'),
    createEdge('n-value-1', 'n-arg-2', 'questions'),
    createEdge('n-arg-1', 'n-conc-1', 'supports'),
    createEdge('n-arg-2', 'n-conc-1', 'implies'),
  ];

  return {
    id: mapId,
    title: '자유의지 탐구',
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };
}

export function nextDepth(parent: ThoughtNode | undefined): number {
  return parent ? parent.depth + 1 : 0;
}

export function defaultCategoryForDepth(depth: number): ThoughtCategory {
  if (depth === 0) return 'question';
  if (depth === 1) return 'value';
  if (depth >= 3) return 'conclusion';
  return 'argument';
}

export function defaultDirection(
  relation: 'deeper' | 'above' | 'below' | 'beside',
): ThoughtDirection {
  if (relation === 'above') return 'up';
  if (relation === 'below') return 'down';
  return 'center';
}
