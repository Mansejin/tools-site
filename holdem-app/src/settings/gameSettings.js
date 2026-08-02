const STORAGE_KEY = 'holdem-pub-settings-v1';

/** Common Korean hold'em pub structures */
export const PRESETS = {
  turbo: {
    id: 'turbo',
    label: '일반 터보',
    startChips: 30000,
    startBB: 200,
    levelMin: 7,
    ante: false,
    buyin: 30000,
    rebuy: 40000,
    maxRebuys: 1,
    seats: 9,
    pushFoldBb: 15,
    rebuyChips: 40000,
  },
  mtt: {
    id: 'mtt',
    label: '롱 MTT',
    startChips: 40000,
    startBB: 200,
    levelMin: 15,
    ante: true,
    buyin: 40000,
    rebuy: 50000,
    maxRebuys: 2,
    seats: 9,
    pushFoldBb: 15,
    rebuyChips: 60000,
  },
};

export const DEFAULT_SETTINGS = { ...PRESETS.turbo, preset: 'turbo' };

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
    return normalize({ ...DEFAULT_SETTINGS, ...raw });
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(s)));
}

export function normalize(s) {
  const n = (v, fallback) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : fallback;
  };
  return {
    preset: s.preset === 'mtt' || s.preset === 'custom' || s.preset === 'turbo' ? s.preset : 'custom',
    startChips: n(s.startChips, 30000),
    startBB: n(s.startBB, 200),
    levelMin: n(s.levelMin, 7),
    ante: Boolean(s.ante),
    buyin: n(s.buyin, 30000),
    rebuy: n(s.rebuy, 40000),
    maxRebuys: Math.max(0, Math.min(5, Math.floor(n(s.maxRebuys, 1)))),
    seats: Math.max(2, Math.min(10, Math.floor(n(s.seats, 9)))),
    pushFoldBb: n(s.pushFoldBb, 15),
    rebuyChips: n(s.rebuyChips, s.rebuy || 40000),
  };
}

export function applyPreset(id) {
  const p = PRESETS[id];
  if (!p) return { ...DEFAULT_SETTINGS, preset: 'custom' };
  return normalize({ ...p, preset: id });
}

/** Assumes BB roughly doubles each level (common turbo structure). */
export function analyze(settings) {
  const s = normalize(settings);
  const startBb = s.startChips / s.startBB;
  const pf = s.pushFoldBb;
  // levels until stack depth ≈ pushFoldBb if BB doubles each level
  const levelsToShort =
    startBb <= pf ? 0 : Math.ceil(Math.log2(startBb / pf));
  const minutesToShort = levelsToShort * s.levelMin;
  const pace =
    s.levelMin <= 8 ? 'turbo' : s.levelMin <= 12 ? 'semi' : 'deep';
  const depth =
    startBb < 80 ? 'shallow' : startBb < 140 ? 'mid' : 'deep';

  return {
    ...s,
    startBb: Math.round(startBb * 10) / 10,
    levelsToShort,
    minutesToShort,
    pace,
    depth,
    totalBuyCost: s.buyin + s.rebuy * s.maxRebuys,
    maxChips: s.startChips + s.rebuyChips * s.maxRebuys,
  };
}

export function structureSummary(a) {
  return `${a.startChips.toLocaleString()}칩 / BB ${a.startBB} (${a.startBb}bb) · ${a.levelMin}분 · ${
    a.ante ? '앤티 있음' : '앤티 없음'
  } · ${a.seats}인`;
}

/** Adaptive bullets for turbo-style guide */
export function turboNarrative(settings) {
  const a = analyze(settings);
  const shortLine =
    a.minutesToShort <= 0
      ? `시작부터 이미 ${a.pushFoldBb}bb 이하에 가깝다. 푸시/폴드 비중을 크게 잡는다.`
      : `시작 ${a.startBb}bb · ${a.levelMin}분 블라인드면 약 ${a.minutesToShort}분(레벨 ${a.levelsToShort}개) 뒤 ${a.pushFoldBb}bb 숏스택 구간이다.`;

  const rebuyLine = `바이인 ${a.buyin.toLocaleString()}원 + 리바 최대 ${a.maxRebuys}회(${a.rebuy.toLocaleString()}원)까지만 쓰는 편이 ROI에 낫다.`;

  const earlyOpen =
    a.ante
      ? '앤티가 있으면 BTN/CO 스틸을 조금 넓혀도 된다.'
      : '앤티가 없으면 초반은 타이트하게. 넓은 스틸은 자제.';

  const iso =
    a.pace === 'turbo'
      ? '리바인러·콜 스테이션은 3벳을 4~5배로 키워 헤즈업을 만든다.'
      : '레벨이 여유 있으면 아이솔 사이즈를 조금 작게 가도 되지만, 콜 많은 상대엔 여전히 블러프 3벳은 뺀다.';

  return {
    summary: shortLine,
    rebuy: rebuyLine,
    earlyOpen,
    iso,
    pushNote: `${a.pushFoldBb}bb 이하면 포지션별 잼 레인지로 전환.`,
    anteNote: a.ante
      ? '앤티·데드머니가 있으니 스틸 가치가 높다.'
      : '앤티 없음 — 데드머니가 적어 초반 도박 핸드를 줄인다.',
    seatsNote: `${a.seats}인 테이블 기준. 얼리는 더 타이트, 버튼은 스틸.`,
  };
}

export function mttNarrative(settings) {
  const a = analyze(settings);
  return {
    summary: `시작 ${a.startBb}bb · ${a.levelMin}분. ${
      a.depth === 'deep' ? '딥스택이라 포스트플랍·임플라이드가 중요하다.' : '깊이가 얕으면 프리플랍 실수가 더 비싸다.'
    }`,
    ante: a.ante
      ? '시작부터 앤티 — BTN/CO에서 블라인드 스틸을 적극적으로.'
      : '앤티가 늦게 들어오면 초반 스틸은 보수적으로.',
    implied:
      a.startBb >= 120
        ? '로우 페어·수티드 커넥터 가치가 높다. 셋·넛드로우면 크게 승부.'
        : '스택이 짧으면 스펙큘레이티브 핸드를 줄이고 프리미엄 위주.',
    lateReg: `리엔트리 칩 ${a.rebuyChips.toLocaleString()} · 늦은 레지면 ${Math.round(
      a.rebuyChips / (a.startBB * 2 ** Math.max(0, a.levelsToShort)),
    )}bb 전후가 될 수 있다. 숏스택 올인은 A고·미들페어로 받는 편이 이득인 경우가 많다.`,
    rebuy: turboNarrative(settings).rebuy,
  };
}

export function huNarrative(settings) {
  const a = analyze(settings);
  return {
    summary: `헤즈업은 보통 ${a.pushFoldBb}bb 이하 숏스택 싸움으로 간다.`,
    value: '밸류 기준이 많이 낮아진다. A·K, 바텀페어도 벳 후보.',
    line: '림프·미니레이즈를 섞어 스택을 지키며 포스트플랍으로.',
    chop: '칩이 조금 더 많으면(예: 6:4) 상금 나누기를 제안해 본다.',
  };
}
