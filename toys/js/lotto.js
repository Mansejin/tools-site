(function () {
'use strict';

  const ALL_URL = 'https://smok95.github.io/lotto/results/all.json';
  const CONSPIRACY_LABELS = ['없음', '약함', '중간', '강함', '확고'];

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

  // ── Analysis engine ──

  let draws = [];
  let stats = null;
  let lastResult = null;
  let genCount = 0;

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
    const freq = Array(46).fill(0);
    const lastSeen = Array(46).fill(allDraws.length + 1);
    const recentFreq = Array(46).fill(0);
    const sums = [];
    let oddCount = 0;
    let lowCount = 0;

    allDraws.forEach((d, i) => {
      let odds = 0;
      let lows = 0;
      let sum = 0;
      d.numbers.forEach((n) => {
        freq[n]++;
        lastSeen[n] = allDraws.length - 1 - i;
        sum += n;
        if (n % 2 === 1) odds++;
        if (n <= 22) lows++;
      });
      sums.push(sum);
      oddCount += odds;
      lowCount += lows;
    });

    const recent = allDraws.slice(-recentWindow);
    recent.forEach((d) => {
      d.numbers.forEach((n) => { recentFreq[n]++; });
    });

    const avgSum = sums.reduce((a, b) => a + b, 0) / Math.max(1, sums.length);
    const sumStd = Math.sqrt(
      sums.reduce((a, s) => a + (s - avgSum) ** 2, 0) / Math.max(1, sums.length)
    );

    return {
      total: allDraws.length,
      latest: allDraws[allDraws.length - 1],
      freq,
      lastSeen,
      recentFreq,
      recentWindow,
      avgSum,
      sumStd,
      avgOdds: oddCount / Math.max(1, allDraws.length),
      avgLows: lowCount / Math.max(1, allDraws.length),
      meanFreq: (allDraws.length * 6) / 45,
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
    const t = Date.now() ^ (Math.random() * 0xffffffff);
    return mulberry32(t >>> 0);
  }

  function weightedPick(weights, rand, exclude) {
    let total = 0;
    const entries = [];
    for (let n = 1; n <= 45; n++) {
      if (exclude.has(n)) continue;
      const w = Math.max(0.0001, weights[n]);
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

  function computeWeights(factors, conspiracyLevel, s) {
    const weights = Array(46).fill(1);
    const c = conspiracyLevel / 100;
    const mean = s.meanFreq || 1;
    const rMean = (s.recentWindow * 6) / 45;

    for (let n = 1; n <= 45; n++) {
      let w = 1;

      if (factors.hot) {
        const hot = s.recentFreq[n] / Math.max(0.5, rMean);
        w *= 0.55 + hot * 0.9;
      }

      if (factors.cold) {
        const gap = s.lastSeen[n];
        const overdue = Math.min(3, gap / Math.max(8, s.recentWindow * 0.35));
        w *= 0.7 + overdue * 0.55;
        const lifetime = s.freq[n] / Math.max(0.5, mean);
        if (lifetime < 0.92) w *= 1.08;
      }

      if (factors.math) {
        // Mild preference toward historically middle-frequency numbers (regression to mean)
        const ratio = s.freq[n] / Math.max(0.5, mean);
        w *= 1.05 - Math.abs(ratio - 1) * 0.25;
        // Slight preference for numbers that help typical odd/even & AC-ish spread later
        if (n >= 8 && n <= 38) w *= 1.04;
      }

      if (factors.physics) {
        // Tongue-in-cheek micro-physics: surface wear, static, drum harmonics
        const wear = 1 + Math.sin(n * 1.618) * 0.08;
        const massBias = 1 + ((23 - n) / 45) * 0.12; // lighter high-number balls float more
        const harmonic = 1 + Math.cos(n * Math.PI / 7.5) * 0.1;
        const staticCling = 1 + ((n % 5 === 0) ? 0.06 : 0);
        w *= wear * massBias * harmonic * staticCling;
      }

      if (factors.conspiracy) {
        // Assume human operators leave fingerprints when "balancing" draws
        // 1) Overcorrect birthday bias → slight boost for 32–45
        if (n >= 32) w *= 1 + 0.22 * c;
        if (n <= 12) w *= 1 - 0.08 * c;
        // 2) Avoid suspiciously lucky digits (7, 3) at high conspiracy
        if (n % 10 === 7 || n === 3) w *= 1 - 0.18 * c;
        // 3) Prefer "looks random" mid-gaps candidates (not too round)
        if (n % 5 === 0) w *= 1 - 0.1 * c;
        // 4) Numbers that recently spiked look "planted" if overused — dampen extreme hot
        if (s.recentFreq[n] >= rMean * 1.8) w *= 1 - 0.2 * c;
        // 5) Human-like affinity for primes when faking randomness poorly
        if (isPrime(n)) w *= 1 + 0.12 * c;
      }

      weights[n] = w;
    }
    return weights;
  }

  function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  }

  function comboScore(nums, factors, s) {
    const sorted = nums.slice().sort((a, b) => a - b);
    let score = 0;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const odds = sorted.filter((n) => n % 2).length;
    const lows = sorted.filter((n) => n <= 22).length;

    if (factors.math) {
      const sumZ = Math.abs(sum - s.avgSum) / Math.max(1, s.sumStd);
      score -= sumZ * 1.4;
      score -= Math.abs(odds - 3) * 0.7;
      score -= Math.abs(lows - 3) * 0.55;
      // consecutive pairs: historically mild presence is ok, triples rare
      let consec = 0;
      for (let i = 1; i < sorted.length; i++) if (sorted[i] === sorted[i - 1] + 1) consec++;
      if (consec >= 3) score -= 2;
      else if (consec === 1) score += 0.3;
      // spread: max-min should not be tiny
      const span = sorted[5] - sorted[0];
      if (span < 20) score -= 1.2;
      if (span > 38) score += 0.2;
    }

    if (factors.conspiracy) {
      // Human-touched sets often look "evenly sprinkled"
      const gaps = [];
      for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
      const gMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const gVar = gaps.reduce((a, g) => a + (g - gMean) ** 2, 0) / gaps.length;
      // Prefer moderate gap variance (not ruler-straight, not clustered)
      score -= Math.abs(Math.sqrt(gVar) - 5.5) * 0.25;
      // Avoid arithmetic sequences
      if (gaps.every((g) => g === gaps[0])) score -= 3;
      // Prefer 2–4 color bands represented
      const bands = new Set(sorted.map((n) => Math.ceil(n / 10)));
      if (bands.size >= 3 && bands.size <= 5) score += 0.6;
    }

    if (factors.physics) {
      // Prefer mix of "heavy/light" balls
      const lowHeavy = sorted.filter((n) => n <= 15).length;
      if (lowHeavy >= 1 && lowHeavy <= 3) score += 0.4;
    }

    return score;
  }

  function generateCombination(factors, conspiracyLevel, s) {
    const rand = seededRand();
    const baseWeights = computeWeights(factors, conspiracyLevel, s);
    let best = null;
    let bestScore = -Infinity;

    const attempts = factors.math || factors.conspiracy ? 48 : 12;
    for (let a = 0; a < attempts; a++) {
      const exclude = new Set();
      const picked = [];
      const jittered = baseWeights.map((w, i) => (i === 0 ? 0 : w * (0.85 + rand() * 0.35)));
      for (let i = 0; i < 6; i++) {
        const n = weightedPick(jittered, rand, exclude);
        exclude.add(n);
        picked.push(n);
      }
      picked.sort((a, b) => a - b);
      const score = comboScore(picked, factors, s) + rand() * 0.15;
      if (score > bestScore) {
        bestScore = score;
        best = picked;
      }
    }

    // bonus: exclude mains, slight cold+physics bias
    const bonusWeights = computeWeights(factors, conspiracyLevel * 0.6, s);
    const exclude = new Set(best);
    const bonus = weightedPick(bonusWeights, rand, exclude);

    return { numbers: best, bonus, score: bestScore };
  }

  function renderBalls(nums, bonus) {
    const balls = nums.map((n) =>
      `<span class="lotto-ball" style="${ballStyle(n)}">${n}</span>`
    ).join('');
    const bonusBall = `<span class="lotto-ball lotto-ball-bonus" style="${ballStyle(bonus)}">${bonus}</span>`;
    return `<div class="lotto-balls">${balls}<span class="lotto-plus">+</span>${bonusBall}</div>`;
  }

  function renderFreqChart(s) {
    const el = document.getElementById('freqChart');
    const max = Math.max(1, ...s.recentFreq.slice(1));
    const items = [];
    for (let n = 1; n <= 45; n++) {
      const h = Math.round((s.recentFreq[n] / max) * 100);
      const cold = s.lastSeen[n] >= s.recentWindow * 0.7;
      items.push(
        `<div class="lotto-freq-bar${cold ? ' is-cold' : ''}" title="${n}: ${s.recentFreq[n]}회">` +
        `<i style="height:${Math.max(4, h)}%"></i><span>${n}</span></div>`
      );
    }
    el.innerHTML = items.join('');
  }

  // ── UI ──

  const dataStatus = document.getElementById('dataStatus');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const resultBox = document.getElementById('resultBox');
  const reportBox = document.getElementById('reportBox');
  const conspiracyLevel = document.getElementById('conspiracyLevel');
  const recentWindow = document.getElementById('recentWindow');
  const factors = { hot: true, cold: true, math: true, physics: true, conspiracy: true };

  function updateLabels() {
    const v = +conspiracyLevel.value;
    document.getElementById('conspiracyVal').textContent =
      CONSPIRACY_LABELS[Math.min(4, Math.floor(v / 25))];
    document.getElementById('recentVal').textContent = recentWindow.value + '회';
  }

  document.getElementById('factorTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-factor]');
    if (!btn) return;
    const key = btn.dataset.factor;
    factors[key] = !factors[key];
    btn.classList.toggle('active', factors[key]);
  });

  conspiracyLevel.addEventListener('input', updateLabels);
  recentWindow.addEventListener('input', () => {
    updateLabels();
    if (draws.length) {
      stats = buildStats(draws, +recentWindow.value);
      renderFreqChart(stats);
    }
  });
  updateLabels();

  function setLoading(on, msg) {
    generateBtn.disabled = on || !stats;
    if (msg) dataStatus.textContent = msg;
  }

  async function loadData() {
    setLoading(true, '역대 당첨번호 불러오는 중…');
    try {
      const res = await fetch(ALL_URL, { cache: 'force-cache' });
      if (!res.ok) throw new Error('fetch failed');
      const raw = await res.json();
      draws = parseDraws(raw);
      if (draws.length < 50) throw new Error('too few draws');
      stats = buildStats(draws, +recentWindow.value);
      const latest = stats.latest;
      dataStatus.textContent =
        `${stats.total}회차 분석 완료 · 최신 ${latest.drawNo}회 (${latest.numbers.join(', ')})`;
      document.getElementById('drawCount').textContent = stats.total.toLocaleString();
      renderFreqChart(stats);
      generateBtn.disabled = false;
    } catch (err) {
      console.error(err);
      dataStatus.textContent = '데이터 로드 실패 — 새로고침 해주세요 (CORS/네트워크)';
      generateBtn.disabled = true;
    }
  }

  function runGenerate() {
    if (!stats) return;
    stats = buildStats(draws, +recentWindow.value);
    resultBox.classList.add('fade');
    reportBox.hidden = true;
    generateBtn.disabled = true;
    dataStatus.textContent = '요인 가중치 계산 · 조합 시뮬레이션 중…';

    setTimeout(() => {
      const result = generateCombination(factors, +conspiracyLevel.value, stats);
      lastResult = result;
      genCount++;
      document.getElementById('genCount').textContent = String(genCount);

      const lines = [];
      const c = +conspiracyLevel.value / 100;
      const sorted = result.numbers;
      const sum = sorted.reduce((a, b) => a + b, 0);
      const odds = sorted.filter((n) => n % 2).length;
      const lows = sorted.filter((n) => n <= 22).length;

      if (factors.hot) {
        const hotOnes = sorted
          .map((n) => ({ n, f: stats.recentFreq[n] }))
          .sort((a, b) => b.f - a.f)
          .slice(0, 2);
        lines.push(`🔥 최근 ${stats.recentWindow}회에서 ${hotOnes.map((x) => x.n).join(', ')}가 상대적으로 자주 출현`);
      }
      if (factors.cold) {
        const coldOnes = sorted
          .map((n) => ({ n, g: stats.lastSeen[n] }))
          .sort((a, b) => b.g - a.g)
          .slice(0, 2);
        lines.push(`❄️ ${coldOnes.map((x) => `${x.n}번(${x.g}회 공백)`).join(', ')} 반등 후보로 가중`);
      }
      if (factors.math) {
        lines.push(`📐 합계 ${sum} (평균 ${stats.avgSum.toFixed(0)}±${stats.sumStd.toFixed(0)}), 홀수 ${odds}개, 저번호 ${lows}개`);
      }
      if (factors.physics) {
        lines.push('⚛️ 공 표면마모·정전기·드럼 공진을 의사물리 모델로 보정 (진지하지 않음)');
      }
      if (factors.conspiracy) {
        const hi = sorted.filter((n) => n >= 32).length;
        if (c > 0.35) {
          lines.push(
            `🕵️ 조작 가정: 생일 편향 과보정 · 운수 숫자 회피 · 간격 분산 위장` +
            (hi ? ` · 고번호 ${hi}개 포함` : '')
          );
        } else {
          lines.push('🕵️ 음모론 강도 낮음 — 인간 개입 흔적 가중치 소량만 적용');
        }
      }
      if (!lines.length) {
        lines.push('🎲 요인 없음 — 사실상 균등 난수에 가깝습니다');
      }
      lines.push(`✨ 보너스 ${result.bonus} · 조합 적합도 ${result.score.toFixed(2)}`);

      resultBox.innerHTML = renderBalls(result.numbers, result.bonus) +
        '<span class="lotto-tap-hint">탭하면 복사</span>';
      resultBox.classList.add('has-result');
      resultBox.classList.remove('fade');
      reportBox.hidden = false;
      reportBox.innerHTML = '<ul>' + lines.map((l) => `<li>${l}</li>`).join('') + '</ul>';
      copyBtn.style.display = '';
      dataStatus.textContent =
        `${stats.total}회차 반영 · ${Object.keys(factors).filter((k) => factors[k]).length}개 요인 활성`;
      generateBtn.disabled = false;
    }, 420 + Math.random() * 380);
  }

  function copyNumbers() {
    if (!lastResult) return;
    const text = lastResult.numbers.join(', ') + ' + ' + lastResult.bonus;
    copyToClipboard(text).then((ok) => showToast(ok ? '📋 번호 복사됨!' : '복사 실패'));
  }

  bindTap(generateBtn, runGenerate);
  bindTap(copyBtn, copyNumbers);
  bindTap(resultBox, () => {
    if (lastResult) copyNumbers();
  });
  bindTap(shareBtn, () => {
    const text = lastResult
      ? `로또 심층 분석기 번호: ${lastResult.numbers.join(', ')} + ${lastResult.bonus}`
      : '로또 심층 분석기 — 수학·물리·음모론으로 번호 뽑기';
    captureAndShare('로또 심층 분석기', text);
  });

  loadData();
})();
