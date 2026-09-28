(function () {
  "use strict";

  var PS = window.PS;
  var esc = PS.escapeHtml;
  var app = document.getElementById("app");
  var demo = new URLSearchParams(location.search).has("demo");

  var TABS = [
    { id: "products", label: "순위" },
    { id: "candidates", label: "후보 입력" },
    { id: "makers", label: "제조사" },
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
    makers: [],
    makersDirty: false,
    makerEdit: false,
    makerStatus: "all",
    makerQuery: "",
    openMaker: -1,
    saving: false,
  };

  var SORTS = [
    { id: "score", label: "총점 높은순" },
    { id: "volume", label: "월검색량 많은순" },
    { id: "trend", label: "검색추세 좋은순" },
    { id: "reviews", label: "쿠팡 리뷰 적은순" },
    { id: "margin", label: "순이익률 높은순" },
  ];

  var SCORE_FIELDS = [
    ["수요점수", "수요"],
    ["광고경쟁점수", "광고 경쟁"],
    ["검색추세점수", "검색 추세"],
    ["쇼핑추세점수", "쇼핑 추세"],
    ["쿠팡경쟁점수", "쿠팡 경쟁"],
    ["가격점수", "가격대"],
    ["수익점수", "수익성"],
    ["재구매성", "재구매성"],
    ["규제", "규제"],
    ["보관·물류", "보관·물류"],
    ["차별화", "차별화"],
  ];

  var CANDIDATE_FIELDS = ["키워드", "분야", "메모", "쿠팡리뷰수", "예상판매가", "예상원가", "재구매성", "규제", "물류", "차별화", "쇼핑카테고리"];
  var CATEGORIES = ["일반식품", "건강기능식품", "반려동물"];
  var CANDIDATE_COLUMNS = [
    { key: "키워드", label: "키워드", kind: "text", cls: "col-keyword" },
    { key: "분야", label: "분야", kind: "category" },
    { key: "쿠팡리뷰수", label: "쿠팡 리뷰", kind: "number", hint: "1페이지 평균" },
    { key: "예상판매가", label: "판매가", kind: "number", hint: "원" },
    { key: "예상원가", label: "원가", kind: "number", hint: "원" },
    { key: "재구매성", label: "재구매", kind: "score" },
    { key: "규제", label: "규제", kind: "score" },
    { key: "물류", label: "물류", kind: "score" },
    { key: "차별화", label: "차별화", kind: "score" },
    { key: "메모", label: "메모", kind: "text", cls: "col-memo" },
  ];

  var MAKER_STATUSES = ["후보", "문의함", "견적받음", "샘플", "계약", "보류", "제외"];
  var MAKER_TYPES = ["OEM", "ODM", "OEM·ODM"];
  var MAKER_INPUTS = [
    ["name", "업체명", "(주)예시식품"],
    ["type", "유형", ""],
    ["status", "상태", ""],
    ["field", "분야", "건강기능식품 / 일반식품 / 반려동물"],
    ["form", "제형", "액상 스틱, 정제, 분말…"],
    ["region", "지역", "경기 포천"],
    ["cert", "인증", "HACCP, 건기식 GMP"],
    ["moq", "최소주문", "예: 3,000포"],
    ["price", "단가", "예: 포당 350원"],
    ["products", "관련제품", "젖산마그네슘"],
    ["contact", "담당자", "이름·직함"],
    ["phone", "연락처", "전화·이메일"],
    ["url", "웹사이트", "https://"],
    ["lastContact", "최근연락", "2026-09-29"],
  ];
  var MAKER_KEYS = MAKER_INPUTS.map(function (f) { return f[0]; }).concat(["memo"]);

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

  function fmtRatio(value) {
    var n = num(value);
    return n == null ? "" : n.toFixed(2) + "배";
  }

  function fmtPercent(value) {
    var n = num(value);
    return n == null ? "" : (n * 100).toFixed(1) + "%";
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

  function blankMaker() {
    var m = {};
    MAKER_KEYS.forEach(function (k) { m[k] = ""; });
    m.type = "OEM";
    m.status = "후보";
    return m;
  }

  function copyMakers(list) {
    return (list || []).map(function (m) {
      var copy = blankMaker();
      MAKER_KEYS.forEach(function (k) { copy[k] = m[k] == null ? "" : String(m[k]); });
      return copy;
    });
  }

  function isDirty() {
    return state.candsDirty || state.makersDirty;
  }

  // —— 로그인 ——

  function renderLogin(message) {
    app.innerHTML =
      '<section class="ps-panel ps-login">' +
      "<h2>로그인</h2>" +
      (message ? '<p class="ps-alert">' + esc(message) + "</p>" : "") +
      '<p class="ps-muted">product-finder <code>.env</code>의 <code>PS_ADMIN_PASSWORD</code> 값이에요.</p>' +
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

  function renderDashboard() {
    var counts = { products: state.items.length, candidates: state.cands.length, makers: state.makers.length };
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
      btn.addEventListener("click", function () {
        state.tab = btn.getAttribute("data-tab");
        history.replaceState(null, "", location.pathname + location.search + (state.tab === "products" ? "" : "#" + state.tab));
        renderDashboard();
      });
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
        state.candsDirty = state.makersDirty = false;
        PS.clearPassword();
        renderLogin();
      });
    }

    if (state.tab === "candidates") renderCandidates();
    else if (state.tab === "makers") renderMakers();
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
    renderList();
  }

  function sortValue(item) {
    switch (state.sort) {
      case "volume": return num(item["월검색량"]);
      case "trend": return num(item["검색추세점수"]) == null ? null : num(item["검색추세점수"]) * 100 + (num(item["검색 전년대비(배)"]) || 0);
      case "reviews": return num(item["쿠팡 리뷰"]) == null ? null : -num(item["쿠팡 리뷰"]);
      case "margin": return num(item["순이익률"]);
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
    var reviews = fmtInt(item["쿠팡 리뷰"]);
    var blog = fmtInt(item["블로그 글"]);
    var blogMonthly = fmtInt(item["월 신규 블로그글"]);
    var peak = num(item["검색 최고점/최근(배)"]);
    var memo = String(item["메모"] || "").trim();

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

    var money = [];
    if (fmtInt(item["예상 판매가"])) money.push("판매가 " + fmtInt(item["예상 판매가"]) + "원");
    if (fmtInt(item["예상 원가"])) money.push("원가 " + fmtInt(item["예상 원가"]) + "원");
    if (fmtInt(item["개당 순이익"])) money.push("개당 순이익 " + fmtInt(item["개당 순이익"]) + "원");

    return (
      '<article class="tool-card ps-card">' +
      '<div class="ps-card-head">' +
      '<span class="ps-rank">' + esc(item["순위"] || "") + "</span>" +
      '<div class="ps-card-title">' +
      "<h2>" + esc(item["키워드"]) + "</h2>" +
      '<div class="ps-card-sub">' +
      (item["분야"] ? '<span class="tag">' + esc(item["분야"]) + "</span>" : "") +
      (item["광고경쟁"] ? '<span class="ps-muted">광고 경쟁 ' + esc(item["광고경쟁"]) + "</span>" : "") +
      (peak != null && peak > 3 ? '<span class="status status-beta">반짝 유행 주의</span>' : "") +
      "</div></div>" +
      '<div class="ps-total' + scoreTone(total) + '"><strong>' + (total == null ? "-" : esc(total)) + "</strong><span>/100</span></div>" +
      "</div>" +
      '<div class="ps-bar" aria-hidden="true"><span class="' + scoreTone(total).trim() + '" style="width:' + Math.max(0, Math.min(100, total || 0)) + '%"></span></div>' +
      '<dl class="ps-metrics">' +
      metric("월검색량", fmtInt(item["월검색량"])) +
      metric("검색 추세", trendText(item["검색 전년대비(배)"], item["검색추세점수"]), "전년 대비") +
      metric("쇼핑 추세", trendText(item["쇼핑클릭 전년대비(배)"], item["쇼핑추세점수"]), "클릭 전년 대비") +
      metric("블로그 글", blog, blogMonthly ? "월 " + blogMonthly + "개 신규" : "") +
      metric("쿠팡 리뷰", reviews, reviews ? "1페이지 평균" : "미조사") +
      metric("순이익률", fmtPercent(item["순이익률"])) +
      "</dl>" +
      (item["주 구매층"] ? '<p class="ps-buyer"><span>주 구매층</span>' + esc(item["주 구매층"]) + "</p>" : "") +
      (memo ? '<p class="ps-memo">' + esc(memo) + "</p>" : "") +
      '<details class="ps-details"><summary>세부 점수' + (money.length ? " · 수익 계산" : "") + "</summary>" +
      '<ul class="ps-scores">' + scores + "</ul>" +
      (money.length ? '<p class="ps-money">' + esc(money.join(" · ")) + "</p>" : "") +
      "</details>" +
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
      '<span class="ps-muted">1~5점은 5가 좋은 쪽이에요 (규제 5 = 규제 적음, 물류 5 = 보관 쉬움). 비우면 3점으로 계산해요.</span>' +
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
      ["쿠팡리뷰수", "예상판매가", "예상원가"].forEach(function (k) { row[k] = row[k].replace(/[^\d.]/g, ""); });
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

  // —— 제조사 ——

  function makerStatus(m) {
    return String(m.status || "").trim() || "후보";
  }

  function renderMakers() {
    if (state.makerEdit) {
      renderMakerEditor();
      return;
    }
    var makers = state.makers;
    var counts = {};
    makers.forEach(function (m) {
      var s = makerStatus(m);
      counts[s] = (counts[s] || 0) + 1;
    });
    var statuses = MAKER_STATUSES.filter(function (s) { return counts[s]; })
      .concat(Object.keys(counts).filter(function (s) { return MAKER_STATUSES.indexOf(s) === -1; }));

    document.getElementById("tabBody").innerHTML =
      '<div class="ps-summary">' +
      "<span><strong>" + makers.length + "</strong>곳</span>" +
      '<button type="button" class="btn btn-secondary ps-summary-btn" id="editMakers">편집</button>' +
      "</div>" +
      (makers.length
        ? '<div class="ps-controls">' +
          '<input type="search" id="makerQuery" class="ps-search" placeholder="업체명·지역·제형·메모 검색" value="' + esc(state.makerQuery) + '">' +
          "</div>" +
          '<div class="filters" id="makerFilters">' +
          filterButton("status", "all", "전체", makers.length, state.makerStatus) +
          statuses.map(function (s) { return filterButton("status", s, s, counts[s], state.makerStatus); }).join("") +
          "</div>" +
          '<div class="ps-list" id="makerList"></div>'
        : '<p class="empty">등록된 제조사가 없어요. <b>편집</b>을 눌러 추가하세요.</p>');

    document.getElementById("editMakers").addEventListener("click", function () {
      state.makerEdit = true;
      renderMakers();
    });
    if (!makers.length) return;
    document.getElementById("makerQuery").addEventListener("input", function (e) {
      state.makerQuery = e.target.value;
      renderMakerList();
    });
    document.getElementById("makerFilters").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-status]");
      if (!btn) return;
      state.makerStatus = btn.getAttribute("data-status");
      document.querySelectorAll("#makerFilters .filter-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
      renderMakerList();
    });
    renderMakerList();
  }

  function renderMakerList() {
    var q = state.makerQuery.trim().toLowerCase();
    var makers = state.makers.filter(function (m) {
      if (state.makerStatus !== "all" && makerStatus(m) !== state.makerStatus) return false;
      if (!q) return true;
      return [m.name, m.type, m.field, m.form, m.region, m.cert, m.products, m.memo, m.contact].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    document.getElementById("makerList").innerHTML = makers.length
      ? makers.map(makerCard).join("")
      : '<p class="empty">조건에 맞는 제조사가 없어요.</p>';
  }

  function statusTone(status) {
    if (status === "계약") return " is-done";
    if (status === "견적받음" || status === "샘플") return " is-progress";
    if (status === "문의함") return " is-asked";
    if (status === "보류" || status === "제외") return " is-off";
    return "";
  }

  function makerCard(m) {
    var status = makerStatus(m);
    var phone = String(m.phone || "").trim();
    var tel = /^[\d\s()+-]+$/.test(phone) ? phone.replace(/[^\d+]/g, "") : "";
    var parts = [];
    if (m.contact) parts.push(esc(m.contact));
    if (phone) parts.push(tel ? '<a href="tel:' + esc(tel) + '">' + esc(phone) + "</a>" : esc(phone));
    var url = PS.safeUrl(m.url);

    return (
      '<article class="tool-card ps-card ps-maker">' +
      '<div class="ps-card-head">' +
      '<div class="ps-card-title">' +
      "<h2>" + esc(m.name) + "</h2>" +
      '<div class="ps-card-sub">' +
      (m.type ? '<span class="tag">' + esc(m.type) + "</span>" : "") +
      (m.field ? '<span class="tag">' + esc(m.field) + "</span>" : "") +
      (m.region ? '<span class="ps-muted">' + esc(m.region) + "</span>" : "") +
      "</div></div>" +
      '<span class="ps-status-pill' + statusTone(status) + '">' + esc(status) + "</span>" +
      "</div>" +
      '<dl class="ps-metrics ps-maker-metrics">' +
      metric("제형", esc(m.form)) +
      metric("인증", esc(m.cert)) +
      metric("최소주문", esc(m.moq)) +
      metric("단가", esc(m.price)) +
      metric("관련 제품", esc(m.products)) +
      metric("최근 연락", esc(m.lastContact)) +
      "</dl>" +
      (parts.length ? '<p class="ps-buyer"><span>담당</span>' + parts.join(" · ") + "</p>" : "") +
      (m.memo ? '<p class="ps-memo">' + esc(m.memo) + "</p>" : "") +
      (url !== "#" ? '<p class="ps-maker-link"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">웹사이트 ↗</a></p>' : "") +
      "</article>"
    );
  }

  function makerInput(m, f) {
    var key = f[0];
    var input;
    if (key === "status" || key === "type") {
      var options = key === "status" ? MAKER_STATUSES : MAKER_TYPES;
      if (m[key] && options.indexOf(m[key]) === -1) options = options.concat([m[key]]);
      input =
        '<select data-field="' + key + '">' +
        options.map(function (o) {
          return '<option value="' + esc(o) + '"' + (o === m[key] ? " selected" : "") + ">" + esc(o) + "</option>";
        }).join("") +
        "</select>";
    } else {
      input =
        '<input type="' + (key === "url" ? "url" : "text") + '" data-field="' + key + '" maxlength="300"' +
        ' placeholder="' + esc(f[2]) + '" value="' + esc(m[key]) + '">';
    }
    return '<label class="ps-field"><span>' + esc(f[1]) + "</span>" + input + "</label>";
  }

  function makerSummary(m) {
    return [m.status, m.form, m.region].filter(Boolean).join(" · ");
  }

  function renderMakerEditor() {
    var body = document.getElementById("tabBody");
    body.innerHTML =
      '<div class="ps-summary">' +
      "<span><strong>" + state.makers.length + "</strong>곳 편집 중</span>" +
      '<button type="button" class="ps-link ps-summary-btn" id="doneMakers">' + (state.makersDirty ? "취소" : "보기로 돌아가기") + "</button>" +
      "</div>" +
      '<div id="makerEditList" class="ps-link-list">' +
      (state.makers.length
        ? state.makers.map(function (m, i) {
            return (
              '<details class="ps-maker-row" data-index="' + i + '"' + (state.openMaker === i ? " open" : "") + ">" +
              '<summary><span class="ps-maker-name">' + esc(m.name || "(이름 없음)") + "</span>" +
              '<span class="ps-muted ps-small">' + esc(makerSummary(m)) + "</span></summary>" +
              '<div class="ps-maker-fields">' +
              MAKER_INPUTS.map(function (f) { return makerInput(m, f); }).join("") +
              '<label class="ps-field ps-field-wide"><span>메모</span>' +
              '<textarea data-field="memo" rows="3" maxlength="1000" placeholder="견적 조건, 통화 내용, 확인할 점">' + esc(m.memo) + "</textarea></label>" +
              "</div>" +
              '<div class="ps-actions">' +
              '<button type="button" class="ps-icon-btn" data-move="-1" aria-label="위로"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
              '<button type="button" class="ps-icon-btn" data-move="1" aria-label="아래로"' + (i === state.makers.length - 1 ? " disabled" : "") + ">↓</button>" +
              '<span class="ps-spacer"></span>' +
              '<button type="button" class="btn btn-secondary ps-danger" data-remove>삭제</button>' +
              "</div></details>"
            );
          }).join("")
        : '<p class="empty">제조사를 추가하세요.</p>') +
      "</div>" +
      '<div class="ps-actions ps-sticky-actions">' +
      '<button type="button" class="btn btn-secondary" id="addMaker">+ 제조사 추가</button>' +
      '<span class="ps-spacer"></span>' +
      '<span class="ps-muted ps-small" id="makersNote">' + (state.makersDirty ? "저장 안 됨" : "") + "</span>" +
      '<button type="button" class="btn btn-primary" data-save id="saveMakers">저장</button>' +
      "</div>";

    var markDirty = function () {
      state.makersDirty = true;
      document.getElementById("makersNote").textContent = "저장 안 됨";
      document.getElementById("doneMakers").textContent = "취소";
    };

    document.getElementById("doneMakers").addEventListener("click", function () {
      if (state.makersDirty) {
        if (!confirm("저장하지 않은 변경을 버릴까요?")) return;
        state.makers = copyMakers(state.data.makers);
        state.makersDirty = false;
      }
      state.makerEdit = false;
      state.openMaker = -1;
      renderDashboard();
    });
    body.querySelectorAll(".ps-maker-row").forEach(function (row) {
      row.addEventListener("toggle", function () {
        var i = Number(row.getAttribute("data-index"));
        if (row.open) state.openMaker = i;
        else if (state.openMaker === i) state.openMaker = -1;
      });
    });
    body.querySelectorAll("[data-field]").forEach(function (input) {
      var handler = function () {
        var row = input.closest(".ps-maker-row");
        var m = state.makers[Number(row.getAttribute("data-index"))];
        m[input.getAttribute("data-field")] = input.value;
        row.querySelector(".ps-maker-name").textContent = m.name || "(이름 없음)";
        row.querySelector("summary .ps-muted").textContent = makerSummary(m);
        markDirty();
      };
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    });
    body.querySelectorAll("[data-move]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.closest(".ps-maker-row").getAttribute("data-index"));
        var j = i + Number(btn.getAttribute("data-move"));
        state.makers.splice(j, 0, state.makers.splice(i, 1)[0]);
        state.openMaker = j;
        state.makersDirty = true;
        renderMakerEditor();
      });
    });
    body.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.closest(".ps-maker-row").getAttribute("data-index"));
        if (!confirm((state.makers[i].name || "이 제조사") + "를 뺄까요? 저장해야 반영돼요.")) return;
        state.makers.splice(i, 1);
        state.openMaker = -1;
        state.makersDirty = true;
        renderMakerEditor();
      });
    });
    document.getElementById("addMaker").addEventListener("click", function () {
      state.makers.push(blankMaker());
      state.openMaker = state.makers.length - 1;
      state.makersDirty = true;
      renderMakerEditor();
      var input = body.querySelector('.ps-maker-row[open] [data-field="name"]');
      if (input) input.focus();
    });
    document.getElementById("saveMakers").addEventListener("click", saveMakers);
  }

  function saveMakers() {
    var makers = state.makers
      .map(function (m) {
        var clean = {};
        MAKER_KEYS.forEach(function (k) { clean[k] = String(m[k] || "").trim(); });
        return clean;
      })
      .filter(function (m) {
        return MAKER_KEYS.some(function (k) { return k !== "type" && k !== "status" && m[k]; });
      });
    var noName = makers.find(function (m) { return !m.name; });
    if (noName) {
      PS.toast("업체명을 모두 넣어 주세요");
      return;
    }
    var badUrl = makers.find(function (m) { return m.url && !/^https?:\/\/\S+$/.test(m.url); });
    if (badUrl) {
      PS.toast("웹사이트는 https:// 로 시작해야 해요: " + badUrl.name);
      return;
    }
    save("/makers", { makers: makers }, function (res) {
      state.data.makers = res.makers;
      state.makers = copyMakers(res.makers);
      state.makersDirty = false;
      state.makerEdit = false;
      state.openMaker = -1;
      renderDashboard();
    });
  }

  // —— 불러오기 ——

  function show(data) {
    state.data = data;
    state.items = toItems(data);
    if (!state.candsDirty) state.cands = copyCandidates(data.candidates);
    if (!state.makersDirty) state.makers = copyMakers(data.makers);
    renderDashboard();
  }

  function load(force) {
    if (demo) {
      show(window.PRODUCT_SEARCH_DEMO);
      return;
    }
    if (!PS.getPassword()) {
      renderLogin();
      return;
    }
    if (force) {
      state.candsDirty = state.makersDirty = false;
      state.makerEdit = false;
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
