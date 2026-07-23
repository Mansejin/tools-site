import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LineProgress } from '../types';

type ProgressState = {
  byLine: Record<string, LineProgress>;
  recordDrill: (lineId: string, perfect: boolean, wrongPlies: number[]) => void;
  get: (lineId: string) => LineProgress;
};

const empty = (): LineProgress => ({
  drills: 0,
  perfect: 0,
  bestStreak: 0,
  lastPlayedAt: 0,
  weakPlies: [],
});

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      byLine: {},
      get: (lineId) => get().byLine[lineId] ?? empty(),
      recordDrill: (lineId, perfect, wrongPlies) => {
        set((state) => {
          const prev = state.byLine[lineId] ?? empty();
          const weak = new Set(prev.weakPlies);
          for (const p of wrongPlies) weak.add(p);
          const nextStreak = perfect ? prev.bestStreak + 1 : 0;
          return {
            byLine: {
              ...state.byLine,
              [lineId]: {
                drills: prev.drills + 1,
                perfect: prev.perfect + (perfect ? 1 : 0),
                bestStreak: Math.max(prev.bestStreak, nextStreak),
                lastPlayedAt: Date.now(),
                weakPlies: [...weak].slice(-12),
              },
            },
          };
        });
      },
    }),
    { name: 'mansejin-chess-openings-progress' },
  ),
);
