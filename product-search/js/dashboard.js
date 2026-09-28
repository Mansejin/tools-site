(function () {
  "use strict";

  var PS = window.PS;
  var esc = PS.escapeHtml;
  var app = document.getElementById("app");
  var demo = new URLSearchParams(location.search).has("demo");

  var state = {
    data: null,
    items: [],
    category: "all",
    query: "",
    sort: "score",
    tab: location.hash === "#makers" ? "makers" : "products",
    makerStatus: "all",
    makerQuery: "",
  };

  var MAKER_STATUSES = ["후보", "문의함", "견적받음", "샘플", "계약", "보류", "제외"];

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

  function num(value) {
    if (value === "" || value == null) return null;
    var n = Number(value);
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

  // —— 연결 설정 ——

  function renderSetup(message) {
    var current = PS.read(PS.KEYS.endpoint) || PS.configEndpoint;
    app.innerHTML =
      '<section class="ps-panel">' +
      "<h2>연결 설정</h2>" +
      (message ? '<p class="ps-alert">' + esc(message) + "</p>" : "") +
      '<p class="ps-muted">구글 시트에 붙인 Apps Script 웹 앱 주소를 넣으면 결과를 불러와요. 이 브라우저에만 저장돼요.</p>' +
      '<form class="ps-form" id="setupForm">' +
      '<label class="ps-field"><span>웹 앱 URL</span>' +
      '<input type="url" name="endpoint" required placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(current) + '"></label>' +
      '<label class="ps-field"><span>열람 키 <em>(스크립트 속성 VIEW_KEY를 설정했다면)</em></span>' +
      '<input type="password" name="viewKey" autocomplete="off" value="' + esc(PS.read(PS.KEYS.viewKey)) + '"></label>' +
      '<div class="ps-actions">' +
      '<button type="submit" class="btn btn-primary">저장하고 불러오기</button>' +
      '<a class="btn btn-secondary" href="?demo">예시 화면 보기</a>' +
      "</div>" +
      "</form>" +
      '<details class="ps-help"><summary>처음이라면</summary>' +
      "<ol>" +
      "<li>구글 시트에 <b>후보</b> 탭을 만들고 keywords.csv를 가져와요 (파일 → 가져오기).</li>" +
      "<li>확장 프로그램 → Apps Script에 product-finder 저장소의 <code>apps-script/Code.gs</code>를 붙여넣어요.</li>" +
      "<li>프로젝트 설정 → 스크립트 속성에 WRITE_TOKEN, ADMIN_PASSWORD(선택: VIEW_KEY)를 넣어요.</li>" +
      "<li>배포 → 새 배포 → 웹 앱 (실행: 나, 액세스: 모든 사용자) 후 나온 URL을 여기에 넣어요.</li>" +
      "</ol></details>" +
      "</section>";

    document.getElementById("setupForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var url = form.endpoint.value.trim();
      if (!PS.isEndpoint(url)) {
        renderSetup("주소는 https://script.google.com/macros/s/…/exec 형태여야 해요.");
        return;
      }
      PS.write(PS.KEYS.endpoint, url === PS.configEndpoint ? "" : url);
      PS.write(PS.KEYS.viewKey, form.viewKey.value.trim());
      PS.write(PS.KEYS.cache, "");
      load();
    });
  }

  function renderKeyPrompt(message) {
    app.innerHTML =
      '<section class="ps-panel">' +
      "<h2>열람 키가 필요해요</h2>" +
      (message ? '<p class="ps-alert">' + esc(message) + "</p>" : "") +
      '<p class="ps-muted">Apps Script 스크립트 속성의 VIEW_KEY 값을 넣어 주세요. 이 브라우저에만 저장돼요.</p>' +
      '<form class="ps-form ps-form-inline" id="keyForm">' +
      '<input type="password" name="viewKey" required autocomplete="off" placeholder="열람 키">' +
      '<button type="submit" class="btn btn-primary">확인</button>' +
      "</form>" +
      '<p class="ps-muted ps-small"><button type="button" class="ps-link" id="changeEndpoint">연결 주소 바꾸기</button></p>' +
      "</section>";
    document.getElementById("keyForm").addEventListener("submit", function (e) {
      e.preventDefault();
      PS.write(PS.KEYS.viewKey, e.target.viewKey.value.trim());
      load();
    });
    document.getElementById("changeEndpoint").addEventListener("click", function () { renderSetup(); });
  }

  function renderError(message) {
    app.innerHTML =
      '<section class="ps-panel">' +
      "<h2>결과를 불러오지 못했어요</h2>" +
      '<p class="ps-alert">' + esc(message) + "</p>" +
      '<div class="ps-actions">' +
      '<button type="button" class="btn btn-primary" id="retry">다시 시도</button>' +
      '<button type="button" class="btn btn-secondary" id="changeEndpoint">연결 설정</button>' +
      "</div></section>";
    document.getElementById("retry").addEventListener("click", load);
    document.getElementById("changeEndpoint").addEventListener("click", function () { renderSetup(); });
  }

  // —— 결과 화면 ——

  function linkButtons(data) {
    var links = (data.links || []).slice();
    if (!links.length && data.sheetUrl) links.push({ label: "구글 시트 열기", url: data.sheetUrl });
    if (!links.length) return "";
    return (
      '<nav class="ps-links" aria-label="구글 시트 바로가기">' +
      links
        .map(function (l, i) {
          return (
            '<a class="btn ' + (i === 0 ? "btn-primary" : "btn-secondary") + ' ps-link-btn" href="' + esc(PS.safeUrl(l.url)) +
            '" target="_blank" rel="noopener noreferrer"' + (l.note ? ' title="' + esc(l.note) + '"' : "") + ">" +
            '<span class="ps-sheet-icon" aria-hidden="true"></span>' + esc(l.label) + "</a>"
          );
        })
        .join("") +
      "</nav>"
    );
  }

  function renderDashboard() {
    var data = state.data;
    var updated = data.updatedAt
      ? "마지막 업데이트 " + PS.formatDate(data.updatedAt) + (PS.timeAgo(data.updatedAt) ? " · " + PS.timeAgo(data.updatedAt) : "")
      : "아직 업데이트 기록이 없어요";

    var categories = {};
    state.items.forEach(function (item) {
      var c = String(item["분야"] || "").trim() || "미분류";
      categories[c] = (categories[c] || 0) + 1;
    });

    var makers = data.makers || [];
    app.innerHTML =
      (demo ? '<p class="preview-banner">예시 화면이에요. 숫자는 모두 지어낸 값이에요. <a href="./">실제 결과 보기</a></p>' : "") +
      linkButtons(data) +
      '<div class="ps-tabs" role="tablist">' +
      tabButton("products", "후보 제품", state.items.length) +
      tabButton("makers", "제조사", makers.length) +
      "</div>" +
      '<div id="tabBody"></div>';

    document.querySelectorAll(".ps-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.tab = btn.getAttribute("data-tab");
        history.replaceState(null, "", location.pathname + location.search + (state.tab === "makers" ? "#makers" : ""));
        renderDashboard();
      });
    });

    if (state.tab === "makers") renderMakers();
    else renderProducts(updated, categories);
  }

  function tabButton(id, label, count) {
    return (
      '<button type="button" role="tab" class="ps-tab' + (state.tab === id ? " active" : "") + '" data-tab="' + id + '"' +
      ' aria-selected="' + (state.tab === id) + '">' + esc(label) + ' <span class="ps-count">' + count + "</span></button>"
    );
  }

  function renderProducts(updated, categories) {
    document.getElementById("tabBody").innerHTML =
      '<div class="ps-summary">' +
      '<span><strong>' + state.items.length + "</strong>개 후보</span>" +
      "<span>" + esc(updated) + "</span>" +
      (demo ? "" : '<button type="button" class="ps-link" id="refresh">새로고침</button>') +
      "</div>" +
      (state.items.length
        ? '<div class="ps-controls">' +
          '<input type="search" id="query" class="ps-search" placeholder="키워드·메모 검색" value="' + esc(state.query) + '">' +
          '<select id="sort" class="ps-select" aria-label="정렬">' +
          SORTS.map(function (s) {
            return '<option value="' + s.id + '"' + (s.id === state.sort ? " selected" : "") + ">" + s.label + "</option>";
          }).join("") +
          "</select></div>" +
          '<div class="filters" id="filters">' +
          filterButton("all", "전체", state.items.length) +
          Object.keys(categories).map(function (c) { return filterButton(c, c, categories[c]); }).join("") +
          "</div>" +
          '<div class="ps-list" id="list"></div>'
        : '<p class="empty">아직 결과가 없어요. product-finder에서 <code>run.py</code>를 실행하면 여기에 올라와요.</p>');

    if (!state.items.length) {
      bindRefresh();
      return;
    }
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
      document.querySelectorAll("#filters .filter-btn").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      renderList();
    });
    bindRefresh();
    renderList();
  }

  // —— 제조사 ——

  function makerStatus(m) {
    return String(m.status || "").trim() || "후보";
  }

  function renderMakers() {
    var makers = state.data.makers || [];
    var counts = {};
    makers.forEach(function (m) {
      var s = makerStatus(m);
      counts[s] = (counts[s] || 0) + 1;
    });
    var statuses = MAKER_STATUSES.filter(function (s) { return counts[s]; })
      .concat(Object.keys(counts).filter(function (s) { return MAKER_STATUSES.indexOf(s) === -1; }));

    document.getElementById("tabBody").innerHTML =
      '<div class="ps-summary">' +
      '<span><strong>' + makers.length + "</strong>곳</span>" +
      "<span>" + (demo ? "" : '<a class="ps-link" href="admin/#makers">관리 페이지에서 편집</a>') + "</span>" +
      (demo ? "" : '<button type="button" class="ps-link" id="refresh">새로고침</button>') +
      "</div>" +
      (makers.length
        ? '<div class="ps-controls">' +
          '<input type="search" id="makerQuery" class="ps-search" placeholder="업체명·지역·제형·메모 검색" value="' + esc(state.makerQuery) + '">' +
          "</div>" +
          '<div class="filters" id="makerFilters">' +
          makerFilter("all", "전체", makers.length) +
          statuses.map(function (s) { return makerFilter(s, s, counts[s]); }).join("") +
          "</div>" +
          '<div class="ps-list" id="makerList"></div>'
        : '<p class="empty">등록된 제조사가 없어요. 관리 페이지에서 추가하거나 시트의 <b>제조사</b> 탭에 적으세요.</p>');

    bindRefresh();
    if (!makers.length) return;
    document.getElementById("makerQuery").addEventListener("input", function (e) {
      state.makerQuery = e.target.value;
      renderMakerList();
    });
    document.getElementById("makerFilters").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-status]");
      if (!btn) return;
      state.makerStatus = btn.getAttribute("data-status");
      document.querySelectorAll("#makerFilters .filter-btn").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      renderMakerList();
    });
    renderMakerList();
  }

  function makerFilter(id, label, count) {
    return (
      '<button type="button" class="filter-btn' + (state.makerStatus === id ? " active" : "") + '" data-status="' + esc(id) + '">' +
      esc(label) + ' <span class="ps-count">' + count + "</span></button>"
    );
  }

  function renderMakerList() {
    var q = state.makerQuery.trim().toLowerCase();
    var makers = (state.data.makers || []).filter(function (m) {
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
    var tel = phone.replace(/[^\d+]/g, "");
    var parts = [];
    if (m.contact) parts.push(esc(m.contact));
    if (phone) parts.push(tel ? '<a href="tel:' + esc(tel) + '">' + esc(phone) + "</a>" : esc(phone));
    var contact = parts.join(" · ");
    var url = /^https?:\/\//.test(m.url || "") ? m.url : "";

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
      (contact ? '<p class="ps-buyer"><span>담당</span>' + contact + "</p>" : "") +
      (m.memo ? '<p class="ps-memo">' + esc(m.memo) + "</p>" : "") +
      (url ? '<p class="ps-maker-link"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">웹사이트 ↗</a></p>' : "") +
      "</article>"
    );
  }

  function bindRefresh() {
    var refresh = document.getElementById("refresh");
    if (refresh) refresh.addEventListener("click", function () { load(true); });
  }

  function filterButton(id, label, count) {
    return (
      '<button type="button" class="filter-btn' + (state.category === id ? " active" : "") + '" data-category="' + esc(id) + '">' +
      esc(label) + ' <span class="ps-count">' + count + "</span></button>"
    );
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
    var list = document.getElementById("list");
    list.innerHTML = items.length
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

  function metric(label, valueHtml, hint) {
    if (!valueHtml) valueHtml = '<span class="ps-na">-</span>';
    return (
      '<div class="ps-metric"><dt>' + esc(label) + "</dt><dd>" + valueHtml +
      (hint ? '<small>' + esc(hint) + "</small>" : "") + "</dd></div>"
    );
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

  // —— 불러오기 ——

  function show(data) {
    state.data = data;
    state.items = toItems(data);
    renderDashboard();
  }

  function load(force) {
    if (demo) {
      show(window.PRODUCT_SEARCH_DEMO);
      return;
    }
    if (!PS.endpoint()) {
      renderSetup();
      return;
    }
    var cached = null;
    try {
      cached = JSON.parse(PS.read(PS.KEYS.cache) || "null");
    } catch (_) {}
    if (cached && cached.endpoint === PS.endpoint() && !force) {
      show(cached.data);
    } else {
      app.innerHTML = '<p class="loading">결과 불러오는 중…</p>';
    }
    PS.getJson({ action: "results", key: PS.read(PS.KEYS.viewKey) })
      .then(function (data) {
        PS.write(PS.KEYS.cache, JSON.stringify({ endpoint: PS.endpoint(), data: data }));
        show(data);
        if (force) PS.toast("최신 결과를 불러왔어요");
      })
      .catch(function (err) {
        PS.write(PS.KEYS.cache, "");
        if (err.unauthorized) renderKeyPrompt(PS.read(PS.KEYS.viewKey) ? "열람 키가 맞지 않아요." : "");
        else renderError(err.message || String(err));
      });
  }

  load();
})();
