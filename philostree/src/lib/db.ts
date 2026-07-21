import Dexie, { type Table } from 'dexie';
import type { ThoughtMap } from '../types';

class PhilosTreeDB extends Dexie {
  maps!: Table<ThoughtMap, string>;

  constructor() {
    super('philostree');
    this.version(1).stores({
      maps: 'id, title, updatedAt',
    });
  }
}

export const db = new PhilosTreeDB();

export async function saveMap(map: ThoughtMap): Promise<void> {
  await db.maps.put(map);
}

export async function loadMap(id: string): Promise<ThoughtMap | undefined> {
  return db.maps.get(id);
}

export async function loadAllMaps(): Promise<ThoughtMap[]> {
  return db.maps.orderBy('updatedAt').reverse().toArray();
}

export async function deleteMap(id: string): Promise<void> {
  await db.maps.delete(id);
}

export function exportMapJson(map: ThoughtMap): string {
  return JSON.stringify(map, null, 2);
}

export function importMapJson(json: string): ThoughtMap {
  const parsed = JSON.parse(json) as ThoughtMap;
  if (!parsed.id || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid map format');
  }
  return parsed;
}
