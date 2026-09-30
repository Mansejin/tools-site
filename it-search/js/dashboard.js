(function () {
  "use strict";

  var PS = window.PS;
  var esc = PS.escapeHtml;
  var app = document.getElementById("app");
  var demo = new URLSearchParams(location.search).has("demo");

  var TABS = [
    { id: "products", label: "순위" },
    { id: "candidates", label: "후보 입력" },
    { id: "plans", label: "영상 기획" },
  ];

  var state = {
    data: null,
    items: [],
    tab: tabFromHash(),
    category: "all",
    query: "",
    sort: "score",
    cands: [],
    candsDirty: false,
    plans: [],
    plansDirty: false,
    planEdit: false,
    planStatus: "all",
    planQuery: "",
    openPlan: -1,
    saving: false,
  };

  var SORTS = [
    { id: "score", label: "총점 높은순" },
    { id: "views", label: "유튜브 조회수 높은순" },
    { id: "outlier", label: "떡상(조회수/구독자) 높은순" },
    { id: "supply", label: "영상 적은순" },
    { id: "trend", label: "검색추세 좋은순" },
  ];

  var SCORE_FIELDS = [
    ["유튜브수요점수", "유튜브 수요"],
    ["영상경쟁점수", "영상 경쟁"],
    ["떡상점수", "떡상 가능성"],
    ["검색수요점수", "검색 수요"],
    ["검색추세점수", "검색 추세"],
    ["쇼핑추세점수", "쇼핑 추세"],
    ["입수", "입수"],
    ["촬영거리", "촬영거리"],
    ["채널적합", "채널 적합"],
    ["제휴수익", "제휴 수익"],
  ];

  var CANDIDATE_FIELDS = ["키워드", "분야", "메모", "출시일", "가격", "입수", "촬영거리", "채널적합", "제휴", "쇼핑카테고리"];
  var CATEGORIES = ["스마트폰", "노트북·태블릿", "오디오", "웨어러블", "스마트홈", "주변기기", "카메라·액션캠", "게이밍", "충전·액세서리"];
  var CANDIDATE_COLUMNS = [
    { key: "키워드", label: "키워드", kind: "text", cls: "col-keyword" },
    { key: "분야", label: "분야", kind: "category" },
    { key: "출시일", label: "출시일", kind: "text", hint: "2026-09" },
    { key: "가격", label: "가격", kind: "number", hint: "원" },
    { key: "입수", label: "입수", kind: "score" },
    { key: "촬영거리", label: "촬영거리", kind: "score" },
    { key: "채널적합", label: "채널적합", kind: "score" },
    { key: "제휴", label: "제휴", kind: "score" },
    { key: "메모", label: "메모", kind: "text", cls: "col-memo" },
  ];

  var PLAN_STATUSES = ["아이디어", "제품확보", "촬영", "편집", "업로드", "보류"];
  var PLAN_FORMATS = ["롱폼", "쇼츠", "롱폼+쇼츠"];
  var PLAN_INPUTS = [
    ["title", "제목안", "한 달 써보고 느낀 점"],
    ["product", "제품", "순위의 키워드"],
    ["format", "형식", ""],
    ["status", "상태", ""],
    ["source", "입수 경로", "구매 / 대여 / 협찬"],
    ["due", "업로드 목표일", "2026-10-15"],
    ["hook", "오프닝 훅", "첫 5초 대사"],
    ["url", "업로드 링크", "https://youtu.be/…"],
  ];
  var PLAN_KEYS = PLAN_INPUTS.map(function (f) { return f[0]; }).concat(["angle", "memo"]);

  function tabFromHash() {
    var id = location.hash.slice(1);
    return TABS.some(function (t) { return t.id === id; }) ? id : "products";
  }

  function num(value) {
    if (value === "" || value == null) return null;
    var n = Number(String(value).replace(/,/g, ""));
    return isFinite(n) ? n : null;
  }

  function fmtInt(value) {
    var n = num(value);
    return n == null ? "" : Math.round(n).toLocaleString("ko-KR");
  }

  function fmtViews(value) {
    var n = num(value);
    if (n == null) return "";
    if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + "만";
    return Math.round(n).toLocaleString("ko-KR");
  }

  function fmtRatio(value) {
    var n = num(value);
    return n == null ? "" : n.toFixed(2) + "배";
  }

  function fmtPercent(value) {
    var n = num(value);
    return n == null ? "" : Math.round(n * 100) + "%";
  }

  function toItems(data) {
    var headers = data.headers || [];
    return (data.rows || [])
      .map(function (row) {
        var item = {};
        headers.forEach(function (h, i) { item[h] = row[i]; });
        return item;
      })
      .filter(function (item) { return String(item["키워드"] || "").trim(); });
  }

  function copyCandidates(list) {
    return (list || []).map(function (c) {
      var row = {};
      CANDIDATE_FIELDS.forEach(function (f) { row[f] = c[f] == null ? "" : String(c[f]); });
      return row;
    });
  }

  function blankPlan() {
    var p = {};
    PLAN_KEYS.forEach(function (k) { p[k] = ""; });
    p.format = "롱폼";
    p.status = "아이디어";
    return p;
  }

  function copyPlans(list) {
    return (list || []).map(function (p) {
      var copy = blankPlan();
      PLAN_KEYS.forEach(function (k) { copy[k] = p[k] == null ? "" : String(p[k]); });
      return copy;
    });
  }

  function isDirty() {
    return state.candsDirty || state.plansDirty;
  }

  // —— 로그인 ——

  function renderLogin(message) {
    app.innerHTML =
      '<section class="ps-panel ps-login">' +
      "<h2>로그인</h2>" +
      (message ? '<p class="ps-alert">' + esc(message) + "</p>" : "") +
      '<p class="ps-muted">yt-it-finder <code>.env</code>의 <code>ADMIN_PASSWORD</code> 값이에요.</p>' +
      '<form class="ps-form" id="loginForm">' +
      '<label class="ps-field"><span>비밀번호</span>' +
      '<input type="password" name="password" required autocomplete="current-password"></label>' +
      '<label class="ps-check"><input type="checkbox" name="remember" checked> 이 브라우저에서 기억하기</label>' +
      '<div class="ps-actions">' +
      '<button type="submit" class="btn btn-primary">들어가기</button>' +
      '<a class="btn btn-secondary" href="?demo">예시 화면 보기</a>' +
      "</div></form></section>";
    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      PS.setPassword(e.target.password.value.trim(), e.target.remember.checked);
      load(true);
    });
  }

  function renderError(message) {
    app.innerHTML =
      '<section class="ps-panel">' +
      "<h2>불러오지 못했어요</h2>" +
      '<p class="ps-alert">' + esc(message) + "</p>" +
      '<div class="ps-actions"><button type="button" class="btn btn-primary" id="retry">다시 시도</button></div>' +
      "</section>";
    document.getElementById("retry").addEventListener("click", function () { load(true); });
  }

  // —— 공통 틀 ——

  function setTab(id) {
    state.tab = id;
    history.replaceState(null, "", location.pathname + location.search + (id === "products" ? "" : "#" + id));
    renderDashboard();
  }

  function renderDashboard() {
    var counts = { products: state.items.length, candidates: state.cands.length, plans: state.plans.length };
    document.body.classList.toggle("ps-wide", state.tab === "candidates");
    app.innerHTML =
      (demo ? '<p class="preview-banner">예시 화면이에요. 숫자는 모두 지어낸 값이고 저장되지 않아요. <a href="./">실제 화면</a></p>' : "") +
      '<div class="ps-tabs" role="tablist">' +
      TABS.map(function (t) {
        return (
          '<button type="button" role="tab" class="ps-tab' + (state.tab === t.id ? " active" : "") + '" data-tab="' + t.id + '"' +
          ' aria-selected="' + (state.tab === t.id) + '">' + esc(t.label) + ' <span class="ps-count">' + counts[t.id] + "</span></button>"
        );
      }).join("") +
      '<span class="ps-spacer"></span>' +
      (demo ? "" : '<button type="button" class="ps-link ps-tab-tool" id="refresh">새로고침</button>') +
      (demo ? "" : '<button type="button" class="ps-link ps-tab-tool" id="logout">로그아웃</button>') +
      "</div>" +
      '<div id="tabBody"></div>';

    document.querySelectorAll(".ps-tab").forEach(function (btn) {
      btn.addEventListener("click", function () { setTab(btn.getAttribute("data-tab")); });
    });
    var refresh = document.getElementById("refresh");
    if (refresh) {
      refresh.addEventListener("click", function () {
        if (isDirty() && !confirm("저장하지 않은 변경이 사라져요. 새로고침할까요?")) return;
        load(true);
      });
    }
    var logout = document.getElementById("logout");
    if (logout) {
      logout.addEventListener("click", function () {
        if (isDirty() && !confirm("저장하지 않은 변경이 있어요. 로그아웃할까요?")) return;
        state.candsDirty = state.plansDirty = false;
        PS.clearPassword();
        renderLogin();
      });
    }

    if (state.tab === "candidates") renderCandidates();
    else if (state.tab === "plans") renderPlans();
    else renderProducts();
  }

  function metric(label, valueHtml, hint) {
    if (!valueHtml) valueHtml = '<span class="ps-na">-</span>';
    return (
      '<div class="ps-metric"><dt>' + esc(label) + "</dt><dd>" + valueHtml +
      (hint ? "<small>" + esc(hint) + "</small>" : "") + "</dd></div>"
    );
  }

  function filterButton(attr, id, label, count, active) {
    return (
      '<button type="button" class="filter-btn' + (active === id ? " active" : "") + '" data-' + attr + '="' + esc(id) + '">' +
      esc(label) + ' <span class="ps-count">' + count + "</span></button>"
    );
  }

  function save(path, payload, onSaved) {
    if (demo) {
      PS.toast("예시 화면에서는 저장되지 않아요");
      return;
    }
    if (state.saving) return;
    state.saving = true;
    var buttons = document.querySelectorAll("[data-save]");
    buttons.forEach(function (b) { b.disabled = true; b.textContent = "저장 중…"; });
    PS.api("PUT", path, payload)
      .then(function (res) {
        onSaved(res);
        PS.write(PS.KEYS.cache, JSON.stringify(state.data));
        PS.toast("저장했어요");
      })
      .catch(function (err) {
        if (err.unauthorized) {
          PS.clearPassword();
          renderLogin("비밀번호가 바뀌었어요. 다시 로그인하세요.");
          return;
        }
        PS.toast(err.message || "저장하지 못했어요");
      })
      .then(function () {
        state.saving = false;
        document.querySelectorAll("[data-save]").forEach(function (b) { b.disabled = false; b.textContent = "저장"; });
      });
  }

  // —— 순위 ——

  function renderProducts() {
    var data = state.data;
    var updated = data.updatedAt
      ? "마지막 계산 " + PS.formatDate(data.updatedAt) + (PS.timeAgo(data.updatedAt) ? " · " + PS.timeAgo(data.updatedAt) : "")
      : "아직 계산 기록이 없어요";
    var categories = {};
    state.items.forEach(function (item) {
      var c = String(item["분야"] || "").trim() || "미분류";
      categories[c] = (categories[c] || 0) + 1;
    });
    var stale = data.candidatesUpdatedAt && data.updatedAt && new Date(data.candidatesUpdatedAt) > new Date(data.updatedAt);

    document.getElementById("tabBody").innerHTML =
      '<div class="ps-summary">' +
      "<span><strong>" + state.items.length + "</strong>개 후보</span>" +
      "<span>" + esc(updated) + "</span>" +
      "</div>" +
      (stale ? '<p class="ps-alert">후보 입력이 마지막 계산 이후에 바뀌었어요. PC에서 <code>run.py</code>를 실행하면 순위에 반영돼요.</p>' : "") +
      (state.items.length
        ? '<div class="ps-controls">' +
          '<input type="search" id="query" class="ps-search" placeholder="키워드·메모 검색" value="' + esc(state.query) + '">' +
          '<select id="sort" class="ps-select" aria-label="정렬">' +
          SORTS.map(function (s) {
            return '<option value="' + s.id + '"' + (s.id === state.sort ? " selected" : "") + ">" + s.label + "</option>";
          }).join("") +
          "</select></div>" +
          '<div class="filters" id="filters">' +
          filterButton("category", "all", "전체", state.items.length, state.category) +
          Object.keys(categories).map(function (c) { return filterButton("category", c, c, categories[c], state.category); }).join("") +
          "</div>" +
          '<div class="ps-list" id="list"></div>'
        : '<p class="empty">아직 결과가 없어요. <b>후보 입력</b> 탭에 키워드를 넣고 PC에서 <code>run.py</code>를 실행하세요.</p>');

    if (!state.items.length) return;
    document.getElementById("query").addEventListener("input", function (e) {
      state.query = e.target.value;
      renderList();
    });
    document.getElementById("sort").addEventListener("change", function (e) {
      state.sort = e.target.value;
      renderList();
    });
    document.getElementById("filters").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-category]");
      if (!btn) return;
      state.category = btn.getAttribute("data-category");
      document.querySelectorAll("#filters .filter-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
      renderList();
    });
    document.getElementById("list").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-plan-from]");
      if (btn) addPlanFor(btn.getAttribute("data-plan-from"));
    });
    renderList();
  }

  function sortValue(item) {
    switch (state.sort) {
      case "views": return num(item["조회수 중앙값"]);
      case "outlier": return num(item["조회수/구독자(배)"]);
      case "supply": return num(item["유튜브 90일 영상수"]) == null ? null : -num(item["유튜브 90일 영상수"]);
      case "trend": return num(item["검색추세점수"]) == null ? null : num(item["검색추세점수"]) * 100 + (num(item["검색 전년대비(배)"]) || 0);
      default: return num(item["총점"]);
    }
  }

  function renderList() {
    var q = state.query.trim().toLowerCase();
    var items = state.items.filter(function (item) {
      var c = String(item["분야"] || "").trim() || "미분류";
      if (state.category !== "all" && c !== state.category) return false;
      if (!q) return true;
      return [item["키워드"], item["메모"], item["분야"]].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    items.sort(function (a, b) {
      var va = sortValue(a), vb = sortValue(b);
      if (va == null && vb == null) return (num(a["순위"]) || 0) - (num(b["순위"]) || 0);
      if (va == null) return 1;
      if (vb == null) return -1;
      return vb - va;
    });
    document.getElementById("list").innerHTML = items.length
      ? items.map(card).join("")
      : '<p class="empty">조건에 맞는 후보가 없어요.</p>';
  }

  function scoreTone(score) {
    if (score == null) return "";
    if (score >= 70) return " is-high";
    if (score >= 55) return " is-mid";
    return " is-low";
  }

  function trendText(ratio, score) {
    var r = fmtRatio(ratio);
    if (!r) return "";
    var s = num(score);
    var arrow = s == null ? "" : s >= 4 ? "▲ " : s <= 2 ? "▼ " : "";
    var tone = s == null ? "" : s >= 4 ? "up" : s <= 2 ? "down" : "";
    return '<span class="ps-trend ' + tone + '">' + arrow + esc(r) + "</span>";
  }

  function card(item) {
    var total = num(item["총점"]);
    var peak = num(item["검색 최고점/최근(배)"]);
    var memo = String(item["메모"] || "").trim();
    var topUrl = PS.safeUrl(item["최고 조회 링크"]);
    var recent = fmtInt(item["30일 내 인기영상"]);

    var scores = SCORE_FIELDS.map(function (f) {
      var v = num(item[f[0]]);
      return (
        '<li class="ps-score"><span>' + esc(f[1]) + "</span>" +
        '<span class="ps-dots" aria-label="' + (v == null ? "미입력(3점 취급)" : v + "점") + '">' +
        [1, 2, 3, 4, 5].map(function (i) {
          return '<i class="' + (v != null && i <= v ? "on" : v == null && i <= 3 ? "ghost" : "") + '"></i>';
        }).join("") +
        "</span></li>"
      );
    }).join("");

    var info = [];
    if (item["출시일"]) info.push("출시 " + item["출시일"]);
    if (fmtInt(item["가격"])) info.push(fmtInt(item["가격"]) + "원");
    if (fmtViews(item["최고 조회수"])) info.push("최고 조회수 " + fmtViews(item["최고 조회수"]));

    return (
      '<article class="tool-card ps-card">' +
      '<div class="ps-card-head">' +
      '<span class="ps-rank">' + esc(item["순위"] || "") + "</span>" +
      '<div class="ps-card-title">' +
      "<h2>" + esc(item["키워드"]) + "</h2>" +
      '<div class="ps-card-sub">' +
      (item["분야"] ? '<span class="tag">' + esc(item["분야"]) + "</span>" : "") +
      (info.length ? '<span class="ps-muted">' + esc(info.join(" · ")) + "</span>" : "") +
      (peak != null && peak > 3 ? '<span class="status status-beta">반짝 관심 주의</span>' : "") +
      "</div></div>" +
      '<div class="ps-total' + scoreTone(total) + '"><strong>' + (total == null ? "-" : esc(total)) + "</strong><span>/100</span></div>" +
      "</div>" +
      '<div class="ps-bar" aria-hidden="true"><span class="' + scoreTone(total).trim() + '" style="width:' + Math.max(0, Math.min(100, total || 0)) + '%"></span></div>' +
      '<dl class="ps-metrics">' +
      metric("조회수 중앙값", esc(fmtViews(item["조회수 중앙값"])), "90일 상위 10개") +
      metric("영상 수", esc(fmtInt(item["유튜브 90일 영상수"])), recent ? "90일 · 인기영상 중 30일 내 " + recent + "개" : "90일 추정") +
      metric("조회수/구독자", esc(fmtRatio(item["조회수/구독자(배)"])), "높을수록 작은 채널도 터짐") +
      metric("월검색량", esc(fmtInt(item["월검색량"])), "네이버") +
      metric("검색 추세", trendText(item["검색 전년대비(배)"], item["검색추세점수"]), "전년 대비") +
      metric("쇼츠 비율", esc(fmtPercent(item["쇼츠 비율"])), "인기영상 중 3분 이하") +
      "</dl>" +
      (item["주 구매층"] ? '<p class="ps-buyer"><span>주 구매층</span>' + esc(item["주 구매층"]) + "</p>" : "") +
      (item["최고 조회 영상"]
        ? '<p class="ps-buyer"><span>최고 조회</span>' +
          (topUrl !== "#" ? '<a href="' + esc(topUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(item["최고 조회 영상"]) + " ↗</a>" : esc(item["최고 조회 영상"])) +
          "</p>"
        : "") +
      (memo ? '<p class="ps-memo">' + esc(memo) + "</p>" : "") +
      '<details class="ps-details"><summary>세부 점수</summary>' +
      '<ul class="ps-scores">' + scores + "</ul>" +
      "</details>" +
      '<div class="ps-actions"><button type="button" class="btn btn-secondary" data-plan-from="' + esc(item["키워드"]) + '">+ 영상 기획에 추가</button></div>' +
      "</article>"
    );
  }

  // —— 후보 입력 ——

  function rankByKeyword() {
    var map = {};
    state.items.forEach(function (item) {
      map[String(item["키워드"]).replace(/\s+/g, "").toUpperCase()] = item["순위"];
    });
    return map;
  }

  function candidateCell(row, col, i) {
    var value = row[col.key] || "";
    var attrs = ' data-row="' + i + '" data-key="' + esc(col.key) + '" aria-label="' + esc(col.label) + '"';
    if (col.kind === "category") {
      var options = CATEGORIES.indexOf(value) === -1 && value ? CATEGORIES.concat([value]) : CATEGORIES;
      return (
        "<select" + attrs + ">" +
        (value ? "" : '<option value=""></option>') +
        options.map(function (o) { return '<option value="' + esc(o) + '"' + (o === value ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") +
        "</select>"
      );
    }
    if (col.kind === "score") {
      return (
        "<select" + attrs + ' class="ps-score-select">' +
        ["", "1", "2", "3", "4", "5"].map(function (o) {
          return '<option value="' + o + '"' + (o === value ? " selected" : "") + ">" + (o || "-") + "</option>";
        }).join("") +
        "</select>"
      );
    }
    return (
      '<input type="text"' + attrs + (col.kind === "number" ? ' inputmode="numeric"' : "") +
      ' value="' + esc(value) + '"' + (col.key === "키워드" ? ' placeholder="새 키워드"' : "") + ">"
    );
  }

  function renderCandidates() {
    var ranks = rankByKeyword();
    document.getElementById("tabBody").innerHTML =
      '<div class="ps-summary">' +
      "<span><strong>" + state.cands.length + "</strong>개 후보</span>" +
      '<span class="ps-muted">1~5점은 5가 좋은 쪽이에요 (입수 5 = 구하기 쉬움, 촬영거리 5 = 보여줄 게 많음). 비우면 3점으로 계산해요.</span>' +
      "</div>" +
      '<div class="ps-table-wrap"><table class="ps-table">' +
      "<thead><tr><th>순위</th>" +
      CANDIDATE_COLUMNS.map(function (c) {
        return '<th class="' + (c.cls || "") + '">' + esc(c.label) + (c.hint ? "<small>" + esc(c.hint) + "</small>" : "") + "</th>";
      }).join("") +
      "<th></th></tr></thead><tbody>" +
      state.cands.map(function (row, i) {
        var rank = ranks[String(row["키워드"]).replace(/\s+/g, "").toUpperCase()];
        return (
          "<tr>" +
          '<td class="ps-rank-cell">' + (rank ? esc(rank) : '<span class="ps-muted" title="run.py 실행 전">new</span>') + "</td>" +
          CANDIDATE_COLUMNS.map(function (c) { return '<td class="' + (c.cls || "") + '">' + candidateCell(row, c, i) + "</td>"; }).join("") +
          '<td><button type="button" class="ps-icon-btn ps-danger" data-remove-cand="' + i + '" aria-label="삭제">×</button></td>' +
          "</tr>"
        );
      }).join("") +
      "</tbody></table></div>" +
      '<div class="ps-actions ps-sticky-actions">' +
      '<button type="button" class="btn btn-secondary" id="addCand">+ 후보 추가</button>' +
      '<span class="ps-spacer"></span>' +
      '<span class="ps-muted ps-small">' + (state.candsDirty ? "저장 안 됨" : "저장 후 PC에서 run.py를 돌리면 순위에 반영돼요") + "</span>" +
      '<button type="button" class="btn btn-primary" data-save id="saveCands">저장</button>' +
      "</div>";

    var body = document.getElementById("tabBody");
    body.querySelectorAll("[data-row]").forEach(function (input) {
      var handler = function () {
        state.cands[Number(input.getAttribute("data-row"))][input.getAttribute("data-key")] = input.value;
        if (!state.candsDirty) {
          state.candsDirty = true;
          var note = body.querySelector(".ps-sticky-actions .ps-muted");
          if (note) note.textContent = "저장 안 됨";
        }
      };
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    });
    body.querySelectorAll("[data-remove-cand]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-remove-cand"));
        var name = state.cands[i]["키워드"] || "이 행";
        if (state.cands[i]["키워드"] && !confirm(name + "을(를) 뺄까요? 저장해야 반영돼요.")) return;
        state.cands.splice(i, 1);
        state.candsDirty = true;
        renderCandidates();
      });
    });
    document.getElementById("addCand").addEventListener("click", function () {
      var row = {};
      CANDIDATE_FIELDS.forEach(function (f) { row[f] = ""; });
      state.cands.push(row);
      state.candsDirty = true;
      renderCandidates();
      var inputs = body.querySelectorAll('[data-key="키워드"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
    document.getElementById("saveCands").addEventListener("click", saveCandidates);
  }

  function saveCandidates() {
    var seen = {};
    var rows = [];
    for (var i = 0; i < state.cands.length; i++) {
      var row = {};
      CANDIDATE_FIELDS.forEach(function (f) { row[f] = String(state.cands[i][f] || "").trim(); });
      if (!row["키워드"]) continue;
      var norm = row["키워드"].replace(/\s+/g, "").toUpperCase();
      if (seen[norm]) {
        PS.toast("키워드가 중복돼요: " + row["키워드"]);
        return;
      }
      seen[norm] = true;
      row["가격"] = row["가격"].replace(/[^\d.]/g, "");
      rows.push(row);
    }
    save("/candidates", { candidates: rows }, function (res) {
      state.data.candidates = res.candidates;
      state.data.candidatesUpdatedAt = new Date().toISOString();
      state.cands = copyCandidates(res.candidates);
      state.candsDirty = false;
      renderDashboard();
    });
  }

  // —— 영상 기획 ——

  function planStatus(p) {
    return String(p.status || "").trim() || "아이디어";
  }

  function addPlanFor(keyword) {
    var plan = blankPlan();
    plan.product = keyword;
    plan.title = keyword + " ";
    state.plans.push(plan);
    state.openPlan = state.plans.length - 1;
    state.plansDirty = true;
    state.planEdit = true;
    setTab("plans");
    var input = document.querySelector('.ps-maker-row[open] [data-field="title"]');
    if (input) input.focus();
  }

  function renderPlans() {
    if (state.planEdit) {
      renderPlanEditor();
      return;
    }
    var plans = state.plans;
    var counts = {};
    plans.forEach(function (p) {
      var s = planStatus(p);
      counts[s] = (counts[s] || 0) + 1;
    });
    var statuses = PLAN_STATUSES.filter(function (s) { return counts[s]; })
      .concat(Object.keys(counts).filter(function (s) { return PLAN_STATUSES.indexOf(s) === -1; }));

    document.getElementById("tabBody").innerHTML =
      '<div class="ps-summary">' +
      "<span><strong>" + plans.length + "</strong>개 기획</span>" +
      '<button type="button" class="btn btn-secondary ps-summary-btn" id="editPlans">편집</button>' +
      "</div>" +
      (plans.length
        ? '<div class="ps-controls">' +
          '<input type="search" id="planQuery" class="ps-search" placeholder="제목·제품·메모 검색" value="' + esc(state.planQuery) + '">' +
          "</div>" +
          '<div class="filters" id="planFilters">' +
          filterButton("status", "all", "전체", plans.length, state.planStatus) +
          statuses.map(function (s) { return filterButton("status", s, s, counts[s], state.planStatus); }).join("") +
          "</div>" +
          '<div class="ps-list" id="planList"></div>'
        : '<p class="empty">아직 영상 기획이 없어요. 순위 카드의 <b>+ 영상 기획에 추가</b>나 <b>편집</b>으로 만드세요.</p>');

    document.getElementById("editPlans").addEventListener("click", function () {
      state.planEdit = true;
      renderPlans();
    });
    if (!plans.length) return;
    document.getElementById("planQuery").addEventListener("input", function (e) {
      state.planQuery = e.target.value;
      renderPlanList();
    });
    document.getElementById("planFilters").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-status]");
      if (!btn) return;
      state.planStatus = btn.getAttribute("data-status");
      document.querySelectorAll("#planFilters .filter-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
      renderPlanList();
    });
    renderPlanList();
  }

  function renderPlanList() {
    var q = state.planQuery.trim().toLowerCase();
    var plans = state.plans.filter(function (p) {
      if (state.planStatus !== "all" && planStatus(p) !== state.planStatus) return false;
      if (!q) return true;
      return [p.title, p.product, p.angle, p.hook, p.memo, p.source].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    document.getElementById("planList").innerHTML = plans.length
      ? plans.map(planCard).join("")
      : '<p class="empty">조건에 맞는 기획이 없어요.</p>';
  }

  function statusTone(status) {
    if (status === "업로드") return " is-done";
    if (status === "촬영" || status === "편집") return " is-progress";
    if (status === "제품확보") return " is-asked";
    if (status === "보류") return " is-off";
    return "";
  }

  function planCard(p) {
    var status = planStatus(p);
    var url = PS.safeUrl(p.url);
    return (
      '<article class="tool-card ps-card ps-maker">' +
      '<div class="ps-card-head">' +
      '<div class="ps-card-title">' +
      "<h2>" + esc(p.title) + "</h2>" +
      '<div class="ps-card-sub">' +
      (p.product ? '<span class="tag">' + esc(p.product) + "</span>" : "") +
      (p.format ? '<span class="tag">' + esc(p.format) + "</span>" : "") +
      (p.due ? '<span class="ps-muted">목표 ' + esc(p.due) + "</span>" : "") +
      "</div></div>" +
      '<span class="ps-status-pill' + statusTone(status) + '">' + esc(status) + "</span>" +
      "</div>" +
      (p.hook ? '<p class="ps-buyer"><span>훅</span>' + esc(p.hook) + "</p>" : "") +
      (p.source ? '<p class="ps-buyer"><span>입수</span>' + esc(p.source) + "</p>" : "") +
      (p.angle ? '<p class="ps-memo">' + esc(p.angle) + "</p>" : "") +
      (p.memo ? '<p class="ps-memo">' + esc(p.memo) + "</p>" : "") +
      (url !== "#" ? '<p class="ps-maker-link"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">영상 보기 ↗</a></p>' : "") +
      "</article>"
    );
  }

  function planInput(p, f) {
    var key = f[0];
    var input;
    if (key === "status" || key === "format") {
      var options = key === "status" ? PLAN_STATUSES : PLAN_FORMATS;
      if (p[key] && options.indexOf(p[key]) === -1) options = options.concat([p[key]]);
      input =
        '<select data-field="' + key + '">' +
        options.map(function (o) {
          return '<option value="' + esc(o) + '"' + (o === p[key] ? " selected" : "") + ">" + esc(o) + "</option>";
        }).join("") +
        "</select>";
    } else {
      input =
        '<input type="' + (key === "url" ? "url" : "text") + '" data-field="' + key + '" maxlength="300"' +
        ' placeholder="' + esc(f[2]) + '" value="' + esc(p[key]) + '">';
    }
    return '<label class="ps-field"><span>' + esc(f[1]) + "</span>" + input + "</label>";
  }

  function planSummary(p) {
    return [p.status, p.product, p.format].filter(Boolean).join(" · ");
  }

  function renderPlanEditor() {
    var body = document.getElementById("tabBody");
    body.innerHTML =
      '<div class="ps-summary">' +
      "<span><strong>" + state.plans.length + "</strong>개 편집 중</span>" +
      '<button type="button" class="ps-link ps-summary-btn" id="donePlans">' + (state.plansDirty ? "취소" : "보기로 돌아가기") + "</button>" +
      "</div>" +
      '<div class="ps-link-list">' +
      (state.plans.length
        ? state.plans.map(function (p, i) {
            return (
              '<details class="ps-maker-row" data-index="' + i + '"' + (state.openPlan === i ? " open" : "") + ">" +
              '<summary><span class="ps-maker-name">' + esc(p.title || "(제목 없음)") + "</span>" +
              '<span class="ps-muted ps-small">' + esc(planSummary(p)) + "</span></summary>" +
              '<div class="ps-maker-fields">' +
              PLAN_INPUTS.map(function (f) { return planInput(p, f); }).join("") +
              '<label class="ps-field ps-field-wide"><span>기획 포인트</span>' +
              '<textarea data-field="angle" rows="3" maxlength="1000" placeholder="차별점, 비교 대상, 테스트 항목">' + esc(p.angle) + "</textarea></label>" +
              '<label class="ps-field ps-field-wide"><span>메모</span>' +
              '<textarea data-field="memo" rows="2" maxlength="1000" placeholder="협찬 조건, 촬영 장소, 확인할 점">' + esc(p.memo) + "</textarea></label>" +
              "</div>" +
              '<div class="ps-actions">' +
              '<button type="button" class="ps-icon-btn" data-move="-1" aria-label="위로"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
              '<button type="button" class="ps-icon-btn" data-move="1" aria-label="아래로"' + (i === state.plans.length - 1 ? " disabled" : "") + ">↓</button>" +
              '<span class="ps-spacer"></span>' +
              '<button type="button" class="btn btn-secondary ps-danger" data-remove>삭제</button>' +
              "</div></details>"
            );
          }).join("")
        : '<p class="empty">영상 기획을 추가하세요.</p>') +
      "</div>" +
      '<div class="ps-actions ps-sticky-actions">' +
      '<button type="button" class="btn btn-secondary" id="addPlan">+ 기획 추가</button>' +
      '<span class="ps-spacer"></span>' +
      '<span class="ps-muted ps-small" id="plansNote">' + (state.plansDirty ? "저장 안 됨" : "") + "</span>" +
      '<button type="button" class="btn btn-primary" data-save id="savePlans">저장</button>' +
      "</div>";

    var markDirty = function () {
      state.plansDirty = true;
      document.getElementById("plansNote").textContent = "저장 안 됨";
      document.getElementById("donePlans").textContent = "취소";
    };

    document.getElementById("donePlans").addEventListener("click", function () {
      if (state.plansDirty) {
        if (!confirm("저장하지 않은 변경을 버릴까요?")) return;
        state.plans = copyPlans(state.data.plans);
        state.plansDirty = false;
      }
      state.planEdit = false;
      state.openPlan = -1;
      renderDashboard();
    });
    body.querySelectorAll(".ps-maker-row").forEach(function (row) {
      row.addEventListener("toggle", function () {
        var i = Number(row.getAttribute("data-index"));
        if (row.open) state.openPlan = i;
        else if (state.openPlan === i) state.openPlan = -1;
      });
    });
    body.querySelectorAll("[data-field]").forEach(function (input) {
      var handler = function () {
        var row = input.closest(".ps-maker-row");
        var p = state.plans[Number(row.getAttribute("data-index"))];
        p[input.getAttribute("data-field")] = input.value;
        row.querySelector(".ps-maker-name").textContent = p.title || "(제목 없음)";
        row.querySelector("summary .ps-muted").textContent = planSummary(p);
        markDirty();
      };
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    });
    body.querySelectorAll("[data-move]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.closest(".ps-maker-row").getAttribute("data-index"));
        var j = i + Number(btn.getAttribute("data-move"));
        state.plans.splice(j, 0, state.plans.splice(i, 1)[0]);
        state.openPlan = j;
        state.plansDirty = true;
        renderPlanEditor();
      });
    });
    body.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.closest(".ps-maker-row").getAttribute("data-index"));
        if (!confirm((state.plans[i].title || "이 기획") + "을(를) 뺄까요? 저장해야 반영돼요.")) return;
        state.plans.splice(i, 1);
        state.openPlan = -1;
        state.plansDirty = true;
        renderPlanEditor();
      });
    });
    document.getElementById("addPlan").addEventListener("click", function () {
      state.plans.push(blankPlan());
      state.openPlan = state.plans.length - 1;
      state.plansDirty = true;
      renderPlanEditor();
      var input = body.querySelector('.ps-maker-row[open] [data-field="title"]');
      if (input) input.focus();
    });
    document.getElementById("savePlans").addEventListener("click", savePlans);
  }

  function savePlans() {
    var plans = state.plans
      .map(function (p) {
        var clean = {};
        PLAN_KEYS.forEach(function (k) { clean[k] = String(p[k] || "").trim(); });
        return clean;
      })
      .filter(function (p) {
        return PLAN_KEYS.some(function (k) { return k !== "format" && k !== "status" && p[k]; });
      });
    var noTitle = plans.find(function (p) { return !p.title; });
    if (noTitle) {
      PS.toast("제목안을 모두 넣어 주세요");
      return;
    }
    var badUrl = plans.find(function (p) { return p.url && !/^https?:\/\/\S+$/.test(p.url); });
    if (badUrl) {
      PS.toast("링크는 https:// 로 시작해야 해요: " + badUrl.title);
      return;
    }
    save("/plans", { plans: plans }, function (res) {
      state.data.plans = res.plans;
      state.plans = copyPlans(res.plans);
      state.plansDirty = false;
      state.planEdit = false;
      state.openPlan = -1;
      renderDashboard();
    });
  }

  // —— 불러오기 ——

  function show(data) {
    state.data = data;
    state.items = toItems(data);
    if (!state.candsDirty) state.cands = copyCandidates(data.candidates);
    if (!state.plansDirty) state.plans = copyPlans(data.plans);
    renderDashboard();
  }

  function load(force) {
    if (demo) {
      show(window.IT_SEARCH_DEMO);
      return;
    }
    if (!PS.getPassword()) {
      renderLogin();
      return;
    }
    if (force) {
      state.candsDirty = state.plansDirty = false;
      state.planEdit = false;
    }
    var cached = null;
    try {
      cached = JSON.parse(PS.read(PS.KEYS.cache) || "null");
    } catch (_) {}
    if (cached && !force) show(cached);
    else app.innerHTML = '<p class="loading">불러오는 중…</p>';

    PS.api("GET", "/data")
      .then(function (data) {
        PS.write(PS.KEYS.cache, JSON.stringify(data));
        if (isDirty()) {
          state.data = data;
          state.items = toItems(data);
          return;
        }
        show(data);
      })
      .catch(function (err) {
        PS.write(PS.KEYS.cache, "");
        if (err.unauthorized) {
          PS.clearPassword();
          renderLogin("비밀번호가 맞지 않아요.");
        } else renderError(err.message || String(err));
      });
  }

  window.addEventListener("beforeunload", function (e) {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  load();
})();
