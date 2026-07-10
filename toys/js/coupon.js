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
            const log = clone.getElementById('collectionLog');
            if (log) log.removeAttribute('open');
          },
        });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
        if (!blob) throw new Error('blob failed');
        const file = new File([blob], 'mansejin-coupon.png', { type: 'image/png' });
        const shareUrl = getShareUrl();
        const shareText = shareUrl ? fallbackText + '\n' + shareUrl : fallbackText;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ title, files: [file] });
            showToast('📤 공유 완료!');
            sharing = false;
            return;
          } catch (e) {
            if (e.name === 'AbortError') { sharing = false; return; }
          }
        }
        downloadBlob(blob, 'mansejin-coupon.png');
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

    const RARITY = {
      common:    { label: 'COMMON',    weight: 100, color: '#8888a0', emoji: '⚪' },
      uncommon:  { label: 'UNCOMMON',  weight: 40,  color: '#64dc82', emoji: '🟢' },
      rare:      { label: 'RARE',      weight: 15,  color: '#64b4ff', emoji: '🔵' },
      ultra:     { label: 'ULTRA RARE', weight: 5,  color: '#c084fc', emoji: '🟣' },
      legendary: { label: 'LEGENDARY', weight: 1,  color: '#ffd166', emoji: '🌟' },
    };

    const CATEGORIES = {
      sweet: '달콤', service: '서비스', food: '맛집', activity: '활동',
      fun: '재미', adult: '19금', special: '스페셜',
    };

    const COUPONS = [
      // ── 남친 이용권 (여친이 남친에게 사용) ──
      { pack: 'bf', rarity: 'common',    cat: 'sweet',    emoji: '💋', text: '뽀뽀 1회' },
      { pack: 'bf', rarity: 'common',    cat: 'sweet',    emoji: '🤝', text: '손잡기 무제한 (오늘 하루)' },
      { pack: 'bf', rarity: 'common',    cat: 'sweet',    emoji: '🫂', text: '포옹 5분' },
      { pack: 'bf', rarity: 'common',    cat: 'sweet',    emoji: '💕', text: '"사랑해" 3번 말하기' },
      { pack: 'bf', rarity: 'common',    cat: 'sweet',    emoji: '😊', text: '"오늘 예쁘다" 5번 말하기' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'sweet',    emoji: '😘', text: '이마에 뽀뽀 1회' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'sweet',    emoji: '💆', text: '자기 전 손 마사지 10분' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'sweet',    emoji: '🌅', text: '아침에 눈 뜨자마자 안아주기' },
      { pack: 'bf', rarity: 'rare',      cat: 'sweet',    emoji: '💌', text: '손편지 써주기' },
      { pack: 'bf', rarity: 'rare',      cat: 'sweet',    emoji: '🎵', text: '좋아하는 노래 불러주기' },
      { pack: 'bf', rarity: 'ultra',     cat: 'sweet',    emoji: '👑', text: '하루 종일 공주님/왕자님 모드' },
      { pack: 'bf', rarity: 'legendary', cat: 'sweet',    emoji: '💎', text: '원하는 선물 하나 (10만원 이하)' },

      { pack: 'bf', rarity: 'common',    cat: 'service',  emoji: '🍽️', text: '설거지 대신 해주기 1회' },
      { pack: 'bf', rarity: 'common',    cat: 'service',  emoji: '🧹', text: '집안일 1가지 무조건' },
      { pack: 'bf', rarity: 'common',    cat: 'service',  emoji: '🗑️', text: '쓰레기 버리기 대행' },
      { pack: 'bf', rarity: 'common',    cat: 'service',  emoji: '👕', text: '세탁물 개기 대행' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'service',  emoji: '🍳', text: '아침 밥 차려주기' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'service',  emoji: '🚗', text: '역까지 픽업 서비스' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'service',  emoji: '🌙', text: '늦은 날 데리러 가기' },
      { pack: 'bf', rarity: 'rare',      cat: 'service',  emoji: '🧺', text: '분리수거 1주일 전담' },
      { pack: 'bf', rarity: 'rare',      cat: 'service',  emoji: '🚕', text: '대리운전 1회 (술자리 후)' },
      { pack: 'bf', rarity: 'ultra',     cat: 'service',  emoji: '🏠', text: '대청소 1회 전담' },
      { pack: 'bf', rarity: 'legendary', cat: 'service',  emoji: '👨‍🍳', text: '원하는 요리 3코스 풀코스' },

      { pack: 'bf', rarity: 'common',    cat: 'food',     emoji: '☕', text: '카페 음료 1잔 쏘기' },
      { pack: 'bf', rarity: 'common',    cat: 'food',     emoji: '🍜', text: '라면 끓여주기' },
      { pack: 'bf', rarity: 'common',    cat: 'food',     emoji: '🍎', text: '과일 깎아주기' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'food',     emoji: '🍗', text: '치킨 or 피자 야식 쏘기' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'food',     emoji: '🧋', text: '배달 음료 쏘기' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'food',     emoji: '🍱', text: '점심 도시락 사오기' },
      { pack: 'bf', rarity: 'rare',      cat: 'food',     emoji: '🌶️', text: '마라탕 쏘기' },
      { pack: 'bf', rarity: 'rare',      cat: 'food',     emoji: '🍰', text: '케이크 or 디저트 쏘기' },
      { pack: 'bf', rarity: 'ultra',     cat: 'food',     emoji: '🥩', text: '고기 뷔페 or 스테이크 쏘기' },
      { pack: 'bf', rarity: 'legendary', cat: 'food',     emoji: '🍽️', text: '맛집 투어 (식비 전액 부담)' },

      { pack: 'bf', rarity: 'common',    cat: 'activity', emoji: '🚶', text: '산책 30분 동행' },
      { pack: 'bf', rarity: 'common',    cat: 'activity', emoji: '📸', text: '사진 찍어주기 (리테이크 OK)' },
      { pack: 'bf', rarity: 'common',    cat: 'activity', emoji: '🎬', text: '영화 보기 (여친 픽 OK)' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'activity', emoji: '🎤', text: '노래방 2시간' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'activity', emoji: '🛍️', text: '쇼핑 동행 (불만 금지)' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'activity', emoji: '💅', text: '네일샵 옆에서 기다리기' },
      { pack: 'bf', rarity: 'rare',      cat: 'activity', emoji: '🎢', text: '놀이공원 / 테마파크 가기' },
      { pack: 'bf', rarity: 'rare',      cat: 'activity', emoji: '🎮', text: '게임 1시간 방해 금지' },
      { pack: 'bf', rarity: 'ultra',     cat: 'activity', emoji: '✈️', text: '당일치기 여행 가기' },
      { pack: 'bf', rarity: 'legendary', cat: 'activity', emoji: '🏨', text: '1박 2일 여행 (전액 부담)' },

      { pack: 'bf', rarity: 'common',    cat: 'fun',      emoji: '✌️', text: '가위바위보 무조건 패배' },
      { pack: 'bf', rarity: 'common',    cat: 'fun',      emoji: '🎰', text: '인형뽑기 3번 쏘기' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'fun',      emoji: '🎭', text: '오늘은 "예쁜 척" 해주기' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'fun',      emoji: '💇', text: '머리 빗겨주기' },
      { pack: 'bf', rarity: 'rare',      cat: 'fun',      emoji: '🎁', text: '벌칙 1회 면제권' },
      { pack: 'bf', rarity: 'ultra',     cat: 'fun',      emoji: '🙇', text: '하루 종일 "네"만 하기' },
      { pack: 'bf', rarity: 'legendary', cat: 'fun',      emoji: '👑', text: '24시간 명령 따르기 (합리적 범위)' },

      { pack: 'bf', rarity: 'common',    cat: 'adult',    adult: true, emoji: '💋', text: '키스 30초' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'adult',    adult: true, emoji: '💆‍♂️', text: '목·어깨 마사지 15분' },
      { pack: 'bf', rarity: 'uncommon',  cat: 'adult',    adult: true, emoji: '👗', text: '원하는 옷 입어달라고 하기' },
      { pack: 'bf', rarity: 'rare',      cat: 'adult',    adult: true, emoji: '🔥', text: '스킨십 30분 무조건 협조' },
      { pack: 'bf', rarity: 'rare',      cat: 'adult',    adult: true, emoji: '🛁', text: '같이 샤워하기' },
      { pack: 'bf', rarity: 'ultra',     cat: 'adult',    adult: true, emoji: '🔞', text: '방해 금지 타임 1시간' },
      { pack: 'bf', rarity: 'ultra',     cat: 'adult',    adult: true, emoji: '📸', text: '원하는 포즈로 사진 찍어주기' },
      { pack: 'bf', rarity: 'legendary', cat: 'adult',    adult: true, emoji: '💫', text: '오늘 밤은 전부 여친이 원하는 대로' },

      // ── 여친 이용권 (남친이 여친에게 사용) ──
      { pack: 'gf', rarity: 'common',    cat: 'sweet',    emoji: '💋', text: '뽀뽀 1회' },
      { pack: 'gf', rarity: 'common',    cat: 'sweet',    emoji: '🤝', text: '손잡기 무제한 (오늘 하루)' },
      { pack: 'gf', rarity: 'common',    cat: 'sweet',    emoji: '🫂', text: '포옹 5분' },
      { pack: 'gf', rarity: 'common',    cat: 'sweet',    emoji: '💕', text: '"사랑해" 3번 말하기' },
      { pack: 'gf', rarity: 'common',    cat: 'sweet',    emoji: '😎', text: '"오늘 멋있다" 5번 말하기' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'sweet',    emoji: '😘', text: '볼에 뽀뽀 1회' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'sweet',    emoji: '💆‍♀️', text: '어깨 마사지 10분' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'sweet',    emoji: '🌙', text: '자기 전 안아주며 잠들기' },
      { pack: 'gf', rarity: 'rare',      cat: 'sweet',    emoji: '💌', text: '손편지 써주기' },
      { pack: 'gf', rarity: 'rare',      cat: 'sweet',    emoji: '🎵', text: '좋아하는 노래 불러주기' },
      { pack: 'gf', rarity: 'ultra',     cat: 'sweet',    emoji: '👑', text: '하루 종일 공주님 모드' },
      { pack: 'gf', rarity: 'legendary', cat: 'sweet',    emoji: '💎', text: '원하는 선물 하나 (10만원 이하)' },

      { pack: 'gf', rarity: 'common',    cat: 'service',  emoji: '🧹', text: '방 청소 1회' },
      { pack: 'gf', rarity: 'common',    cat: 'service',  emoji: '👗', text: '옷 정리해주기' },
      { pack: 'gf', rarity: 'common',    cat: 'service',  emoji: '🛒', text: '장보기 동행 (짐 들기 포함)' },
      { pack: 'gf', rarity: 'common',    cat: 'service',  emoji: '📦', text: '택배 받기 + 개봉' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'service',  emoji: '🍳', text: '아침 밥 차려주기' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'service',  emoji: '🚗', text: '역까지 데려다주기' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'service',  emoji: '☔', text: '비 오는 날 우산 씌워주기' },
      { pack: 'gf', rarity: 'rare',      cat: 'service',  emoji: '🧺', text: '빨래 개기 1주일' },
      { pack: 'gf', rarity: 'rare',      cat: 'service',  emoji: '🐱', text: '반려동물 돌보기 대행' },
      { pack: 'gf', rarity: 'ultra',     cat: 'service',  emoji: '🏠', text: '대청소 1회 전담' },
      { pack: 'gf', rarity: 'legendary', cat: 'service',  emoji: '👨‍🍳', text: '원하는 요리 3코스 풀코스' },

      { pack: 'gf', rarity: 'common',    cat: 'food',     emoji: '☕', text: '카페 음료 1잔 쏘기' },
      { pack: 'gf', rarity: 'common',    cat: 'food',     emoji: '🍫', text: '간식 사오기' },
      { pack: 'gf', rarity: 'common',    cat: 'food',     emoji: '🧋', text: '버블티 쏘기' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'food',     emoji: '🍗', text: '치킨 or 피자 야식 쏘기' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'food',     emoji: '🍱', text: '점심 도시락 사오기' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'food',     emoji: '🍦', text: '아이스크림 쏘기' },
      { pack: 'gf', rarity: 'rare',      cat: 'food',     emoji: '🌶️', text: '마라탕 쏘기' },
      { pack: 'gf', rarity: 'rare',      cat: 'food',     emoji: '🍰', text: '케이크 or 디저트 쏘기' },
      { pack: 'gf', rarity: 'ultra',     cat: 'food',     emoji: '🥩', text: '고기 뷔페 or 스테이크 쏘기' },
      { pack: 'gf', rarity: 'legendary', cat: 'food',     emoji: '🍽️', text: '맛집 투어 (식비 전액 부담)' },

      { pack: 'gf', rarity: 'common',    cat: 'activity', emoji: '🚶', text: '산책 30분 동행' },
      { pack: 'gf', rarity: 'common',    cat: 'activity', emoji: '📸', text: '인생샷 찍어주기 (리테이크 무제한)' },
      { pack: 'gf', rarity: 'common',    cat: 'activity', emoji: '🎬', text: '영화 보기 (남친 픽 OK)' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'activity', emoji: '🎤', text: '노래방 2시간' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'activity', emoji: '🛍️', text: '쇼핑 동행 (카드 내줌)' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'activity', emoji: '💅', text: '네일샵 비용 쏘기' },
      { pack: 'gf', rarity: 'rare',      cat: 'activity', emoji: '🎢', text: '놀이공원 / 테마파크 가기' },
      { pack: 'gf', rarity: 'rare',      cat: 'activity', emoji: '🎮', text: 'PC방 2시간 (싫어도)' },
      { pack: 'gf', rarity: 'ultra',     cat: 'activity', emoji: '✈️', text: '당일치기 여행 가기' },
      { pack: 'gf', rarity: 'legendary', cat: 'activity', emoji: '🏨', text: '1박 2일 여행 (전액 부담)' },

      { pack: 'gf', rarity: 'common',    cat: 'fun',      emoji: '✌️', text: '가위바위보 무조건 패배' },
      { pack: 'gf', rarity: 'common',    cat: 'fun',      emoji: '🎰', text: '인형뽑기 3번 쏘기' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'fun',      emoji: '🎭', text: '오늘은 "멋진 척" 해주기' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'fun',      emoji: '💇', text: '머리 빗겨주기' },
      { pack: 'gf', rarity: 'rare',      cat: 'fun',      emoji: '🎁', text: '벌칙 1회 면제권' },
      { pack: 'gf', rarity: 'ultra',     cat: 'fun',      emoji: '🙇', text: '하루 종일 "네"만 하기' },
      { pack: 'gf', rarity: 'legendary', cat: 'fun',      emoji: '👑', text: '24시간 명령 따르기 (합리적 범위)' },

      { pack: 'gf', rarity: 'common',    cat: 'adult',    adult: true, emoji: '💋', text: '키스 30초' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'adult',    adult: true, emoji: '💆‍♀️', text: '목·어깨 마사지 15분' },
      { pack: 'gf', rarity: 'uncommon',  cat: 'adult',    adult: true, emoji: '👔', text: '원하는 옷 입어달라고 하기' },
      { pack: 'gf', rarity: 'rare',      cat: 'adult',    adult: true, emoji: '🔥', text: '스킨십 30분 무조건 협조' },
      { pack: 'gf', rarity: 'rare',      cat: 'adult',    adult: true, emoji: '🛁', text: '같이 샤워하기' },
      { pack: 'gf', rarity: 'ultra',     cat: 'adult',    adult: true, emoji: '🔞', text: '방해 금지 타임 1시간' },
      { pack: 'gf', rarity: 'ultra',     cat: 'adult',    adult: true, emoji: '📸', text: '원하는 포즈로 사진 찍어주기' },
      { pack: 'gf', rarity: 'legendary', cat: 'adult',    adult: true, emoji: '💫', text: '오늘 밤은 전부 남친이 원하는 대로' },
    ];

    const PACK_LABELS = { bf: '남친 이용권', gf: '여친 이용권' };
    const PACK_EMOJI = { bf: '💙', gf: '💗' };

    const RARE_PLUS = ['rare', 'ultra', 'legendary'];
    const LEGENDARY_MSG = ['🌟 전설의 쿠폰이 나왔다!!!', '✨ 대박!!! 레전드 등장!!!', '🔥 역대급 쿠폰 뽑기 성공!!!'];
    const ULTRA_MSG = ['🟣 울트라 레어!!!', '💜 엄청난 쿠폰이다!!!'];
    const RARE_MSG = ['🔵 레어 쿠폰 등장!', '✨ 희귀 쿠폰 GET!'];

    let currentPack = 'bf';
    let adultEnabled = false;
    let drawing = false;
    let drawCount = 0;
    let rareCount = 0;
    let lastCoupon = null;
    let currentCoupon = null;
    let collection = [];

    const couponPack = document.getElementById('couponPack');
    const cardWrap = document.getElementById('cardWrap');
    const couponCard = document.getElementById('couponCard');
    const drawBtn = document.getElementById('drawBtn');
    const copyBtn = document.getElementById('copyBtn');
    const drawStatus = document.getElementById('drawStatus');
    const progressWrap = document.getElementById('progressWrap');
    const progressFill = document.getElementById('progressFill');
    const couponFlash = document.getElementById('couponFlash');
    const packLabel = document.getElementById('packLabel');
    const collectionList = document.getElementById('collectionList');

    function getPool() {
      return COUPONS.filter((c) => {
        if (c.pack !== currentPack) return false;
        if (c.adult && !adultEnabled) return false;
        return true;
      });
    }

    function updateTotal() {
      document.getElementById('totalCoupons').textContent = getPool().length;
    }

    function weightedDraw(pool) {
      const weights = pool.map((c) => RARITY[c.rarity].weight);
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      for (let i = 0; i < pool.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return pool[i];
      }
      return pool[pool.length - 1];
    }

    function drawCoupon() {
      const pool = getPool();
      if (!pool.length) return null;
      let coupon;
      let attempts = 0;
      do {
        coupon = weightedDraw(pool);
        attempts++;
      } while (coupon === lastCoupon && attempts < 10 && pool.length > 1);
      return coupon;
    }

    function selectPack(tab) {
      document.querySelectorAll('.pack-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentPack = tab.dataset.pack;
      packLabel.textContent = PACK_LABELS[currentPack];
      lastCoupon = null;
      updateTotal();
      resetStage();
    }

    document.getElementById('packTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.pack-tab');
      if (tab) selectPack(tab);
    });

    document.getElementById('adultToggle').addEventListener('change', (e) => {
      adultEnabled = e.target.checked;
      updateTotal();
      resetStage();
    });

    function resetStage() {
      couponPack.hidden = false;
      cardWrap.hidden = true;
      couponCard.className = 'coupon-card';
      drawStatus.textContent = '';
      copyBtn.style.display = 'none';
      currentCoupon = null;
    }

    function flashScreen(rarity) {
      const colors = {
        rare: 'rgba(100,180,255,.35)',
        ultra: 'rgba(192,132,252,.45)',
        legendary: 'rgba(255,209,102,.55)',
      };
      if (!colors[rarity]) return;
      couponFlash.style.background = colors[rarity];
      couponFlash.classList.add('show');
      setTimeout(() => couponFlash.classList.remove('show'), 600);
    }

    function shakeScreen(rarity) {
      const stage = document.getElementById('couponStage');
      stage.classList.remove('shake-mild', 'shake-hard', 'shake-legend');
      void stage.offsetWidth;
      if (rarity === 'legendary') stage.classList.add('shake-legend');
      else if (rarity === 'ultra') stage.classList.add('shake-hard');
      else if (rarity === 'rare') stage.classList.add('shake-mild');
    }

    function getRarityMsg(rarity) {
      if (rarity === 'legendary') return LEGENDARY_MSG[Math.floor(Math.random() * LEGENDARY_MSG.length)];
      if (rarity === 'ultra') return ULTRA_MSG[Math.floor(Math.random() * ULTRA_MSG.length)];
      if (rarity === 'rare') return RARE_MSG[Math.floor(Math.random() * RARE_MSG.length)];
      if (rarity === 'uncommon') return '🟢 언커먼 쿠폰!';
      return '';
    }

    function revealCard(coupon) {
      const r = RARITY[coupon.rarity];
      document.getElementById('rarityBadge').textContent = r.label;
      document.getElementById('rarityBadge').style.color = r.color;
      document.getElementById('rarityBadge').style.borderColor = r.color;
      document.getElementById('cardEmoji').textContent = coupon.emoji;
      document.getElementById('cardText').textContent = coupon.text;
      document.getElementById('cardCategory').textContent = CATEGORIES[coupon.cat] || coupon.cat;

      couponCard.className = 'coupon-card rarity-' + coupon.rarity;
      couponPack.hidden = true;
      cardWrap.hidden = false;

      requestAnimationFrame(() => {
        couponCard.classList.add('flipped');
      });

      const msg = getRarityMsg(coupon.rarity);
      drawStatus.textContent = msg;

      if (RARE_PLUS.includes(coupon.rarity)) {
        flashScreen(coupon.rarity);
        shakeScreen(coupon.rarity);
      }

      copyBtn.style.display = 'block';
    }

    function addToCollection(coupon) {
      collection.unshift({
        ...coupon,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      });
      if (collection.length > 30) collection.pop();
      renderCollection();
    }

    function renderCollection() {
      collectionList.innerHTML = collection.map((c) => {
        const r = RARITY[c.rarity];
        return `<li class="collection-item rarity-${c.rarity}">
          <span class="col-emoji">${c.emoji}</span>
          <span class="col-text">${c.text}</span>
          <span class="col-rarity" style="color:${r.color}">${r.label}</span>
          <span class="col-time">${c.time}</span>
        </li>`;
      }).join('');
    }

    const DRAW_STEPS = [
      { pct: 15, msg: '📦 쿠폰팩을 흔드는 중...', delay: 400 },
      { pct: 35, msg: '✨ 반짝이는 빛이 보인다...', delay: 500 },
      { pct: 55, msg: '🎴 카드를 뽑는 중...', delay: 500 },
      { pct: 75, msg: '💫 운명의 쿠폰이...', delay: 600 },
      { pct: 90, msg: '🔥 드디어!!!', delay: 400 },
      { pct: 100, msg: '', delay: 300 },
    ];

    async function runDraw() {
      if (drawing) return;
      drawing = true;
      drawBtn.disabled = true;
      drawBtn.textContent = '뽑는 중...';

      resetStage();
      couponCard.classList.remove('flipped');
      couponPack.classList.add('shaking');

      progressWrap.classList.add('show');
      progressFill.style.width = '0%';

      for (const step of DRAW_STEPS) {
        drawStatus.textContent = step.msg;
        progressFill.style.width = step.pct + '%';
        if (step.pct < 100) couponPack.classList.toggle('shaking');
        await new Promise((r) => setTimeout(r, step.delay));
      }

      couponPack.classList.remove('shaking');

      const coupon = drawCoupon();
      if (!coupon) {
        showToast('쿠폰이 없어요!');
        drawing = false;
        drawBtn.disabled = false;
        drawBtn.textContent = '🎴 쿠폰팩 뜯기!';
        progressWrap.classList.remove('show');
        return;
      }

      lastCoupon = coupon;
      currentCoupon = coupon;
      drawCount++;
      if (RARE_PLUS.includes(coupon.rarity)) rareCount++;

      document.getElementById('drawCount').textContent = drawCount;
      document.getElementById('rareCount').textContent = rareCount;

      revealCard(coupon);
      addToCollection(coupon);

      if (coupon.rarity === 'legendary') {
        showToast('🌟 전설의 쿠폰!!! 대박!!!');
      } else if (coupon.rarity === 'ultra') {
        showToast('🟣 울트라 레어 등장!');
      }

      progressWrap.classList.remove('show');
      drawBtn.disabled = false;
      drawBtn.textContent = '🎴 한 번 더 뜯기!';
      drawing = false;
    }

    function getCopyText() {
      if (!currentCoupon) return '';
      const r = RARITY[currentCoupon.rarity];
      const pack = PACK_LABELS[currentPack];
      return `[${pack}] ${r.emoji} ${r.label}\n${currentCoupon.emoji} ${currentCoupon.text}\n— 커플 쿠폰 뽑기에서 획득!`;
    }

    function copyCoupon() {
      const text = getCopyText();
      if (!text) return;
      copyToClipboard(text).then((ok) => {
        showToast(ok ? '📋 쿠폰 복사 완료! 카톡에 보내세요 💕' : '📋 길게 눌러서 복사해 주세요');
      });
    }

    function share() {
      const text = currentCoupon
        ? `커플 쿠폰 뽑기에서 ${RARITY[currentCoupon.rarity].label} 뽑았어! 🎴\n"${currentCoupon.emoji} ${currentCoupon.text}"`
        : '커플 쿠폰 뽑기 사이트 발견! 레어카드도 있어 ㅋㅋ 💕';
      captureAndShare('커플 쿠폰 뽑기 💕', text);
    }

    bindTap(drawBtn, runDraw);
    bindTap(copyBtn, copyCoupon);
    bindTap(document.getElementById('shareBtn'), share);

    updateTotal();

    const params = new URLSearchParams(location.search);
    const shared = params.get('c');
    if (shared) {
      try {
        const parts = decodeURIComponent(shared).split('|');
        if (parts.length >= 3) {
          currentPack = parts[0] === 'gf' ? 'gf' : 'bf';
          document.querySelectorAll('.pack-tab').forEach((t) => {
            t.classList.toggle('active', t.dataset.pack === currentPack);
          });
          packLabel.textContent = PACK_LABELS[currentPack];
          const fakeCoupon = {
            pack: currentPack,
            rarity: parts[1] || 'common',
            cat: 'sweet',
            emoji: parts[2] || '💕',
            text: parts.slice(3).join('|') || '공유된 쿠폰',
          };
          currentCoupon = fakeCoupon;
          revealCard(fakeCoupon);
          copyBtn.style.display = 'block';
        }
      } catch {}
    }

})();
