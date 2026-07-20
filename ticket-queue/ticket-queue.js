(function () {
  "use strict";

  var STORAGE_API = "tq-api";
  var STORAGE_EVENT = "tq-event";
  var STORAGE_CLIENT = "tq-client-id";
  var params = new URLSearchParams(location.search);

  function ensureClientId() {
    var existing = localStorage.getItem(STORAGE_CLIENT);
    if (existing) return existing;
    var id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random();
    // uuid package validates RFC; keep browser crypto UUID
    localStorage.setItem(STORAGE_CLIENT, id);
    return id;
  }

  var state = {
    apiBase: (params.get("api") || localStorage.getItem(STORAGE_API) || "").replace(/\/$/, ""),
    eventId: params.get("event") || localStorage.getItem(STORAGE_EVENT) || "demo",
    clientId: ensureClientId(),
    userId: "",
    token: "",
    ahead: 0,
    behind: 0,
    startAhead: 0,
    seatsLeft: 0,
    wantSeats: 1,
    phase: "setup",
    pollTimer: null,
    activeTick: null,
    activeDeadline: 0,
    nextPollAt: 0,
  };

  var el = {
    apiInput: document.getElementById("apiInput"),
    eventInput: document.getElementById("eventInput"),
    connectBtn: document.getElementById("connectBtn"),
    setupErr: document.getElementById("setupErr"),
    joinBtn: document.getElementById("joinBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    bookBtn: document.getElementById("bookBtn"),
    retryBtn: document.getElementById("retryBtn"),
    statsBlurb: document.getElementById("statsBlurb"),
    rankNum: document.getElementById("rankNum"),
    behindNum: document.getElementById("behindNum"),
    totalNum: document.getElementById("totalNum"),
    ttlNum: document.getElementById("ttlNum"),
    queueSeats: document.getElementById("queueSeats"),
    progressBar: document.getElementById("progressBar"),
    uuidText: document.getElementById("uuidText"),
    queueTip: document.getElementById("queueTip"),
    seatsLeft: document.getElementById("seatsLeft"),
    activeTtl: document.getElementById("activeTtl"),
    resultEmoji: document.getElementById("resultEmoji"),
    resultTitle: document.getElementById("resultTitle"),
    resultBody: document.getElementById("resultBody"),
    resultTip: document.getElementById("resultTip"),
    toast: document.getElementById("toast"),
    pipe: document.getElementById("pipe"),
    headerSubtitle: document.getElementById("headerSubtitle"),
    liveBanner: document.getElementById("liveBanner"),
  };

  var views = {
    setup: document.getElementById("viewSetup"),
    start: document.getElementById("viewStart"),
    queue: document.getElementById("viewQueue"),
    active: document.getElementById("viewActive"),
    result: document.getElementById("viewResult"),
  };

  function fmt(n) {
    return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR");
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.toast.classList.remove("show");
    }, 1800);
  }

  function setView(name) {
    Object.keys(views).forEach(function (k) {
      views[k].hidden = k !== name;
    });
  }

  function setPipe(stage) {
    var order = ["queue", "active", "book", "done"];
    var idx = order.indexOf(stage);
    el.pipe.querySelectorAll(".pipe-step").forEach(function (step) {
      var si = order.indexOf(step.getAttribute("data-stage"));
      step.classList.toggle("is-on", si === idx);
      step.classList.toggle("is-done", si < idx);
    });
  }

  function clearTimers() {
    if (state.pollTimer) clearTimeout(state.pollTimer);
    if (state.activeTick) clearInterval(state.activeTick);
    state.pollTimer = state.activeTick = null;
  }

  async function api(path, opts) {
    var res = await fetch(state.apiBase + path, opts);
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      var err = new Error(data.error || "http_" + res.status);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function renderQueue() {
    el.rankNum.textContent = fmt(state.ahead);
    el.behindNum.textContent = fmt(state.behind);
    el.totalNum.textContent = fmt(state.ahead + 1 + state.behind);
    el.queueSeats.textContent = fmt(state.seatsLeft);
    el.uuidText.textContent = state.userId;
    var done = state.startAhead <= 0 ? 1 : 1 - state.ahead / state.startAhead;
    el.progressBar.style.width = Math.min(100, Math.max(0, done * 100)).toFixed(1) + "%";
    var remain = Math.max(0, (state.nextPollAt - Date.now()) / 1000);
    el.ttlNum.textContent = remain.toFixed(1) + "s";
  }

  function showConnected() {
    el.liveBanner.hidden = false;
    el.liveBanner.textContent = "연결됨 · " + state.apiBase;
    el.headerSubtitle.textContent = "event=" + state.eventId;
  }

  async function refreshStats() {
    var stats = await api("/v1/events/" + encodeURIComponent(state.eventId) + "/stats");
    el.statsBlurb.innerHTML =
      "<p>대기 <strong>" +
      fmt(stats.waiting) +
      "</strong> · Active <strong>" +
      fmt(stats.active) +
      "</strong> · 좌석 <strong>" +
      fmt(stats.seatsLeft) +
      "</strong> · 예매완료 <strong>" +
      fmt(stats.booked) +
      "</strong></p>" +
      "<p>입장 " +
      fmt(stats.admitPerSec) +
      "명/초 · Active TTL " +
      fmt(stats.activeTtlSec) +
      "초</p>";
  }

  async function loadConfigFile() {
    try {
      var res = await fetch("config.json", { cache: "no-store" });
      if (!res.ok) return;
      var cfg = await res.json();
      if (!state.apiBase && cfg.apiBase) {
        state.apiBase = String(cfg.apiBase).replace(/\/$/, "");
      }
      if (cfg.eventId && !params.get("event") && !localStorage.getItem(STORAGE_EVENT)) {
        state.eventId = String(cfg.eventId);
      }
    } catch (_) {
      /* optional */
    }
  }

  async function connect() {
    el.setupErr.hidden = true;
    var base = (el.apiInput.value || "").trim().replace(/\/$/, "");
    var eventId = (el.eventInput.value || "demo").trim() || "demo";
    if (!base) {
      el.setupErr.textContent = "서버 주소를 입력하세요.";
      el.setupErr.hidden = false;
      return;
    }
    state.apiBase = base;
    state.eventId = eventId;
    try {
      var health = await api("/health");
      if (!health.ok) throw new Error("health_failed");
      localStorage.setItem(STORAGE_API, state.apiBase);
      localStorage.setItem(STORAGE_EVENT, state.eventId);
      showConnected();
      await refreshStats();
      state.phase = "start";
      setView("start");
      setPipe("queue");
      showToast("서버 연결됨");
    } catch (err) {
      el.setupErr.textContent =
        "연결 실패: " + err.message + " (서버가 켜져 있고 CORS가 열려 있는지 확인)";
      el.setupErr.hidden = false;
    }
  }

  async function join() {
    clearTimers();
    setView("queue");
    setPipe("queue");
    el.queueTip.textContent = "대기열 등록 중…";
    try {
      var out = await api("/v1/events/" + encodeURIComponent(state.eventId) + "/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: state.clientId }),
      });
      state.userId = out.userId;
      state.token = out.token;
      state.phase = "queue";
      state.wantSeats = 1;
      state.startAhead = 0;
      document.querySelectorAll(".seat-tab").forEach(function (b, i) {
        b.classList.toggle("active", i === 0);
      });
      showToast(out.resumed ? "기존 대기열 재개" : "대기열 등록");
      if (out.phase === "active") {
        enterActive({
          seatsLeft: state.seatsLeft,
          activeExpiresAt: out.activeExpiresAt,
        });
        return;
      }
      if (out.phase === "booked") {
        finish(true, out.seatsTaken || 1, state.seatsLeft);
        return;
      }
      pollSoon(0);
    } catch (err) {
      showToast("접수 실패: " + err.message);
      setView("start");
    }
  }

  function pollSoon(delaySec) {
    clearTimeout(state.pollTimer);
    state.nextPollAt = Date.now() + delaySec * 1000;
    renderQueue();
    state.pollTimer = setTimeout(poll, Math.max(0, delaySec * 1000));
  }

  async function poll() {
    if (state.phase !== "queue" && state.phase !== "active") return;
    try {
      var st = await api(
        "/v1/events/" +
          encodeURIComponent(state.eventId) +
          "/status?userId=" +
          encodeURIComponent(state.userId) +
          "&token=" +
          encodeURIComponent(state.token)
      );

      if (st.phase === "waiting") {
        state.ahead = st.ahead;
        state.behind = st.behind;
        state.seatsLeft = st.seatsLeft;
        if (!state.startAhead) state.startAhead = Math.max(st.ahead, 1);
        el.queueTip.textContent = "순번 " + fmt(st.rank) + " · 서버 폴링 중";
        renderQueue();
        pollSoon(st.pollTtlSec || 1);
        return;
      }
      if (st.phase === "active") {
        enterActive(st);
        return;
      }
      if (st.phase === "booked") {
        finish(true, st.seatsTaken || state.wantSeats, st.seatsLeft);
        return;
      }
      if (st.phase === "expired") {
        finishTimeout();
        return;
      }
      el.queueTip.textContent = "상태: " + st.phase;
      pollSoon(st.pollTtlSec || 2);
    } catch (err) {
      el.queueTip.textContent = "폴링 오류: " + err.message;
      pollSoon(2);
    }
  }

  function enterActive(st) {
    clearTimers();
    state.phase = "active";
    state.ahead = 0;
    state.seatsLeft = st.seatsLeft;
    state.activeDeadline = st.activeExpiresAt || Date.now() + 180000;
    setView("active");
    setPipe("active");
    el.seatsLeft.textContent = fmt(state.seatsLeft);
    tickActive();
    state.activeTick = setInterval(tickActive, 200);
    showToast("입장");
  }

  function tickActive() {
    var left = Math.max(0, state.activeDeadline - Date.now());
    var sec = Math.ceil(left / 1000);
    el.activeTtl.textContent =
      Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
    el.activeTtl.classList.toggle("is-low", left < 30000);
    if (left <= 0) {
      clearTimers();
      finishTimeout();
    }
  }

  async function book() {
    if (state.phase !== "active") return;
    setPipe("book");
    try {
      var out = await api("/v1/events/" + encodeURIComponent(state.eventId) + "/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: state.userId,
          token: state.token,
          seats: state.wantSeats,
        }),
      });
      finish(true, out.seatsTaken, out.seatsLeft);
    } catch (err) {
      finish(false, state.wantSeats, err.data && err.data.seatsLeft, err.message);
    }
  }

  function finish(ok, taken, seatsLeft, reason) {
    clearTimers();
    state.phase = "result";
    setView("result");
    if (ok) {
      setPipe("done");
      el.resultEmoji.textContent = "🎉";
      el.resultTitle.textContent = "예매 성공";
      el.resultBody.textContent =
        taken + "장 확보 · 남은 좌석 " + fmt(seatsLeft == null ? 0 : seatsLeft) + "석";
      el.resultTip.textContent = "Redis Lua 원자 차감으로 처리되었습니다.";
    } else {
      setPipe("book");
      el.resultEmoji.textContent = "😢";
      el.resultTitle.textContent = "예매 실패";
      el.resultBody.textContent =
        (reason || "실패") +
        " · 요청 " +
        taken +
        "장 · 남은 좌석 " +
        fmt(seatsLeft == null ? 0 : seatsLeft) +
        "석";
      el.resultTip.textContent = "좌석 부족이거나 Active가 만료된 경우입니다.";
    }
  }

  function finishTimeout() {
    state.phase = "result";
    setView("result");
    setPipe("active");
    el.resultEmoji.textContent = "⏰";
    el.resultTitle.textContent = "시간 초과";
    el.resultBody.textContent = "Active TTL이 끝나 퇴장 처리되었습니다.";
    el.resultTip.textContent = "다시 줄 서서 입장할 수 있습니다.";
  }

  function openSetup() {
    clearTimers();
    state.phase = "setup";
    setView("setup");
    setPipe("queue");
    el.apiInput.value = state.apiBase || "http://127.0.0.1:8787";
    el.eventInput.value = state.eventId || "demo";
  }

  async function backToStart() {
    clearTimers();
    state.phase = "start";
    setView("start");
    setPipe("queue");
    try {
      await refreshStats();
    } catch (_) {
      /* ignore */
    }
  }

  document.getElementById("seatTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".seat-tab");
    if (!btn) return;
    document.querySelectorAll(".seat-tab").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    state.wantSeats = Number(btn.getAttribute("data-seats")) || 1;
  });

  el.connectBtn.addEventListener("click", connect);
  el.joinBtn.addEventListener("click", join);
  el.settingsBtn.addEventListener("click", openSetup);
  el.bookBtn.addEventListener("click", book);
  el.retryBtn.addEventListener("click", backToStart);

  el.apiInput.value = state.apiBase || "http://127.0.0.1:8787";
  el.eventInput.value = state.eventId || "demo";

  loadConfigFile().then(function () {
    el.apiInput.value = state.apiBase || el.apiInput.value;
    el.eventInput.value = state.eventId || "demo";
    if (state.apiBase) connect();
    else openSetup();
  });
})();
