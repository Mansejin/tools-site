(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var API_BASE = (params.get("api") || localStorage.getItem("tq-api") || "").replace(/\/$/, "");
  var EVENT_ID = params.get("event") || "demo";
  var LIVE = Boolean(API_BASE);

  var MODE = {
    demo: { ahead: 120, behind: 1800, seats: 40, admitPerSec: 8, label: "체험" },
    chaos: { ahead: 512348, behind: 1487652, seats: 120, admitPerSec: 2500, label: "명절 실감" },
  };

  var ACTIVE_TTL_MS = 180000;
  var state = {
    mode: "demo",
    speed: 1,
    uuid: "",
    token: "",
    ahead: 0,
    behind: 0,
    startAhead: 0,
    seatsLeft: 0,
    wantSeats: 1,
    phase: "start",
    booked: false,
    bookedBy: {},
    pollTimer: null,
    simTimer: null,
    activeDeadline: 0,
    activeTick: null,
    nextPollAt: 0,
  };

  var el = {
    joinBtn: document.getElementById("joinBtn"),
    bookBtn: document.getElementById("bookBtn"),
    retryBtn: document.getElementById("retryBtn"),
    rankNum: document.getElementById("rankNum"),
    behindNum: document.getElementById("behindNum"),
    totalNum: document.getElementById("totalNum"),
    ttlNum: document.getElementById("ttlNum"),
    admitNum: document.getElementById("admitNum"),
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
    modeTabs: document.getElementById("modeTabs"),
    liveBanner: document.getElementById("liveBanner"),
  };

  var views = {
    start: document.getElementById("viewStart"),
    queue: document.getElementById("viewQueue"),
    active: document.getElementById("viewActive"),
    result: document.getElementById("viewResult"),
  };

  var tips = [
    "폴링: 서버에 “나 몇 번째?”만 짧게 물어보고 끊습니다.",
    "순번이 멀수록 폴링 간격을 길게, 가까워지면 짧게 잡습니다.",
    "ZSET은 같은 UUID가 연타해도 한 줄만 유지됩니다.",
    "스케줄러가 뒤단 TPS에 맞춰 앞에서부터 N명만 Active로 올립니다.",
  ];

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function fmt(n) {
    return Math.max(0, Math.floor(n)).toLocaleString("ko-KR");
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
    if (state.simTimer) clearInterval(state.simTimer);
    if (state.activeTick) clearInterval(state.activeTick);
    state.pollTimer = state.simTimer = state.activeTick = null;
  }

  function pollIntervalSec(ahead) {
    if (ahead > 100000) return 5;
    if (ahead > 10000) return 3;
    if (ahead > 500) return 2;
    return 1;
  }

  function renderQueue() {
    el.rankNum.textContent = fmt(state.ahead);
    el.behindNum.textContent = fmt(state.behind);
    el.totalNum.textContent = fmt(state.ahead + 1 + state.behind);
    el.uuidText.textContent = state.uuid;
    if (LIVE) {
      el.admitNum.textContent = "서버";
    } else {
      el.admitNum.textContent = MODE[state.mode].admitPerSec * state.speed + "/초";
    }
    var done = state.startAhead <= 0 ? 1 : 1 - state.ahead / state.startAhead;
    el.progressBar.style.width = Math.min(100, Math.max(0, done * 100)).toFixed(1) + "%";
    var ttl = pollIntervalSec(state.ahead);
    var remain = Math.max(0, (state.nextPollAt - Date.now()) / 1000);
    el.ttlNum.textContent = remain.toFixed(1) + "s (주기 " + ttl + "s)";
  }

  /* ── Live API ── */
  async function api(path, opts) {
    var res = await fetch(API_BASE + path, opts);
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

  async function liveJoin() {
    clearTimers();
    setView("queue");
    setPipe("queue");
    el.queueTip.textContent = "라이브 API에 줄 서는 중… " + API_BASE;
    try {
      var join = await api("/v1/events/" + encodeURIComponent(EVENT_ID) + "/join", {
        method: "POST",
      });
      state.uuid = join.userId;
      state.token = join.token;
      state.phase = "queue";
      state.wantSeats = 1;
      state.startAhead = 0;
      document.querySelectorAll(".seat-tab").forEach(function (b, i) {
        b.classList.toggle("active", i === 0);
      });
      showToast("대기열 등록됨");
      livePollSoon(0);
    } catch (err) {
      setView("start");
      showToast("접속 실패: " + err.message);
    }
  }

  function livePollSoon(delaySec) {
    clearTimeout(state.pollTimer);
    state.nextPollAt = Date.now() + delaySec * 1000;
    renderQueue();
    state.pollTimer = setTimeout(livePoll, Math.max(0, delaySec * 1000));
  }

  async function livePoll() {
    if (state.phase !== "queue" && state.phase !== "active") return;
    try {
      var st = await api(
        "/v1/events/" +
          encodeURIComponent(EVENT_ID) +
          "/status?userId=" +
          encodeURIComponent(state.uuid) +
          "&token=" +
          encodeURIComponent(state.token)
      );

      if (st.phase === "waiting") {
        state.ahead = st.ahead;
        state.behind = st.behind;
        if (!state.startAhead) state.startAhead = Math.max(st.ahead, 1);
        el.queueTip.textContent = tips[Math.floor(Math.random() * tips.length)];
        renderQueue();
        livePollSoon(st.pollTtlSec || 1);
        return;
      }

      if (st.phase === "active") {
        enterActiveLive(st);
        return;
      }

      if (st.phase === "booked") {
        finishResult(true, st.seatsTaken || state.wantSeats, st.seatsLeft);
        return;
      }

      if (st.phase === "expired") {
        failTimeout();
        return;
      }

      el.queueTip.textContent = "상태: " + st.phase;
      livePollSoon(st.pollTtlSec || 2);
    } catch (err) {
      el.queueTip.textContent = "폴링 오류: " + err.message;
      livePollSoon(2);
    }
  }

  function enterActiveLive(st) {
    clearTimers();
    state.phase = "active";
    state.ahead = 0;
    state.seatsLeft = st.seatsLeft;
    state.activeDeadline = st.activeExpiresAt || Date.now() + ACTIVE_TTL_MS;
    setView("active");
    setPipe("active");
    el.seatsLeft.textContent = fmt(state.seatsLeft);
    tickActive();
    state.activeTick = setInterval(tickActive, 200);
    showToast("입장! Active 유저");
  }

  async function liveBook() {
    setPipe("book");
    try {
      var out = await api("/v1/events/" + encodeURIComponent(EVENT_ID) + "/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: state.uuid,
          token: state.token,
          seats: state.wantSeats,
        }),
      });
      finishResult(true, out.seatsTaken, out.seatsLeft);
    } catch (err) {
      finishResult(false, state.wantSeats, err.data && err.data.seatsLeft, err.message);
    }
  }

  /* ── Local sim (기존) ── */
  function schedulePoll() {
    var ttl = pollIntervalSec(state.ahead);
    state.nextPollAt = Date.now() + ttl * 1000;
    renderQueue();
    state.pollTimer = setTimeout(function () {
      el.queueTip.textContent = tips[Math.floor(Math.random() * tips.length)];
      renderQueue();
      if (state.phase !== "queue") return;
      schedulePoll();
    }, ttl * 1000);
  }

  function startSimulation() {
    clearTimers();
    var cfg = MODE[state.mode];
    state.uuid = uuid();
    state.token = "";
    state.ahead = cfg.ahead;
    state.behind = cfg.behind;
    state.startAhead = cfg.ahead;
    state.seatsLeft = cfg.seats;
    state.booked = false;
    state.bookedBy = {};
    state.phase = "queue";
    state.wantSeats = 1;

    if (state.mode === "chaos") {
      state.speed = 10;
      document.querySelectorAll(".speed-tab").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-speed") === "10");
      });
      el.queueTip.textContent = "시뮬 가속 중. 실제 백엔드는 ?api= 로 붙이세요.";
    } else {
      state.speed = 1;
      document.querySelectorAll(".speed-tab").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-speed") === "1");
      });
    }

    document.querySelectorAll(".seat-tab").forEach(function (b, i) {
      b.classList.toggle("active", i === 0);
    });

    setView("queue");
    setPipe("queue");
    schedulePoll();

    state.simTimer = setInterval(function () {
      if (state.phase !== "queue") return;
      var admit = (MODE[state.mode].admitPerSec * state.speed) / 10;
      state.ahead = Math.max(0, state.ahead - admit);
      state.behind = Math.max(0, state.behind - admit * 0.15);
      renderQueue();
      if (state.ahead <= 0) enterActiveSim();
    }, 100);
  }

  function enterActiveSim() {
    clearTimers();
    state.phase = "active";
    state.ahead = 0;
    state.activeDeadline = Date.now() + ACTIVE_TTL_MS;
    setView("active");
    setPipe("active");
    el.seatsLeft.textContent = fmt(state.seatsLeft);
    tickActive();
    state.activeTick = setInterval(tickActive, 200);
    showToast("입장! Active 유저로 등록됐어요");
  }

  function atomicBook(userId, n) {
    if (state.bookedBy[userId]) {
      return { ok: false, reason: "already", seats: state.seatsLeft };
    }
    if (state.seatsLeft < n) {
      return { ok: false, reason: "soldout", seats: state.seatsLeft };
    }
    state.seatsLeft -= n;
    state.bookedBy[userId] = n;
    return { ok: true, reason: "ok", seats: state.seatsLeft, taken: n };
  }

  function onBook() {
    if (state.phase !== "active") return;
    if (LIVE) return liveBook();
    setPipe("book");
    var result = atomicBook(state.uuid, state.wantSeats);
    el.seatsLeft.textContent = fmt(result.seats);
    if (!result.ok && result.reason === "already") {
      showToast("이미 예매한 UUID예요");
      setPipe("active");
      return;
    }
    finishResult(result.ok, state.wantSeats, result.seats, result.reason);
  }

  function tickActive() {
    var left = Math.max(0, state.activeDeadline - Date.now());
    var sec = Math.ceil(left / 1000);
    el.activeTtl.textContent =
      Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
    el.activeTtl.classList.toggle("is-low", left < 30000);
    if (left <= 0) {
      clearTimers();
      failTimeout();
    }
  }

  function finishResult(ok, taken, seatsLeft, reason) {
    clearTimers();
    state.phase = "result";
    setView("result");
    if (ok) {
      setPipe("done");
      el.resultEmoji.textContent = "🎉";
      el.resultTitle.textContent = "예매 성공";
      el.resultBody.textContent =
        taken + "장 확보! 남은 좌석 " + fmt(seatsLeft == null ? 0 : seatsLeft) + "석.";
      el.resultTip.textContent = LIVE
        ? "Redis Lua로 원자 차감까지 실제 서버에서 처리했습니다."
        : "실무에선 MQ → DB 저장을 붙이면 됩니다.";
      state.booked = true;
    } else {
      setPipe("book");
      el.resultEmoji.textContent = "😢";
      el.resultTitle.textContent = "예매 실패";
      el.resultBody.textContent =
        (reason || "soldout") +
        " · 요청 " +
        taken +
        "장 · 남은 좌석 " +
        fmt(seatsLeft == null ? 0 : seatsLeft) +
        "석.";
      el.resultTip.textContent = "잔여가 부족하거나 Active가 만료되면 실패합니다.";
    }
  }

  function failTimeout() {
    state.phase = "result";
    setView("result");
    setPipe("active");
    el.resultEmoji.textContent = "⏰";
    el.resultTitle.textContent = "시간 초과 · 퇴장";
    el.resultBody.textContent = "Active TTL이 끝나 입장권이 사라졌습니다.";
    el.resultTip.textContent = "대기열 이탈자를 일일이 지우는 대신 Active TTL로 버립니다.";
  }

  function reset() {
    clearTimers();
    state.phase = "start";
    setView("start");
    setPipe("queue");
    el.pipe.querySelectorAll(".pipe-step").forEach(function (step, i) {
      step.classList.toggle("is-on", i === 0);
      step.classList.remove("is-done");
    });
  }

  function onJoin() {
    if (LIVE) liveJoin();
    else startSimulation();
  }

  if (LIVE) {
    if (el.headerSubtitle) {
      el.headerSubtitle.textContent = "라이브 API · " + API_BASE + " · event=" + EVENT_ID;
    }
    if (el.modeTabs) el.modeTabs.hidden = true;
    if (el.liveBanner) {
      el.liveBanner.hidden = false;
      el.liveBanner.textContent = "실제 Redis 백엔드에 연결됨";
    }
    var speedWrap = document.getElementById("speedTabs");
    if (speedWrap && speedWrap.previousElementSibling) {
      speedWrap.previousElementSibling.hidden = true;
      speedWrap.hidden = true;
    }
  }

  if (el.modeTabs) {
    el.modeTabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".mode-tab");
      if (!btn) return;
      document.querySelectorAll(".mode-tab").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      state.mode = btn.getAttribute("data-mode");
    });
  }

  var speedTabs = document.getElementById("speedTabs");
  if (speedTabs) {
    speedTabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".speed-tab");
      if (!btn) return;
      document.querySelectorAll(".speed-tab").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      state.speed = Number(btn.getAttribute("data-speed")) || 1;
      renderQueue();
    });
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

  el.joinBtn.addEventListener("click", onJoin);
  el.bookBtn.addEventListener("click", onBook);
  el.retryBtn.addEventListener("click", reset);
})();
