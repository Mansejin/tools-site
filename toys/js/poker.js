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

    function getShareUrl() {
      if (location.protocol === 'file:') return '';
      return location.origin + location.pathname;
    }


    // ── 콜 할까 말까? ──
    const POKER_TIME = 30;
    const POKER_Q_COUNT = 5;

    const pokerQuestionPool = [
      '지금 배고프십니까?',
      '오늘 양말 색이 마음에 듭니까?',
      '상대방 얼굴이 유명인 닮았습니까?',
      '화장실 가고 싶은 느낌이 듭니까?',
      '방금 카톡 알림 왔습니까?',
      '오늘 점심 뭐 먹었는지 기억 안 납니까?',
      '상대가 방금 하품한 것 같습니까?',
      '지금 에어컨 바람이 너무 세지 않습니까?',
      '오늘 운세 확인하고 오셨습니까?',
      '팟 사이즈가 치킨 한 마리 값 이상 같습니까?',
      '상대 프로필 사진이 오래된 것 같습니까?',
      '지금 손에 땀이 납니까?',
      '실내인데 비행기 소리가 들리는 것 같습니까?',
      '오늘 커피 3잔 이상 마셨습니까?',
      '상대 닉네임이 무섭습니까?',
      '지금 고양이 영상이 보고 싶습니까?',
      '책상(또는 방)이 지저분합니까?',
      '상대가 이모티콘을 썼습니까?',
      '오늘 세수하셨습니까?',
      '누가 옆에서 쳐다보는 것 같습니까?',
      '상대 프로필에 카드 문양이 있습니까?',
      '콜하면 저녁 약속에 늦을 것 같습니까?',
      '지금 머릿속에 노래가 맴돕니까?',
      '오늘 머리 감았습니까?',
      '상대가 존댓말을 씁니까?',
      '지금 누워서 하고 있습니까?',
      '방금 재채기 했습니까?',
      '오늘 로또 사셨습니까?',
      '상대방 이름이 어렵습니까?',
      '지금 이 앱 쓰는 게 들킬 것 같습니까?',
    ];

    const callReasons = [
      '직감이 "콜"이라고 합니다 (직감이 원숭이)',
      '안 하면 평생 "그때 콜할걸" 할 겁니다',
      '상대도 사실 떨고 있을 겁니다. probably',
      '우주가 콜하라고 속삭이고 있습니다',
      '핑계는 준비됐고, 용기만 있으면 됩니다',
      '오늘 점심 맛있게 먹었으니 운이 좋습니다',
      '양말 색이 오늘의 행운을 뒷받침합니다',
    ];

    const foldReasons = [
      '배고프면 판단력이 떨어집니다. 일단 폴드',
      '화장실 급하면 무조건 폴드입니다 (미국 프로도 인정)',
      '이 앱까지 켰다는 건 이미 마음이 기울었다는 뜻',
      '고양이 영상이 보고 싶을 때는 폴드가 정답',
      '시간 초과 = 패닉 폴드. 논란의 여지가 없습니다',
      '상대 닉네임이 무서우면 접는 게 상식입니다',
      '누워서 치면 폴드가 물리적으로 맞습니다',
    ];

    const timeUpReasons = [
      '생각할 시간도 없었습니다. 패닉 폴드!',
      '딜러가 이미 카드를 태우려 합니다. 폴드!',
      '30초 안에 못 정하면 그게 답입니다',
    ];

    let pokerStep = 0;
    let pokerYesCount = 0;
    let pokerResultText = '';
    let activePokerQuestions = [];
    let pokerTimeLeft = POKER_TIME;
    let pokerTimerId = null;
    let pokerTimedOut = false;

    const pokerQuiz = document.getElementById('pokerQuiz');
    const pokerResult = document.getElementById('pokerResult');
    const pokerQuestion = document.getElementById('pokerQuestion');
    const pokerDots = document.getElementById('pokerDots');
    const pokerStepLabel = document.getElementById('pokerStepLabel');
    const pokerTimerEl = document.getElementById('pokerTimer');
    const pokerTimerNum = document.getElementById('pokerTimerNum');
    const pokerTimerBar = document.getElementById('pokerTimerBar');

    function pickPokerQuestions() {
      const shuffled = pokerQuestionPool.slice().sort(() => Math.random() - 0.5);
      return shuffled.slice(0, POKER_Q_COUNT);
    }

    function updateTimerUI() {
      pokerTimerNum.textContent = pokerTimeLeft;
      pokerTimerBar.style.width = (pokerTimeLeft / POKER_TIME * 100) + '%';
      pokerTimerEl.classList.toggle('urgent', pokerTimeLeft <= 10 && pokerTimeLeft > 5);
      pokerTimerEl.classList.toggle('critical', pokerTimeLeft <= 5);
    }

    function stopPokerTimer() {
      if (pokerTimerId) {
        clearInterval(pokerTimerId);
        pokerTimerId = null;
      }
    }

    function startPokerTimer() {
      stopPokerTimer();
      pokerTimerId = setInterval(() => {
        pokerTimeLeft--;
        updateTimerUI();
        if (pokerTimeLeft <= 0) {
          stopPokerTimer();
          onPokerTimeUp();
        }
      }, 1000);
    }

    function onPokerTimeUp() {
      if (pokerResult.style.display !== 'none') return;
      pokerTimedOut = true;
      showToast('⏰ 시간 초과! 패닉 판정!');
      showPokerVerdict();
    }

    function renderPokerDots() {
      pokerDots.innerHTML = activePokerQuestions.map((_, i) => {
        let cls = 'quiz-dot';
        if (i < pokerStep) cls += ' done';
        else if (i === pokerStep) cls += ' current';
        return `<span class="${cls}"></span>`;
      }).join('');
    }

    function showPokerQuestion() {
      pokerQuiz.style.display = 'block';
      pokerResult.style.display = 'none';
      pokerQuestion.textContent = activePokerQuestions[pokerStep];
      pokerStepLabel.textContent = `질문 ${pokerStep + 1} / ${POKER_Q_COUNT}`;
      renderPokerDots();
    }

    function answerPoker(yes) {
      if (pokerResult.style.display !== 'none') return;
      if (yes) pokerYesCount++;
      pokerStep++;
      if (pokerStep < activePokerQuestions.length) {
        showPokerQuestion();
        return;
      }
      showPokerVerdict();
    }

    function showPokerVerdict() {
      stopPokerTimer();

      let fold;
      let reason;

      if (pokerTimedOut) {
        fold = true;
        reason = timeUpReasons[Math.floor(Math.random() * timeUpReasons.length)];
      } else {
        fold = pokerYesCount >= 3;
        const reasons = fold ? foldReasons : callReasons;
        reason = reasons[Math.floor(Math.random() * reasons.length)];
      }

      const verdict = fold ? 'FOLD 🙅' : 'CALL ✅';
      const verdictEl = document.getElementById('pokerVerdict');
      const cls = fold ? 'fold' : 'call';

      verdictEl.textContent = verdict;
      verdictEl.className = 'poker-verdict ' + cls;
      document.getElementById('pokerReason').textContent = reason;
      document.getElementById('pokerScore').textContent =
        pokerTimedOut
          ? `시간 초과 · 예 ${pokerYesCount}개 · 폴드 권장`
          : `예 ${pokerYesCount}개 / ${POKER_Q_COUNT} · ${fold ? '폴드 권장' : '콜 권장'}`;

      pokerResultText = `[콜 할까 말까?]\n결과: ${verdict}\n${reason}\n(예 ${pokerYesCount}/${POKER_Q_COUNT})`;

      pokerQuiz.style.display = 'none';
      pokerResult.style.display = 'block';
    }

    function resetPoker() {
      stopPokerTimer();
      pokerStep = 0;
      pokerYesCount = 0;
      pokerTimedOut = false;
      pokerResultText = '';
      pokerTimeLeft = POKER_TIME;
      activePokerQuestions = pickPokerQuestions();
      updateTimerUI();
      pokerTimerEl.classList.remove('urgent', 'critical');
      showPokerQuestion();
      startPokerTimer();
    }

    function copyPokerResult() {
      if (!pokerResultText) return;
      const url = location.protocol === 'file:' ? '' : location.origin + location.pathname;
      const text = url ? pokerResultText + '\n' + url : pokerResultText;
      copyToClipboard(text).then((ok) => {
        showToast(ok ? '📋 복사 완료! 톡방에 붙여넣기 하세요' : '📋 길게 눌러서 복사해 주세요');
      });
    }

    function sharePoker() {
      const text = pokerResultText || '홀덤 톡방용 콜/폴드 결정기 발견 ㅋㅋ';
      captureAndShare('콜 할까 말까? 🃏', text);
    }


    resetPoker();
    bindTap(document.getElementById('pokerYes'), () => answerPoker(true));
    bindTap(document.getElementById('pokerNo'), () => answerPoker(false));
    bindTap(document.getElementById('pokerRetryBtn'), resetPoker);
    bindTap(document.getElementById('pokerCopyBtn'), copyPokerResult);
    bindTap(document.getElementById('pokerShareBtn'), sharePoker);

})();
