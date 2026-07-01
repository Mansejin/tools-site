(function () {
'use strict';
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
      if (!text) return false;

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

        const file = new File([blob], 'mansejin-share.png', { type: 'image/png' });
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

        downloadBlob(blob, 'mansejin-share.png');
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


    // ── 탈모 확률 계산기 ──
    const hairAge = document.getElementById('hairAge');
    const hairStress = document.getElementById('hairStress');
    const hairCoffee = document.getElementById('hairCoffee');
    const hairSleep = document.getElementById('hairSleep');
    const hairGenetics = document.getElementById('hairGenetics');
    const hairResultBox = document.getElementById('hairResultBox');
    const hairProgressWrap = document.getElementById('hairProgressWrap');
    const hairProgressFill = document.getElementById('hairProgressFill');
    const hairScan = document.getElementById('hairScan');
    const hairCopyBtn = document.getElementById('hairCopyBtn');
    let hairResultText = '';

    const HAIR_VIP_KEY = '_m_hv';
    const HAIR_ADMIN_KEY = '_m_ha';
    const DEFAULT_VIP = ['강성민', '심성우', '송준오'];
    const VIP_VERDICTS = [
      '이미 탈모로 판명났습니다. 재검사 불필요.',
      '공인 탈모로 데이터베이스에 등록되어 있습니다.',
      '과학이 포기한 케이스입니다.',
      '머리카락은 이미 역사가 되었습니다.',
    ];

    function normHairName(s) {
      return s.trim().replace(/\s/g, '');
    }

    function getVipList() {
      try {
        const raw = localStorage.getItem(HAIR_VIP_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      saveVipList(DEFAULT_VIP);
      return DEFAULT_VIP.slice();
    }

    function saveVipList(list) {
      localStorage.setItem(HAIR_VIP_KEY, JSON.stringify(list));
    }

    function isVipName(name) {
      const n = normHairName(name);
      if (!n || n === '당신') return false;
      return getVipList().some((x) => normHairName(x) === n);
    }

    function renderVipAdmin() {
      const ul = document.getElementById('hairVipList');
      const list = getVipList();
      ul.innerHTML = list.map((name, i) =>
        `<li class="hair-vip-item"><span>${name}</span><button type="button" class="hair-vip-del" data-idx="${i}">삭제</button></li>`
      ).join('');
    }

    function showHairAdmin() {
      sessionStorage.setItem(HAIR_ADMIN_KEY, '1');
      const el = document.getElementById('hairAdmin');
      el.hidden = false;
      renderVipAdmin();
    }


    let emojiTaps = 0;
    let emojiTapTimer = null;
    document.getElementById('headerEmoji').addEventListener('click', () => {
      emojiTaps++;
      clearTimeout(emojiTapTimer);
      emojiTapTimer = setTimeout(() => { emojiTaps = 0; }, 2000);
      if (emojiTaps >= 5) {
        emojiTaps = 0;
        showHairAdmin();
        showToast('🔒 관리 패널 열림');
      }
    });

    document.getElementById('hairVipList').addEventListener('click', (e) => {
      const btn = e.target.closest('.hair-vip-del');
      if (!btn) return;
      const list = getVipList();
      list.splice(+btn.dataset.idx, 1);
      saveVipList(list);
      renderVipAdmin();
    });

    document.getElementById('hairVipAddBtn').addEventListener('click', () => {
      const input = document.getElementById('hairVipInput');
      const name = input.value.trim();
      if (!name) return;
      const list = getVipList();
      if (!list.some((x) => normHairName(x) === normHairName(name))) {
        list.push(name);
        saveVipList(list);
      }
      input.value = '';
      renderVipAdmin();
    });

    const stressLabels = ['없음', '약간', '보통', '심함', '지옥'];
    const geneticsLabels = ['없음', '살짝', '보통', '강함', '치명적'];

    function updateHairLabels() {
      document.getElementById('hairAgeVal').textContent = hairAge.value + '세';
      const s = +hairStress.value;
      document.getElementById('hairStressVal').textContent = stressLabels[Math.min(4, Math.floor(s / 25))];
      document.getElementById('hairCoffeeVal').textContent = hairCoffee.value + '잔';
      document.getElementById('hairSleepVal').textContent = hairSleep.value + '시간';
      const g = +hairGenetics.value;
      document.getElementById('hairGeneticsVal').textContent = geneticsLabels[Math.min(4, Math.floor(g / 25))];
    }

    [hairAge, hairStress, hairCoffee, hairSleep, hairGenetics].forEach((el) => {
      el.addEventListener('input', updateHairLabels);
    });
    updateHairLabels();

    const scanSteps = [
      '모낭 밀도 스캔 중...',
      'DHT 호르몬 수치 분석 중...',
      '정수리 위성 사진 로딩 중...',
      '두피 DNA 시퀀싱 중...',
      '탈모 유전자 17번 염색체 확인 중...',
      '최종 결과 산출 중...',
    ];

    const verdicts = [
      '이마 라인이 후퇴할 준비를 마쳤습니다',
      '미래의 당신이 대머리를 쓰고 계십니다',
      '샴푸 광고 모델은 포기하세요',
      '모자 업계에 희소식입니다',
      '정수리에 바람이 통할 예정입니다',
      '탈모 샴푸 주식 매수를 권장합니다',
      '머리카락 한 올 한 올이 이별 통보 중입니다',
      '미용실에서 "숱이 좀..." 소리 들을 각입니다',
    ];

    function getHairPercent() {
      return Math.floor(Math.random() * 101);
    }

    function getHairVerdict(percent) {
      const safe = [
        '머리 숱 걱정은 안 하셔도 됩니다',
        '아직 풍성합니다. 자신감 가지세요',
        '탈모 샴푸 볼 필요 없습니다',
      ];
      const mid = [
        '가끔 거울 보면서 확인하세요',
        '씻을 때 빠지는 거 신경 쓰이시죠',
        '모자 하나 장만해 두세요',
      ];
      if (percent <= 30) return safe[Math.floor(Math.random() * safe.length)];
      if (percent <= 70) return mid[Math.floor(Math.random() * mid.length)];
      return verdicts[Math.floor(Math.random() * verdicts.length)];
    }

    function calcHair() {
      const name = document.getElementById('hairName').value.trim() || '당신';
      const isVip = isVipName(name);
      const btn = document.getElementById('hairCalcBtn');
      btn.disabled = true;
      hairCopyBtn.style.display = 'none';
      hairProgressWrap.classList.add('show');
      hairProgressFill.style.width = '0%';
      hairResultBox.classList.add('fade');
      hairResultBox.innerHTML = '<span class="placeholder">분석 중...</span>';

      let step = 0;
      hairScan.textContent = scanSteps[0];

      const scanInterval = setInterval(() => {
        step++;
        if (step < scanSteps.length) hairScan.textContent = scanSteps[step];
      }, 400);

      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(99, progress + Math.random() * 12 + 3);
        hairProgressFill.style.width = progress + '%';
      }, 120);

      setTimeout(() => {
        clearInterval(scanInterval);
        clearInterval(progressInterval);
        const percent = isVip ? 100 : getHairPercent();
        const verdict = isVip
          ? VIP_VERDICTS[Math.floor(Math.random() * VIP_VERDICTS.length)]
          : getHairVerdict(percent);
        hairProgressFill.style.width = percent + '%';
        hairScan.textContent = isVip ? '✅ 확정 탈모 (재검사 불필요)' : '✅ 분석 완료 (오차범위 ±0.01%)';

        hairResultText = `${name}님 탈모 확률: ${percent}%\n${verdict}\n\n탈모 확률 계산기 👇`;
        hairResultBox.innerHTML = `<div class="hair-percent">${percent}%</div><div class="hair-verdict"><strong>${name}</strong>님의 탈모 확률: <strong>${percent}%</strong><br><span style="color:var(--muted);font-size:0.85rem">${verdict}</span></div>`;
        hairResultBox.classList.remove('fade');
        hairCopyBtn.style.display = 'block';
        btn.disabled = false;
      }, 2800);
    }

    function copyHairResult() {
      if (!hairResultText) return;
      const url = location.protocol === 'file:' ? '' : location.origin + location.pathname;
      const text = url ? hairResultText + '\n' + url : hairResultText;
      copyToClipboard(text).then((ok) => {
        showToast(ok ? '📋 복사 완료!' : '📋 길게 눌러서 복사해 주세요');
      });
    }

    function shareHair() {
      const name = document.getElementById('hairName').value.trim() || '당신';
      const text = hairResultText
        ? hairResultText
        : `${name}님 탈모 확률 측정해봤는데 ㅋㅋㅋ 너도 해봐`;
      captureAndShare('탈모 확률 계산기 🧑‍🦲', text);
    }

    bindTap(document.getElementById('hairCalcBtn'), calcHair);
    bindTap(hairCopyBtn, copyHairResult);
    bindTap(document.getElementById('hairShareBtn'), shareHair);


    const params = new URLSearchParams(location.search);
    if (params.get('admin') === 'hair' || sessionStorage.getItem(HAIR_ADMIN_KEY)) {
      showHairAdmin();
    }

    document.getElementById('headerEmoji').addEventListener('click', () => {
      emojiTaps++;
      clearTimeout(emojiTapTimer);
      emojiTapTimer = setTimeout(() => { emojiTaps = 0; }, 2000);
      if (emojiTaps >= 5) {
        emojiTaps = 0;
        showHairAdmin();
        showToast('🔒 관리 패널 열림');
      }
    });

})();
