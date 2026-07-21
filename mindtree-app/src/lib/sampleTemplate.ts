import { v4 as uuid } from 'uuid';
import type { ThoughtCategory, ThoughtDirection, ThoughtMap, ThoughtNode, ThoughtRelation } from '../types';

export function createEmptyMap(title = '새 생각 맵'): ThoughtMap {
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
      id: 'n-root',
      title: '나는 어떤 삶을 살고 싶은가?',
      body: '흩어진 생각의 출발점 — 방향을 잡기 위한 핵심 질문',
      depth: 0,
      direction: 'center',
      importance: 0.9,
      category: 'question',
      tags: ['미래', '깊은 생각'],
      parentId: null,
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-family',
      title: '가족과 함께하는 시간',
      body: '주말엔 부모님과 식사, 아이와 충분히 놀아주기',
      depth: 0,
      direction: 'up',
      importance: 0.65,
      category: 'value',
      tags: ['가족'],
      parentId: null,
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-work',
      title: '의미 있는 일을 하고 싶다',
      body: '돈만이 아니라 성장과 기여를 느끼는 업무',
      depth: 0,
      direction: 'down',
      importance: 0.65,
      category: 'value',
      tags: ['업무'],
      parentId: null,
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-core',
      title: '균형 잡힌 삶이 나의 답',
      body: '일, 관계, 나 자신 — 어느 하나만으로는 충분하지 않다',
      depth: 1,
      direction: 'center',
      importance: 1.0,
      category: 'value',
      tags: ['미래', '철학'],
      parentId: 'n-root',
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-dream',
      title: '3년 안에 나만의 프로젝트',
      body: '사이드 프로젝트로 꿈꿔온 것을 현실로',
      depth: 2,
      direction: 'up',
      importance: 0.7,
      category: 'argument',
      tags: ['꿈', '업무'],
      parentId: 'n-core',
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-relation',
      title: '깊은 대화를 나누는 친구들',
      body: '얕은 모임보다 진솔한 관계를 우선',
      depth: 2,
      direction: 'down',
      importance: 0.7,
      category: 'argument',
      tags: ['대인관계'],
      parentId: 'n-core',
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'n-next',
      title: '이번 달 할 일 하나 정하기',
      body: '거창한 계획보다 작은 첫 걸음 — 구체적 행동 하나',
      depth: 3,
      direction: 'center',
      importance: 0.85,
      category: 'conclusion',
      tags: ['미래'],
      parentId: 'n-dream',
      inInbox: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const edges = [
    createEdge('n-root', 'n-core', 'implies'),
    createEdge('n-family', 'n-core', 'supports'),
    createEdge('n-work', 'n-core', 'supports'),
    createEdge('n-core', 'n-dream', 'supports'),
    createEdge('n-core', 'n-relation', 'supports'),
    createEdge('n-dream', 'n-next', 'implies'),
    createEdge('n-relation', 'n-next', 'supports'),
  ];

  return {
    id: mapId,
    title: '나의 방향',
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };
}

export function createTopicMap(topic: string): ThoughtMap {
  const map = createEmptyMap(`${topic}에 대한 생각`);
  const root = createNode({
    title: `${topic}에 대해 생각해보기`,
    body: '머릿속에 떠오르는 것을 자유롭게 적어보세요.',
    depth: 0,
    direction: 'center',
    importance: 1,
    category: 'question',
    tags: [topic],
  });
  map.nodes.push(root);
  return map;
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
