(function () {
  "use strict";

  var MODE = {
    demo: { ahead: 120, behind: 1800, seats: 40, admitPerSec: 8, label: "체험" },
    // 실제 90명/초면 50만 번대는 몇 시간. 숫자 실감만 살리고 입장은 데모용으로 가속.
    chaos: { ahead: 512348, behind: 1487652, seats: 120, admitPerSec: 2500, label: "명절 실감" },
  };

  var ACTIVE_TTL_MS = 180000;
  var state = {
    mode: "demo",
    speed: 1,
    uuid: "",
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
  };

  var views = {
    start: document.getElementById("viewStart"),
    queue: document.getElementById("viewQueue"),
    active: document.getElementById("viewActive"),
    result: document.getElementById("viewResult"),
  };

  var tips = [
    "폴링: 서버에 “나 몇 번째?”만 짧게 물어보고 끊습니다. 전화 50만 대 열어두는 것보다 싸요.",
    "순번이 멀수록 폴링 간격을 길게(TTL↑), 가까워지면 짧게(TTL↓) 잡습니다.",
    "WebSocket은 연결을 계속 들고 있어서, 이 규모에선 재접속 폭풍이 더 위험할 수 있어요.",
    "ZSET은 같은 사람(UUID)이 연타해도 한 줄만 유지됩니다. 멱등성!",
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
    var steps = el.pipe.querySelectorAll(".pipe-step");
    steps.forEach(function (step) {
      var s = step.getAttribute("data-stage");
      var si = order.indexOf(s);
      step.classList.toggle("is-on", si === idx);
      step.classList.toggle("is-done", si < idx);
    });
  }

  function pollIntervalSec(ahead) {
    if (ahead > 100000) return 5;
    if (ahead > 10000) return 3;
    if (ahead > 500) return 2;
    return 1;
  }

  function clearTimers() {
    if (state.pollTimer) clearTimeout(state.pollTimer);
    if (state.simTimer) clearInterval(state.simTimer);
    if (state.activeTick) clearInterval(state.activeTick);
    state.pollTimer = null;
    state.simTimer = null;
    state.activeTick = null;
  }

  function renderQueue() {
    el.rankNum.textContent = fmt(state.ahead);
    el.behindNum.textContent = fmt(state.behind);
    el.totalNum.textContent = fmt(state.ahead + 1 + state.behind);
    el.admitNum.textContent = MODE[state.mode].admitPerSec * state.speed + "/초";
    el.uuidText.textContent = state.uuid;

    var done = state.startAhead <= 0 ? 1 : 1 - state.ahead / state.startAhead;
    el.progressBar.style.width = Math.min(100, Math.max(0, done * 100)).toFixed(1) + "%";

    var ttl = pollIntervalSec(state.ahead);
    var remain = Math.max(0, (state.nextPollAt - Date.now()) / 1000);
    el.ttlNum.textContent = remain.toFixed(1) + "s (주기 " + ttl + "s)";
  }

  function schedulePoll() {
    var ttl = pollIntervalSec(state.ahead);
    state.nextPollAt = Date.now() + ttl * 1000;
    renderQueue();
    state.pollTimer = setTimeout(function onPoll() {
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
    state.ahead = cfg.ahead;
    state.behind = cfg.behind;
    state.startAhead = cfg.ahead;
    state.seatsLeft = cfg.seats;
    state.booked = false;
    state.bookedBy = {};
    state.phase = "queue";
    state.wantSeats = 1;

    // 명절 모드는 숫자만 실감, 기다림은 짧게 — 10× 기본
    if (state.mode === "chaos") {
      state.speed = 10;
      document.querySelectorAll(".speed-tab").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-speed") === "10");
      });
      el.queueTip.textContent =
        "실제면 몇 시간짜리를, 여기선 입장 속도만 가속했어요. 순번·폴링 TTL 감각은 그대로입니다.";
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
      if (state.ahead <= 0) enterActive();
    }, 100);
  }

  function enterActive() {
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

  function tickActive() {
    var left = Math.max(0, state.activeDeadline - Date.now());
    var sec = Math.ceil(left / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    el.activeTtl.textContent = m + ":" + String(s).padStart(2, "0");
    el.activeTtl.classList.toggle("is-low", left < 30000);
    if (left <= 0) {
      clearTimers();
      failTimeout();
    }
  }

  /**
   * Lua 스크립트 흉내: 이미 예매했는지 확인 → 잔여 좌석 확인 → 차감
   * 한 함수 안에서 끝내서 "중간에 끼어들기"가 없게 표현.
   */
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
    setPipe("book");
    var result = atomicBook(state.uuid, state.wantSeats);
    el.seatsLeft.textContent = fmt(result.seats);

    if (!result.ok && result.reason === "already") {
      showToast("이미 예매한 UUID예요 (멱등 차단)");
      setPipe("active");
      return;
    }

    clearTimers();
    state.phase = "result";

    if (result.ok) {
      setPipe("done");
      setView("result");
      el.resultEmoji.textContent = "🎉";
      el.resultTitle.textContent = "예매 성공";
      el.resultBody.textContent =
        state.wantSeats +
        "장 확보! 남은 좌석 " +
        fmt(result.seats) +
        "석. 이제 MQ/워커가 DB에 저장한다고 치면 됩니다.";
      el.resultTip.textContent =
        "실무에선 여기서 바로 DB에 넣거나, MQ에 넣고 바로 응답한 뒤 워커가 저장합니다. 결제는 뒤로 미룹니다.";
      state.booked = true;
    } else {
      setPipe("book");
      setView("result");
      el.resultEmoji.textContent = "😢";
      el.resultTitle.textContent = "잔여 좌석 부족";
      el.resultBody.textContent =
        "요청 " + state.wantSeats + "장 · 남은 좌석 " + fmt(result.seats) + "석. Lua가 실패로 끝냈어요.";
      el.resultTip.textContent =
        "확인과 차감이 한 방이라, 두 자리만 남았는데 세 장을 요청하면 절대 -1이 되지 않습니다.";
    }
  }

  function failTimeout() {
    state.phase = "result";
    setView("result");
    setPipe("active");
    el.resultEmoji.textContent = "⏰";
    el.resultTitle.textContent = "시간 초과 · 퇴장";
    el.resultBody.textContent =
      "Active TTL이 끝나 입장권이 사라졌습니다. 브라우저는 닫았거나, 아무것도 안 한 사람과 같은 처리예요.";
    el.resultTip.textContent =
      "대기열에서 이탈자를 일일이 지우는 대신, Active에서 TTL로 버리는 편이 비용이 싸다는 그 이야기.";
  }

  function reset() {
    clearTimers();
    state.phase = "start";
    setView("start");
    setPipe("queue");
    var steps = el.pipe.querySelectorAll(".pipe-step");
    steps.forEach(function (step, i) {
      step.classList.toggle("is-on", i === 0);
      step.classList.remove("is-done");
    });
  }

  document.getElementById("modeTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".mode-tab");
    if (!btn) return;
    document.querySelectorAll(".mode-tab").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    state.mode = btn.getAttribute("data-mode");
  });

  document.getElementById("speedTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".speed-tab");
    if (!btn) return;
    document.querySelectorAll(".speed-tab").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    state.speed = Number(btn.getAttribute("data-speed")) || 1;
    renderQueue();
  });

  document.getElementById("seatTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".seat-tab");
    if (!btn) return;
    document.querySelectorAll(".seat-tab").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    state.wantSeats = Number(btn.getAttribute("data-seats")) || 1;
  });

  el.joinBtn.addEventListener("click", startSimulation);
  el.bookBtn.addEventListener("click", onBook);
  el.retryBtn.addEventListener("click", reset);

  // 더블클릭으로 중복 예매 시도 데모 (성공 직후 같은 UUID)
  el.bookBtn.addEventListener("dblclick", function () {
    if (state.booked) {
      var r = atomicBook(state.uuid, 1);
      if (!r.ok && r.reason === "already") {
        showToast("같은 UUID 두 번째 예매 → 차단됨");
      }
    }
  });
})();
