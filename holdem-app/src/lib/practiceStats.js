const STATS_KEY = 'holdem-practice-stats-v1';

export function loadPracticeStats() {
  try {
    return {
      answered: 0,
      correct: 0,
      wrong: 0,
      exam: 0,
      drill: 0,
      ...JSON.parse(localStorage.getItem(STATS_KEY) || '{}'),
    };
  } catch {
    return { answered: 0, correct: 0, wrong: 0, exam: 0, drill: 0 };
  }
}

/** kind: 'exam' | 'drill' | 'review' */
export function recordAnswer(correct, kind = 'drill') {
  const s = loadPracticeStats();
  s.answered += 1;
  if (correct) s.correct += 1;
  else s.wrong += 1;
  if (kind === 'exam') s.exam = (s.exam || 0) + 1;
  if (kind === 'drill') s.drill = (s.drill || 0) + 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
  return s;
}

export function accuracyPct(s = loadPracticeStats()) {
  if (!s.answered) return 0;
  return Math.round((s.correct / s.answered) * 100);
}
