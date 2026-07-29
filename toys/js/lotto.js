(function () {
'use strict';

  const ALL_URL = 'https://smok95.github.io/lotto/results/all.json';
  const MIX_LABELS = ['약함', '약함', '보통', '강함', '최대'];
  const CHI_CRIT_05 = 60.48; // df=44, α=0.05

  const BALL_COLORS = [
    { max: 10, bg: '#fbc400', fg: '#1a1a1a' },
    { max: 20, bg: '#69c8f2', fg: '#1a1a1a' },
    { max: 30, bg: '#ff7272', fg: '#1a1a1a' },
    { max: 40, bg: '#aaaaaa', fg: '#1a1a1a' },
    { max: 45, bg: '#b0d840', fg: '#1a1a1a' },
  ];

  function ballStyle(n) {
    const c = BALL_COLORS.find((x) => n <= x.max) || BALL_COLORS[4];
    return `background:${c.bg};color:${c.fg}`;
  }

  function bindTap(el, handler) {
    let touched = false;
    el.addEventListener('touchend', function (e) {
      touched = true;
      e.preventDefault();
      handler(e);
      setTimeout(() => { touched = false; }, 400);
    }, { passive: false });
    el.addEventListener('click', function (e) {
      if (touched) return;
      handler(e);
    });
  }

  function copyToClipboard(text) {
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;font-size:16px;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    return ok;
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  let sharing = false;
  let html2canvasReady = null;

  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (html2canvasReady) return html2canvasReady;
    html2canvasReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error('html2canvas load failed'));
      document.head.appendChild(s);
    });
    return html2canvasReady;
  }

  function getShareUrl() {
    if (location.protocol === 'file:') return '';
    return location.origin + location.pathname;
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function captureAndShare(title, fallbackText) {
    if (sharing) return;
    sharing = true;
    showToast('📸 화면 캡처 중...');
    try {
      const html2canvas = await loadHtml2Canvas();
      const zone = document.getElementById('shareZone');
      const canvas = await html2canvas(zone, {
        backgroundColor: '#0f0f14',
        scale: Math.min(window.devicePixelRatio || 2, 3),
        useCORS: true,
        logging: false,
        onclone: (doc, clone) => {
          const z = clone.getElementById('shareZone');
          if (z) {
            z.style.padding = '24px 20px';
            z.style.backgroundColor = '#0f0f14';
            z.style.backgroundImage =
              'radial-gradient(ellipse 120% 80% at 20% 0%, rgba(255,107,74,.18) 0%, transparent 55%),' +
              'radial-gradient(ellipse 120% 80% at 80% 100%, rgba(255,209,102,.12) 0%, transparent 55%)';
          }
          clone.querySelectorAll('.no-capture').forEach((el) => {
            el.style.display = 'none';
          });
        },
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
      if (!blob) throw new Error('blob failed');
      const file = new File([blob], 'mansejin-lotto.png', { type: 'image/png' });
      const shareUrl = getShareUrl();
      const shareText = shareUrl ? fallbackText + '\n' + shareUrl : fallbackText;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title, files: [file] });
          showToast('📤 공유 완료!');
          sharing = false;
          return;
        } catch (e) {
          if (e.name === 'AbortError') {
            sharing = false;
            return;
          }
        }
      }
      downloadBlob(blob, 'mansejin-lotto.png');
      if (shareText) await copyToClipboard(shareText);
      showToast('📥 이미지 저장됨! 갤러리에서 붙여넣기 하세요');
    } catch {
      const shareUrl = getShareUrl();
      const shareText = shareUrl ? fallbackText + '\n' + shareUrl : fallbackText;
      copyToClipboard(shareText).then((ok) => {
        showToast(ok ? '📋 캡처 실패 — 텍스트 복사됨' : '📋 캡처 실패');
      });
    }
    sharing = false;
  }

  // ── Stats helpers ──

  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function std(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((a, x) => a + (x - m) ** 2, 0) / arr.length);
  }

  function percentileRank(sortedAsc, value) {
    if (!sortedAsc.length) return 0.5;
    let lo = 0;
    for (let i = 0; i < sortedAsc.length; i++) if (sortedAsc[i] <= value) lo = i + 1;
    return lo / sortedAsc.length;
  }

  function acValue(nums) {
    const s = nums.slice().sort((a, b) => a - b);
    const diffs = new Set();
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) diffs.add(s[j] - s[i]);
    }
    return diffs.size - (s.length - 1);
  }

  function comboFeatures(nums) {
    const s = nums.slice().sort((a, b) => a - b);
    let consec = 0;
    for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1] + 1) consec++;
    return {
      sum: s.reduce((a, b) => a + b, 0),
      odds: s.filter((n) => n % 2).length,
      lows: s.filter((n) => n <= 22).length,
      consec,
      span: s[5] - s[0],
      ac: acValue(s),
      highCount: s.filter((n) => n >= 32).length,
      birthdayHeavy: s.filter((n) => n <= 31).length,
    };
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededRand() {
    return mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  }

  // ── Core analysis ──

  let draws = [];
  let stats = null;
  let lastResults = null;
  let genCount = 0;
  const GAME_COUNT = 5;

  function parseDraws(raw) {
    const list = Array.isArray(raw) ? raw : (raw.results || raw.data || []);
    return list
      .map((d) => {
        const nums = (d.numbers || []).map(Number).filter((n) => n >= 1 && n <= 45);
        if (nums.length !== 6) return null;
        return {
          drawNo: Number(d.draw_no || d.drwNo || d.round || 0),
          numbers: nums.slice().sort((a, b) => a - b),
          bonus: Number(d.bonus_no || d.bnusNo || d.bonus || 0),
          date: d.date || d.drwNoDate || '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.drawNo - b.drawNo);
  }

  function buildStats(allDraws, recentWindow) {
    const N = allDraws.length;
    const freq = Array(46).fill(0);
    const lastIdx = Array(46).fill(-1);
    const gaps = Array.from({ length: 46 }, () => []);
    const recentFreq = Array(46).fill(0);
    const pair = Array.from({ length: 46 }, () => Array(46).fill(0));
    const sums = [];
    const odds = [];
    const lows = [];
    const consecs = [];
    const spans = [];
    const acs = [];
    const decade = Array(5).fill(0);

    allDraws.forEach((d, i) => {
      const f = comboFeatures(d.numbers);
      sums.push(f.sum);
      odds.push(f.odds);
      lows.push(f.lows);
      consecs.push(f.consec);
      spans.push(f.span);
      acs.push(f.ac);

      d.numbers.forEach((n) => {
        freq[n]++;
        if (lastIdx[n] >= 0) gaps[n].push(i - lastIdx[n]);
        lastIdx[n] = i;
        if (i >= N - recentWindow) recentFreq[n]++;
        decade[Math.min(4, Math.floor((n - 1) / 10))]++;
      });

      for (let a = 0; a < 6; a++) {
        for (let b = a + 1; b < 6; b++) {
          pair[d.numbers[a]][d.numbers[b]]++;
          pair[d.numbers[b]][d.numbers[a]]++;
        }
      }
    });

    const expected = (N * 6) / 45;
    let chi = 0;
    for (let n = 1; n <= 45; n++) chi += (freq[n] - expected) ** 2 / expected;

    const avgGap = Array(46).fill(0);
    const gapNow = Array(46).fill(0);
    for (let n = 1; n <= 45; n++) {
      avgGap[n] = gaps[n].length ? mean(gaps[n]) : N / Math.max(1, freq[n]);
      gapNow[n] = lastIdx[n] < 0 ? N : N - 1 - lastIdx[n];
    }

    const pairExpected = (N * 15) / (45 * 44 / 2); // ≈ N * C(6,2)/C(45,2)
    const topPairs = [];
    for (let i = 1; i <= 45; i++) {
      for (let j = i + 1; j <= 45; j++) {
        topPairs.push({ a: i, b: j, c: pair[i][j] });
      }
    }
    topPairs.sort((a, b) => b.c - a.c);

    const byFreq = [];
    for (let n = 1; n <= 45; n++) {
      byFreq.push({
        n,
        f: freq[n],
        r: recentFreq[n],
        gap: gapNow[n],
        avgGap: avgGap[n],
        overdue: gapNow[n] / Math.max(1, avgGap[n]),
      });
    }

    const sortedSums = sums.slice().sort((a, b) => a - b);

    return {
      total: N,
      latest: allDraws[N - 1],
      freq,
      recentFreq,
      recentWindow,
      expected,
      chi,
      uniformOk: chi < CHI_CRIT_05,
      avgGap,
      gapNow,
      pair,
      pairExpected,
      topPairs: topPairs.slice(0, 8),
      byFreq,
      hotRecent: byFreq.slice().sort((a, b) => b.r - a.r || b.f - a.f).slice(0, 8),
      coldGap: byFreq.slice().sort((a, b) => b.overdue - a.overdue || b.gap - a.gap).slice(0, 8),
      coldLife: byFreq.slice().sort((a, b) => a.f - b.f).slice(0, 8),
      shape: {
        sumMean: mean(sums),
        sumStd: std(sums),
        oddsMean: mean(odds),
        lowsMean: mean(lows),
        consecMean: mean(consecs),
        spanMean: mean(spans),
        spanStd: std(spans),
        acMean: mean(acs),
        acStd: std(acs),
        consecDist: {
          zero: consecs.filter((x) => x === 0).length / N,
          one: consecs.filter((x) => x === 1).length / N,
          twoPlus: consecs.filter((x) => x >= 2).length / N,
        },
        oddsMode: modeOf(odds),
        decadePct: decade.map((x) => (x / (N * 6)) * 100),
      },
      sortedSums,
      oddsHist: histCount(odds, 0, 6),
      decade,
    };
  }

  function modeOf(arr) {
    const c = {};
    let best = arr[0];
    let bestN = 0;
    arr.forEach((x) => {
      c[x] = (c[x] || 0) + 1;
      if (c[x] > bestN) {
        bestN = c[x];
        best = x;
      }
    });
    return best;
  }

  function histCount(arr, lo, hi) {
    const h = [];
    for (let i = lo; i <= hi; i++) h.push(arr.filter((x) => x === i).length);
    return h;
  }

  function weightedPick(weights, rand, exclude) {
    let total = 0;
    const entries = [];
    for (let n = 1; n <= 45; n++) {
      if (exclude.has(n)) continue;
      const w = Math.max(1e-9, weights[n]);
      entries.push([n, w]);
      total += w;
    }
    let r = rand() * total;
    for (const [n, w] of entries) {
      r -= w;
      if (r <= 0) return n;
    }
    return entries[entries.length - 1][0];
  }

  function baseWeights(s, factors, strength) {
    const w = Array(46).fill(1);
    const k = strength; // 0..1
    const expR = (s.recentWindow * 6) / 45;

    for (let n = 1; n <= 45; n++) {
      let score = 1;

      if (factors.freq) {
        // Empirical Bayes: shrink lifetime + recent toward mean
        const life = (s.freq[n] + 8) / (s.expected + 8);
        const recent = (s.recentFreq[n] + 2) / (expR + 2);
        const blended = 0.45 * life + 0.55 * recent;
        score *= Math.pow(blended, 0.35 + k * 0.9);
      }

      if (factors.gap) {
        // Overdue vs own average gap (geometric waiting)
        const overdue = s.gapNow[n] / Math.max(1, s.avgGap[n] || 7.5);
        const gapW = Math.pow(Math.min(2.8, Math.max(0.35, overdue)), 0.5 + k * 0.7);
        score *= gapW;
      }

      if (factors.split) {
        // Reduce birthday-band crowding (1–31) so jackpot splits less often
        if (n <= 31) score *= 1 - 0.22 * k;
        else score *= 1 + 0.28 * k;
      }

      w[n] = score;
    }
    return w;
  }

  function applyPairBoost(weights, picked, s, strength) {
    if (!picked.length) return weights;
    const out = weights.slice();
    const exp = s.pairExpected || 18;
    for (let n = 1; n <= 45; n++) {
      if (picked.includes(n)) continue;
      let boost = 1;
      picked.forEach((p) => {
        const c = s.pair[p][n];
        // lift numbers that co-occur more than expected with current picks
        boost *= 1 + strength * 0.55 * ((c - exp) / Math.max(8, exp));
      });
      out[n] *= Math.max(0.25, Math.min(2.4, boost));
    }
    return out;
  }

  function shapeScore(nums, s) {
    const f = comboFeatures(nums);
    const sh = s.shape;
    let score = 0;

    const sumZ = Math.abs(f.sum - sh.sumMean) / Math.max(1, sh.sumStd);
    score -= sumZ * sumZ;

    score -= Math.abs(f.odds - sh.oddsMode) * 0.85;
    score -= Math.abs(f.odds - sh.oddsMean) * 0.35;
    score -= Math.abs(f.lows - sh.lowsMean) * 0.55;

    // Match historical consecutive distribution
    if (f.consec === 0) score += Math.log(sh.consecDist.zero + 0.01);
    else if (f.consec === 1) score += Math.log(sh.consecDist.one + 0.01);
    else score += Math.log(sh.consecDist.twoPlus + 0.01) - (f.consec - 2) * 0.8;

    const spanZ = Math.abs(f.span - sh.spanMean) / Math.max(1, sh.spanStd);
    score -= spanZ * 0.9;

    const acZ = Math.abs(f.ac - sh.acMean) / Math.max(0.5, sh.acStd);
    score -= acZ * 0.7;

    // Decade coverage: prefer 3–5 bands like typical draws
    const bands = new Set(nums.map((n) => Math.min(4, Math.floor((n - 1) / 10))));
    if (bands.size >= 3 && bands.size <= 5) score += 0.45;
    if (bands.size <= 2) score -= 1.1;

    return score;
  }

  function pairScore(nums, s) {
    let score = 0;
    const exp = s.pairExpected || 18;
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const c = s.pair[nums[i]][nums[j]];
        score += (c - exp) / Math.max(6, exp);
      }
    }
    return score;
  }

  function generateCombination(factors, strength, s) {
    const rand = seededRand();
    const active = Object.keys(factors).filter((k) => factors[k]);
    const attempts = factors.shape || factors.pair ? 80 : 24;
    let best = null;
    let bestScore = -Infinity;

    for (let a = 0; a < attempts; a++) {
      let weights = baseWeights(s, factors, strength);
      // jitter so repeats aren't identical
      weights = weights.map((w, i) => (i === 0 ? 0 : w * (0.82 + rand() * 0.4)));

      const exclude = new Set();
      const picked = [];
      for (let i = 0; i < 6; i++) {
        let w = weights;
        if (factors.pair && picked.length) w = applyPairBoost(weights, picked, s, strength);
        const n = weightedPick(w, rand, exclude);
        exclude.add(n);
        picked.push(n);
      }
      picked.sort((x, y) => x - y);

      let score = rand() * 0.05;
      if (factors.shape) score += shapeScore(picked, s) * (0.7 + strength);
      if (factors.pair) score += pairScore(picked, s) * (0.5 + strength * 0.8);
      if (factors.freq) {
        const expR = (s.recentWindow * 6) / 45;
        picked.forEach((n) => {
          score += strength * 0.15 * ((s.recentFreq[n] / Math.max(0.5, expR)) - 1);
        });
      }
      if (factors.gap) {
        picked.forEach((n) => {
          const overdue = s.gapNow[n] / Math.max(1, s.avgGap[n]);
          score += strength * 0.12 * (overdue - 1);
        });
      }
      if (factors.split) {
        const f = comboFeatures(picked);
        if (f.highCount >= 2) score += 0.35 * strength;
        if (f.birthdayHeavy >= 5) score -= 0.9 * strength;
      }

      if (score > bestScore) {
        bestScore = score;
        best = picked;
      }
    }

    // Bonus: weight by gap + mild freq, exclude mains
    const bonusW = baseWeights(s, { freq: true, gap: true, shape: false, pair: false, split: false }, strength * 0.7);
    const bonus = weightedPick(bonusW, rand, new Set(best));

    return {
      numbers: best,
      bonus,
      score: bestScore,
      features: comboFeatures(best),
      strategies: active,
    };
  }

  function comboKey(nums) {
    return nums.slice().sort((a, b) => a - b).join('-');
  }

  function generateGames(factors, strength, s, count) {
    const games = [];
    const seen = new Set();
    let guard = 0;
    while (games.length < count && guard < count * 12) {
      guard++;
      const result = generateCombination(factors, strength, s);
      const key = comboKey(result.numbers);
      if (seen.has(key)) continue;
      seen.add(key);
      games.push(result);
    }
    while (games.length < count) {
      games.push(generateCombination(factors, strength, s));
    }
    games.sort((a, b) => b.score - a.score);
    return games;
  }

  function describeBatch(games, s) {
    const best = games[0];
    const lines = describeResult(best, s);
    lines.unshift(`🎫 ${games.length}게임 생성 · 적합도 순 정렬 (1번이 가장 높음)`);
    const sums = games.map((g) => g.features.sum);
    lines.push(
      `📦 5게임 합계 범위 ${Math.min(...sums)}–${Math.max(...sums)} (역사 평균 ${s.shape.sumMean.toFixed(0)})`
    );
    return lines;
  }

  function describeResult(result, s) {
    const f = result.features;
    const sh = s.shape;
    const lines = [];
    const sumPct = percentileRank(s.sortedSums, f.sum);

    lines.push(
      `📐 합계 ${f.sum} (역사 평균 ${sh.sumMean.toFixed(1)}±${sh.sumStd.toFixed(1)}, 백분위 ${(sumPct * 100).toFixed(0)}%)`
    );
    lines.push(
      `⚖️ 홀수 ${f.odds} · 저번호(≤22) ${f.lows} · 연속쌍 ${f.consec} · AC ${f.ac} · 스팬 ${f.span}`
    );

    if (result.strategies.includes('freq')) {
      const top = result.numbers
        .map((n) => ({ n, r: s.recentFreq[n] }))
        .sort((a, b) => b.r - a.r)
        .slice(0, 3);
      lines.push(
        `📈 최근 ${s.recentWindow}회 출현: ` +
        top.map((x) => `${x.n}(${x.r})`).join(', ')
      );
    }
    if (result.strategies.includes('gap')) {
      const overdue = result.numbers
        .map((n) => ({ n, g: s.gapNow[n], o: s.gapNow[n] / Math.max(1, s.avgGap[n]) }))
        .sort((a, b) => b.o - a.o)
        .slice(0, 3);
      lines.push(
        `⏳ 공백: ` +
        overdue.map((x) => `${x.n}(${x.g}회/${x.o.toFixed(1)}×)`).join(', ')
      );
    }
    if (result.strategies.includes('pair')) {
      const pairs = [];
      for (let i = 0; i < result.numbers.length; i++) {
        for (let j = i + 1; j < result.numbers.length; j++) {
          const a = result.numbers[i];
          const b = result.numbers[j];
          pairs.push({ a, b, c: s.pair[a][b] });
        }
      }
      pairs.sort((a, b) => b.c - a.c);
      const top = pairs.slice(0, 3);
      lines.push(
        `🔗 동반: ` +
        top.map((p) => `${p.a}-${p.b}(${p.c}회,기대~${s.pairExpected.toFixed(0)})`).join(', ')
      );
    }
    if (result.strategies.includes('shape')) {
      lines.push(
        `📊 조합형 적합: 홀수모드 ${sh.oddsMode}, 연속 0/${(sh.consecDist.zero * 100).toFixed(0)}% · 1/${(sh.consecDist.one * 100).toFixed(0)}%`
      );
    }
    if (result.strategies.includes('split')) {
      lines.push(`🎯 분산: 32+ 고번호 ${f.highCount}개 (생일대 편중 완화)`);
    }

    lines.push(`✨ 보너스 ${result.bonus} · 적합도 ${result.score.toFixed(2)}`);
    lines.push(
      s.uniformOk
        ? `ℹ️ 번호별 빈도 χ²=${s.chi.toFixed(1)} < ${CHI_CRIT_05} → 장기 균등성 기각 못함`
        : `ℹ️ 번호별 빈도 χ²=${s.chi.toFixed(1)} (균등성 이탈 신호)`
    );
    return lines;
  }

  // ── UI ──

  const dataStatus = document.getElementById('dataStatus');
  const insightBox = document.getElementById('insightBox');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const resultBox = document.getElementById('resultBox');
  const reportBox = document.getElementById('reportBox');
  const recentWindow = document.getElementById('recentWindow');
  const mixStrength = document.getElementById('mixStrength');
  const factors = { freq: true, gap: true, shape: true, pair: true, split: false };

  function updateLabels() {
    document.getElementById('recentVal').textContent = recentWindow.value + '회';
    const v = +mixStrength.value;
    document.getElementById('mixVal').textContent = MIX_LABELS[Math.min(4, Math.floor(v / 25))];
  }

  document.getElementById('factorTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-factor]');
    if (!btn) return;
    const key = btn.dataset.factor;
    factors[key] = !factors[key];
    btn.classList.toggle('active', factors[key]);
  });

  recentWindow.addEventListener('input', () => {
    updateLabels();
    if (draws.length) refreshStats();
  });
  mixStrength.addEventListener('input', updateLabels);
  updateLabels();

  function renderBalls(nums, bonus) {
    const balls = nums.map((n) =>
      `<span class="lotto-ball" style="${ballStyle(n)}">${n}</span>`
    ).join('');
    const bonusBall = `<span class="lotto-ball lotto-ball-bonus" style="${ballStyle(bonus)}">${bonus}</span>`;
    return `<div class="lotto-balls">${balls}<span class="lotto-plus">+</span>${bonusBall}</div>`;
  }

  function renderGames(games) {
    return (
      `<div class="lotto-games">` +
      games.map((g, i) =>
        `<div class="lotto-game">` +
        `<div class="lotto-game-label">${i + 1} <small>적합 ${g.score.toFixed(1)}</small></div>` +
        renderBalls(g.numbers, g.bonus) +
        `</div>`
      ).join('') +
      `</div><span class="lotto-tap-hint">탭하면 5게임 복사</span>`
    );
  }

  function renderInsight(s) {
    const sh = s.shape;
    insightBox.hidden = false;
    insightBox.innerHTML =
      `<div class="lotto-insight-grid">` +
      `<div><b>χ²</b> ${s.chi.toFixed(1)} ${s.uniformOk ? '(균등 OK)' : '(편향?)'}</div>` +
      `<div><b>합계</b> ${sh.sumMean.toFixed(0)}±${sh.sumStd.toFixed(0)}</div>` +
      `<div><b>홀수</b> 평균 ${sh.oddsMean.toFixed(1)} / 최빈 ${sh.oddsMode}</div>` +
      `<div><b>연속</b> 0:${(sh.consecDist.zero * 100).toFixed(0)}% 1:${(sh.consecDist.one * 100).toFixed(0)}%</div>` +
      `<div><b>AC</b> ${sh.acMean.toFixed(1)}±${sh.acStd.toFixed(1)}</div>` +
      `<div><b>스팬</b> ${sh.spanMean.toFixed(0)}±${sh.spanStd.toFixed(0)}</div>` +
      `</div>`;
  }

  function renderFreqChart(s) {
    const el = document.getElementById('freqChart');
    const maxAll = Math.max(1, ...s.freq.slice(1));
    const maxR = Math.max(1, ...s.recentFreq.slice(1));
    const items = [];
    for (let n = 1; n <= 45; n++) {
      const hAll = Math.round((s.freq[n] / maxAll) * 100);
      const hR = Math.round((s.recentFreq[n] / maxR) * 100);
      const cold = s.gapNow[n] >= s.avgGap[n] * 1.4;
      items.push(
        `<div class="lotto-freq-bar${cold ? ' is-cold' : ''}" title="${n}: 전체 ${s.freq[n]} / 최근 ${s.recentFreq[n]} / 공백 ${s.gapNow[n]}">` +
        `<div class="lotto-freq-pair">` +
        `<i class="lotto-freq-all" style="height:${Math.max(3, hAll)}%"></i>` +
        `<i class="lotto-freq-recent" style="height:${Math.max(3, hR)}%"></i>` +
        `</div><span>${n}</span></div>`
      );
    }
    el.innerHTML = items.join('');
  }

  function renderLists(s) {
    const box = document.getElementById('listsBox');
    const chip = (x, extra) => `<span class="lotto-chip">${x}${extra ? ` <small>${extra}</small>` : ''}</span>`;
    box.innerHTML =
      `<div class="lotto-list"><div class="lotto-list-title">최근 핫</div><div class="lotto-chips">` +
      s.hotRecent.slice(0, 6).map((x) => chip(x.n, x.r + '회')).join('') +
      `</div></div>` +
      `<div class="lotto-list"><div class="lotto-list-title">공백 과다</div><div class="lotto-chips">` +
      s.coldGap.slice(0, 6).map((x) => chip(x.n, x.gap + '회')).join('') +
      `</div></div>` +
      `<div class="lotto-list"><div class="lotto-list-title">누적 저빈도</div><div class="lotto-chips">` +
      s.coldLife.slice(0, 6).map((x) => chip(x.n, x.f + '회')).join('') +
      `</div></div>` +
      `<div class="lotto-list"><div class="lotto-list-title">동반 상위</div><div class="lotto-chips">` +
      s.topPairs.slice(0, 5).map((p) => chip(`${p.a}-${p.b}`, p.c + '회')).join('') +
      `</div></div>`;
  }

  function refreshStats() {
    stats = buildStats(draws, +recentWindow.value);
    const latest = stats.latest;
    dataStatus.textContent =
      `${stats.total}회 전체 로드 · 최신 ${latest.drawNo}회 [${latest.numbers.join(', ')}]+${latest.bonus}` +
      (stats.uniformOk ? ' · 장기 빈도 균등' : ' · 빈도 편차 주의');
    document.getElementById('drawCount').textContent = stats.total.toLocaleString();
    document.getElementById('chiStat').textContent = stats.chi.toFixed(0);
    renderInsight(stats);
    renderFreqChart(stats);
    renderLists(stats);
    generateBtn.disabled = false;
  }

  async function loadData() {
    generateBtn.disabled = true;
    dataStatus.textContent = '역대 당첨번호 불러오는 중…';
    try {
      const res = await fetch(ALL_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('fetch failed');
      const raw = await res.json();
      draws = parseDraws(raw);
      if (draws.length < 50) throw new Error('too few draws');
      refreshStats();
    } catch (err) {
      console.error(err);
      dataStatus.textContent = '데이터 로드 실패 — 새로고침 해주세요';
      generateBtn.disabled = true;
    }
  }

  function runGenerate() {
    if (!stats) return;
    stats = buildStats(draws, +recentWindow.value);
    resultBox.classList.add('fade');
    reportBox.hidden = true;
    generateBtn.disabled = true;
    dataStatus.textContent = `가중치·조합형 적합도 시뮬레이션 중… (${GAME_COUNT}게임)`;

    const strength = +mixStrength.value / 100;
    setTimeout(() => {
      const games = generateGames(factors, strength, stats, GAME_COUNT);
      lastResults = games;
      genCount += games.length;
      document.getElementById('genCount').textContent = String(genCount);

      resultBox.innerHTML = renderGames(games);
      resultBox.classList.add('has-result');
      resultBox.classList.remove('fade');

      const lines = describeBatch(games, stats);
      reportBox.hidden = false;
      reportBox.innerHTML = '<ul>' + lines.map((l) => `<li>${l}</li>`).join('') + '</ul>';
      copyBtn.style.display = '';

      const nActive = Object.keys(factors).filter((k) => factors[k]).length;
      dataStatus.textContent =
        `${stats.total}회 반영 · 전략 ${nActive}개 · ${GAME_COUNT}게임` +
        ` · 강도 ${MIX_LABELS[Math.min(4, Math.floor(strength * 100 / 25))]}`;
      generateBtn.disabled = false;
      renderFreqChart(stats);
      renderLists(stats);
      renderInsight(stats);
    }, 420 + Math.random() * 360);
  }

  function formatGamesText(games) {
    return games.map((g, i) =>
      `${i + 1}) ${g.numbers.join(', ')} + ${g.bonus}`
    ).join('\n');
  }

  function copyNumbers() {
    if (!lastResults || !lastResults.length) return;
    const text = formatGamesText(lastResults);
    copyToClipboard(text).then((ok) => showToast(ok ? '📋 5게임 복사됨!' : '복사 실패'));
  }

  bindTap(generateBtn, runGenerate);
  bindTap(copyBtn, copyNumbers);
  bindTap(resultBox, () => { if (lastResults) copyNumbers(); });
  bindTap(shareBtn, () => {
    const text = lastResults && lastResults.length
      ? `로또 심층 분석 5게임\n${formatGamesText(lastResults)}`
      : '로또 심층 분석기 — 역대 통계 기반 번호 생성';
    captureAndShare('로또 심층 분석기', text);
  });

  loadData();
})();
