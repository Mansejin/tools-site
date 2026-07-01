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


    const situations = {
      work: {
        copy: (e) => `죄송합니다, ${e} 🙏`,
        excuses: {
          traffic: [
            "출근길 지하철 신호 장애로 20분 동안 역에 갇혔습니다",
            "버스가 고장 나서 다른 버스를 기다리느라 늦었습니다",
            "출근 시간대 고속도로 추돌사고로 정체가 심했습니다",
            "지하철 환승역에서 사람이 너무 많아 다음 열차를 탔습니다",
            "도로 공사 우회로 인해 예상보다 30분 더 걸렸습니다",
            "카카오T가 연속 취소되어 재배차까지 20분 걸렸습니다",
            "지하철 안에서 승객이 쓰러져 응급 대응하느라 늦었습니다",
            "출근길 버스가 노선을 잘못 타 반대 방향으로 갔습니다",
            "폭우로 지하철 운행이 지연되었습니다",
            "출근길에 교통사고가 나서 우회하느라 늦었습니다",
          ],
          health: [
            "아침에 갑자기 복통이 심해서 병원에 다녀왔습니다",
            "열이 나서 약국에 들렀다가 출근했습니다",
            "알람을 껐는데 다시 잠들어 1시간 늦게 일어났습니다",
            "갑자기 어지러워서 잠시 쉬었다가 출근했습니다",
            "알레르기 반응이 와서 약을 먹고 기다렸습니다",
            "이갈이로 밤새 잠을 못 자 아침에 늦게 일어났습니다",
            "감기 기운이 심해 약을 먹고 늦게 출발했습니다",
            "허리를 삐끗해서 물리치료 받고 출근했습니다",
          ],
          life: [
            "출근 준비 중 엘리베이터가 고장 나 계단으로 내려갔습니다",
            "사원증을 두고 와서 집에 다시 갔습니다",
            "정장에 커피를 쏟아 갈아입느라 늦었습니다",
            "집 앞 상수도 공사로 출입이 막혀 있었습니다",
            "택배 기사님이 와서 필수 서류를 직접 받았습니다",
            "반려동물이 아파서 동물병원에 다녀왔습니다",
            "아침에 정전이 돼서 준비를 못 했습니다",
          ],
          tech: [
            "휴대폰 알람이 업데이트 후 작동하지 않았습니다",
            "출근 기록 앱 오류로 재설치하느라 늦었습니다",
            "스마트워치 알람 동기화 오류로 늦게 일어났습니다",
            "회사 VPN 연결 문제로 재설치하느라 늦었습니다",
            "노트북 충전기를 두고 와서 집에 다시 갔습니다",
            "카톡 단톡방 알림이 꺼져 출근 시간 변경을 못 봤습니다",
          ],
          absurd: [
            "꿈에서 이미 출근 완료해서 여유롭게 왔습니다",
            "지구 자전이 느려져 시간이 늦어진 것 같습니다",
            "엘리베이터에서 상사를 만나 30분 수다를 떨었습니다",
            "출근길 고양이가 길을 막고 앉아 있었습니다",
            "오늘 운세가 '지각운'이었습니다",
          ],
        },
      },
      meeting: {
        copy: (e) => `정말 죄송합니다. ${e} 곧 도착하겠습니다.`,
        excuses: {
          traffic: [
            "미팅 장소로 가는 길에 지하철이 20분간 정차했습니다",
            "택시가 고속도로 사고로 우회하느라 크게 늦었습니다",
            "미팅 장소 근처에서 행사로 도로가 전면 통제되었습니다",
            "지하철 환승 중 열차가 고장 나 다음 열차를 탔습니다",
            "네비게이션이 잘못 안내해 완전히 다른 곳으로 갔습니다",
            "미팅 장소 주차장이 만차라 주차하느라 늦었습니다",
            "KTX가 지연 운행이라 환승을 놓쳤습니다",
            "출발 직전 교통사고로 도로가 막혔습니다",
          ],
          health: [
            "미팅 직전 갑자기 복통이 와 화장실에 오래 있었습니다",
            "급한 전화 통화로 출발이 늦어졌습니다",
            "갑자기 어지러워서 잠시 쉬었다가 출발했습니다",
            "알레르기 반응이 와 약을 먹고 기다렸습니다",
            "목소리가 나가서 약국에 들렀다 왔습니다",
            "커피를 너무 마셔 심장이 두근거려 쉬다 왔습니다",
          ],
          life: [
            "미팅 자료를 프린트하느라 늦었습니다",
            "노트북 충전기를 두고 와서 집에 다시 갔습니다",
            "정장에 음료를 쏟아 갈아입느라 늦었습니다",
            "명함을 두고 와서 집에 다시 갔습니다",
            "미팅 전 급한 업무 전화가 20분 걸렸습니다",
            "Wi-Fi가 안 돼 자료를 다시 받느라 늦었습니다",
          ],
          tech: [
            "화상회의 링크 오류로 IT팀에 문의하느라 늦었습니다",
            "노트북이 갑자기 꺼져 재부팅하느라 늦었습니다",
            "프레젠테이션 파일이 손상되어 복구하느라 늦었습니다",
            "클라우드 서버 장애로 자료를 못 받아 늦었습니다",
            "OTP 앱 오류로 회사 시스템 로그인이 안 됐습니다",
            "이어폰 배터리가 없어서 급히 구매하느라 늦었습니다",
          ],
          absurd: [
            "미팅 전 너무 긴장해서 화장실을 5번 갔습니다",
            "거울 앞에서 연습하다가 시간을 놓쳤습니다",
            "미팅 상대방을 길에서 봤는데 인사하느라 늦었습니다",
            "엘리베이터에서 미팅 상대를 만나 수다를 떨었습니다",
            "행운의 펜ny를 주워 은행에 갔습니다",
          ],
        },
      },
      friend: {
        copy: (e) => `야 미안 ㅠㅠ ${e} 좀만 기다려~`,
        excuses: {
          traffic: [
            "버스가 안 와서 택시 탔는데 택시도 안 잡혀 ㅠㅠ",
            "지하철에서 사람한테 발 밟혀서 싸우느라 한 역 놓침",
            "길 막혀서 네비 믿고 갔는데 완전 반대편으로 감 ㅋㅋ",
            "자전거 타이어 펑크 나서 수리하느라 늦음",
            "버스 기사님이 노선 잘못 타서 산골 갔다 옴",
            "카카오T 기사님이 길 모르셔서 20분 돌아감",
            "지하철 문 안 열려서 다음 역까지 갔다 옴",
          ],
          health: [
            "어제 술 마셔서 알람 못 들었어 미안 ㅠ",
            "갑자기 배 아파서 화장실에 갇혔음",
            "머리 아파서 약 먹고 누워있다가 깜빡함",
            "알람 10개 껐는데 다시 잠들어버림",
            "어제 밤에 벌레 물려서 밤새 못 잤어",
            "커피 너무 마셔서 심장 뛰어서 쉬다 옴",
          ],
          life: [
            "옷 고르다가 30분 날림 미안",
            "화장하다가 시간 가는 줄 몰랐어",
            "집 나왔는데 지갑 두고 와서 다시 감",
            "고양이가 문 앞에 누워서 못 나감 ㅋㅋ",
            "엄마한테 전화 와서 30분 통화함",
            "택배 와서 받느라 늦음 (안 받으면 다시 감)",
            "옷에 커피 쏟아서 갈아입느라 늦음",
            "거울 보다가 내가 너무 예뻐서 멈춤",
          ],
          tech: [
            "폰 알람 안 울림 업데이트 때문인 듯",
            "카톡 보다가 약속 시간 착각함",
            "네이버 지도가 바다로 안내함 진짜로",
            "배터리 없어서 연락 못 했어 미안",
            "인스타 보다가 시간 순삭됨",
          ],
          absurd: [
            "길에서 고양이한테 발길이 막혔음",
            "로또 1등 확인하느라 늦음 (꽝이었음)",
            "UFO 봤는데 진짜임",
            "평행우주의 나랑 싸우느라 늦음",
            "꿈에서 이미 만났는데 현실이랑 헷갈림",
            "버스에서 옆 사람이 인생 상담 40분 해줌",
            "오늘 운세 지각운이라 어쩔 수 없었음",
            "데자뷰 와서 같은 길 3번 돌음",
          ],
        },
      },
    };

    let currentSituation = 'work';
    let currentCat = 'all';
    let currentExcuse = '';
    let count = 0;
    let lastExcuse = '';

    const excuseBox = document.getElementById('excuseBox');
    const copyBtn = document.getElementById('copyBtn');
    const toast = document.getElementById('toast');
    const totalEl = document.getElementById('totalExcuses');

    function countExcuses(situation) {
      return Object.values(situations[situation].excuses).flat().length;
    }

    function updateTotal() {
      totalEl.textContent = countExcuses(currentSituation);
    }
    updateTotal();

    function selectSituation(tab) {
      document.querySelectorAll('.situation-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSituation = tab.dataset.situation;
      lastExcuse = '';
      updateTotal();
    }

    function selectCategory(tab) {
      document.querySelectorAll('#tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCat = tab.dataset.cat;
      lastExcuse = '';
    }

    document.getElementById('situationTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.situation-tab');
      if (tab) selectSituation(tab);
    });

    document.getElementById('tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab && !tab.classList.contains('situation-tab')) selectCategory(tab);
    });

    function getPool() {
      const pool = situations[currentSituation].excuses;
      if (currentCat === 'all') return Object.values(pool).flat();
      return pool[currentCat] || Object.values(pool).flat();
    }

    function generate() {
      const pool = getPool();
      let excuse;
      do {
        excuse = pool[Math.floor(Math.random() * pool.length)];
      } while (excuse === lastExcuse && pool.length > 1);

      lastExcuse = excuse;
      currentExcuse = excuse;
      count++;
      document.getElementById('countNum').textContent = count;

      excuseBox.classList.add('fade');
      setTimeout(() => {
        excuseBox.textContent = excuse;
        excuseBox.classList.remove('fade');
        excuseBox.classList.add('has-excuse');
        copyBtn.style.display = 'block';
      }, 200);
    }

    function getCopyText() {
      if (!currentExcuse) return '';
      return situations[currentSituation].copy(currentExcuse);
    }

    function copyExcuse() {
      const text = getCopyText();
      if (!text) return;
      copyToClipboard(text).then((ok) => {
        showToast(ok ? '📋 복사 완료! 카톡에 붙여넣기 하세요' : '📋 길게 눌러서 복사해 주세요');
      });
    }

    function share() {
      const text = currentExcuse
        ? `나 오늘 지각했는데 핑계 이거 쓸래 ㅋㅋ\n"${currentExcuse}"`
        : '지각했을 때 쓸 핑계 만들어주는 사이트 발견 ㅋㅋ';
      captureAndShare('지각 핑계 생성기 🏃‍♂️', text);
    }

    bindTap(document.getElementById('generateBtn'), generate);
    bindTap(document.getElementById('copyBtn'), copyExcuse);
    bindTap(document.getElementById('shareBtn'), share);
    bindTap(excuseBox, copyExcuse);


    const params = new URLSearchParams(location.search);
    const shared = params.get('e');
    if (shared) {
      try {
        currentExcuse = decodeURIComponent(shared);
        excuseBox.textContent = currentExcuse;
        excuseBox.classList.add('has-excuse');
        copyBtn.style.display = 'block';
      } catch {}
    }

})();
