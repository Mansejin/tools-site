(function () {
  "use strict";

  var PS = window.PS;
  var esc = PS.escapeHtml;
  var app = document.getElementById("app");
  var state = { info: null, links: [], dirty: false, saving: false, makers: [], makersDirty: false, makersSaving: false, openMaker: -1 };

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

  function blankMaker() {
    var m = {};
    MAKER_KEYS.forEach(function (k) { m[k] = ""; });
    m.type = "OEM";
    m.status = "후보";
    return m;
  }

  function isDirty() {
    return state.dirty || state.makersDirty;
  }

  function getPassword() {
    try {
      return sessionStorage.getItem(PS.KEYS.password) || PS.read(PS.KEYS.password);
    } catch (_) {
      return PS.read(PS.KEYS.password);
    }
  }

  function setPassword(value, remember) {
    try {
      sessionStorage.setItem(PS.KEYS.password, value);
    } catch (_) {}
    PS.write(PS.KEYS.password, remember ? value : "");
  }

  function clearPassword() {
    try {
      sessionStorage.removeItem(PS.KEYS.password);
    } catch (_) {}
    PS.write(PS.KEYS.password, "");
  }

  // —— 로그인 ——

  function renderLogin(message) {
    var needEndpoint = !PS.endpoint();
    app.innerHTML =
      '<section class="ps-panel ps-login">' +
      "<h2>관리자 로그인</h2>" +
      (message ? '<p class="ps-alert">' + esc(message) + "</p>" : "") +
      '<p class="ps-muted">Apps Script 스크립트 속성에 넣은 ADMIN_PASSWORD로 로그인해요.</p>' +
      '<form class="ps-form" id="loginForm">' +
      '<label class="ps-field"><span>웹 앱 URL</span>' +
      '<input type="url" name="endpoint" ' + (needEndpoint ? "required " : "") +
      'placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(PS.endpoint()) + '"></label>' +
      '<label class="ps-field"><span>관리자 비밀번호</span>' +
      '<input type="password" name="password" required autocomplete="current-password"></label>' +
      '<label class="ps-check"><input type="checkbox" name="remember"> 이 브라우저에서 기억하기</label>' +
      '<div class="ps-actions"><button type="submit" class="btn btn-primary">로그인</button></div>' +
      "</form></section>";

    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var url = form.endpoint.value.trim();
      if (!PS.isEndpoint(url)) {
        renderLogin("주소는 https://script.google.com/macros/s/…/exec 형태여야 해요.");
        return;
      }
      if (url !== PS.endpoint()) {
        PS.write(PS.KEYS.endpoint, url === PS.configEndpoint ? "" : url);
        PS.write(PS.KEYS.cache, "");
      }
      setPassword(form.password.value, form.remember.checked);
      login();
    });
  }

  function login() {
    app.innerHTML = '<p class="loading">확인 중…</p>';
    PS.postJson({ action: "login", password: getPassword() })
      .then(function (info) {
        state.info = info;
        state.links = (info.links || []).map(function (l) { return { label: l.label, url: l.url, note: l.note || "" }; });
        state.dirty = false;
        state.makers = (info.makers || []).map(function (m) {
          var copy = blankMaker();
          MAKER_KEYS.forEach(function (k) { copy[k] = m[k] || ""; });
          return copy;
        });
        state.makersDirty = false;
        state.openMaker = -1;
        renderManager();
        if (location.hash === "#makers") {
          var section = document.getElementById("makers");
          if (section) section.scrollIntoView();
        }
      })
      .catch(function (err) {
        clearPassword();
        renderLogin(err.unauthorized ? "비밀번호가 맞지 않아요." : err.message || String(err));
      });
  }

  // —— 링크 관리 ——

  function renderManager() {
    var info = state.info;
    app.innerHTML =
      '<section class="ps-panel">' +
      '<div class="ps-panel-head"><h2>연결 상태</h2>' +
      '<button type="button" class="ps-link" id="logout">로그아웃</button></div>' +
      '<dl class="ps-status">' +
      "<div><dt>결과</dt><dd>" + (info.resultCount || 0) + "개 후보</dd></div>" +
      "<div><dt>마지막 업데이트</dt><dd>" + esc(info.updatedAt ? PS.formatDate(info.updatedAt) : "없음") + "</dd></div>" +
      "<div><dt>열람 키</dt><dd>" + (info.viewKeyRequired ? "사용 중" : '<span class="ps-warn">안 씀 · URL을 알면 누구나 결과 조회</span>') + "</dd></div>" +
      "<div><dt>연결된 시트</dt><dd>" + (info.sheetUrl
        ? '<a href="' + esc(PS.safeUrl(info.sheetUrl)) + '" target="_blank" rel="noopener noreferrer">시트 열기</a>'
        : "-") + "</dd></div>" +
      "</dl></section>" +
      '<section class="ps-panel">' +
      '<div class="ps-panel-head"><h2>시트 바로가기</h2>' +
      '<span class="ps-muted ps-small">대시보드 위쪽 버튼으로 보여요. 첫 번째가 강조돼요.</span></div>' +
      '<div id="linkList" class="ps-link-list"></div>' +
      '<div class="ps-actions">' +
      '<button type="button" class="btn btn-secondary" id="addLink">+ 링크 추가</button>' +
      (info.sheetUrl ? '<button type="button" class="btn btn-secondary" id="addSheet">연결된 시트 추가</button>' : "") +
      '<span class="ps-spacer"></span>' +
      '<span class="ps-muted ps-small" id="dirtyNote"></span>' +
      '<button type="button" class="btn btn-primary" id="save">저장</button>' +
      "</div></section>" +
      '<section class="ps-panel" id="makers">' +
      '<div class="ps-panel-head"><h2>제조사 (OEM·ODM)</h2>' +
      '<span class="ps-muted ps-small">시트의 <b>제조사</b> 탭과 같아요. 시트에서 직접 고쳐도 돼요.</span></div>' +
      '<div id="makerList" class="ps-link-list"></div>' +
      '<div class="ps-actions">' +
      '<button type="button" class="btn btn-secondary" id="addMaker">+ 제조사 추가</button>' +
      '<span class="ps-spacer"></span>' +
      '<span class="ps-muted ps-small" id="makersDirtyNote"></span>' +
      '<button type="button" class="btn btn-primary" id="saveMakers">저장</button>' +
      "</div></section>";

    renderLinks();
    renderMakers();
    if (state.dirty) markDirty();
    if (state.makersDirty) markMakersDirty();
    document.getElementById("addMaker").addEventListener("click", function () {
      state.makers.push(blankMaker());
      state.openMaker = state.makers.length - 1;
      markMakersDirty();
      renderMakers();
      var input = document.querySelector('#makerList .ps-maker-row[open] [data-field="name"]');
      if (input) input.focus();
    });
    document.getElementById("saveMakers").addEventListener("click", saveMakers);
    document.getElementById("logout").addEventListener("click", function () {
      if (isDirty() && !confirm("저장하지 않은 변경이 있어요. 로그아웃할까요?")) return;
      clearPassword();
      renderLogin();
    });
    document.getElementById("addLink").addEventListener("click", function () {
      state.links.push({ label: "", url: "", note: "" });
      markDirty();
      renderLinks();
      var inputs = document.querySelectorAll('#linkList [data-field="label"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
    var addSheet = document.getElementById("addSheet");
    if (addSheet) {
      addSheet.addEventListener("click", function () {
        state.links.push({ label: "제품 찾기 시트", url: info.sheetUrl, note: "" });
        markDirty();
        renderLinks();
      });
    }
    document.getElementById("save").addEventListener("click", save);
  }

  function renderLinks() {
    var list = document.getElementById("linkList");
    if (!state.links.length) {
      list.innerHTML = '<p class="empty">등록된 링크가 없어요. 링크를 추가하고 저장하세요.</p>';
      return;
    }
    list.innerHTML = state.links
      .map(function (l, i) {
        return (
          '<div class="ps-link-row" data-index="' + i + '">' +
          '<div class="ps-link-fields">' +
          '<input type="text" data-field="label" placeholder="이름 (예: 제품 찾기 시트)" maxlength="100" value="' + esc(l.label) + '">' +
          '<input type="url" data-field="url" placeholder="https://docs.google.com/spreadsheets/d/…" value="' + esc(l.url) + '">' +
          '<input type="text" data-field="note" placeholder="메모 (선택)" maxlength="200" value="' + esc(l.note) + '">' +
          "</div>" +
          '<div class="ps-link-tools">' +
          '<button type="button" class="ps-icon-btn" data-move="-1" aria-label="위로"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
          '<button type="button" class="ps-icon-btn" data-move="1" aria-label="아래로"' + (i === state.links.length - 1 ? " disabled" : "") + ">↓</button>" +
          (/^https:\/\//.test(l.url) ? '<a class="ps-icon-btn" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer" aria-label="열기">↗</a>' : "") +
          '<button type="button" class="ps-icon-btn ps-danger" data-remove aria-label="삭제">×</button>' +
          "</div></div>"
        );
      })
      .join("");

    list.querySelectorAll("input").forEach(function (input) {
      input.addEventListener("input", function () {
        var i = Number(input.closest(".ps-link-row").getAttribute("data-index"));
        state.links[i][input.getAttribute("data-field")] = input.value;
        markDirty();
      });
    });
    list.querySelectorAll("[data-move]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.closest(".ps-link-row").getAttribute("data-index"));
        var j = i + Number(btn.getAttribute("data-move"));
        var moved = state.links.splice(i, 1)[0];
        state.links.splice(j, 0, moved);
        markDirty();
        renderLinks();
      });
    });
    list.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.closest(".ps-link-row").getAttribute("data-index"));
        state.links.splice(i, 1);
        markDirty();
        renderLinks();
      });
    });
  }

  // —— 제조사 관리 ——

  function makerInput(m, f) {
    var key = f[0];
    var input;
    if (key === "status" || key === "type") {
      var options = key === "status" ? MAKER_STATUSES : MAKER_TYPES;
      if (m[key] && options.indexOf(m[key]) === -1) options = options.concat([m[key]]);
      input =
        '<select data-field="' + key + '" class="ps-select">' +
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

  function renderMakers() {
    var list = document.getElementById("makerList");
    if (!state.makers.length) {
      list.innerHTML = '<p class="empty">등록된 제조사가 없어요. 제조사를 추가하고 저장하세요.</p>';
      return;
    }
    list.innerHTML = state.makers
      .map(function (m, i) {
        return (
          '<details class="ps-maker-row" data-index="' + i + '"' + (state.openMaker === i ? " open" : "") + ">" +
          '<summary><span class="ps-maker-name">' + esc(m.name || "(이름 없음)") + "</span>" +
          '<span class="ps-muted ps-small">' + esc([m.status, m.form, m.region].filter(Boolean).join(" · ")) + "</span></summary>" +
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
      })
      .join("");

    list.querySelectorAll(".ps-maker-row").forEach(function (row) {
      row.addEventListener("toggle", function () {
        var i = Number(row.getAttribute("data-index"));
        if (row.open) state.openMaker = i;
        else if (state.openMaker === i) state.openMaker = -1;
      });
    });
    list.querySelectorAll("[data-field]").forEach(function (input) {
      var handler = function () {
        var row = input.closest(".ps-maker-row");
        var i = Number(row.getAttribute("data-index"));
        var key = input.getAttribute("data-field");
        state.makers[i][key] = input.value;
        markMakersDirty();
        if (key === "name" || key === "status" || key === "form" || key === "region") {
          var m = state.makers[i];
          row.querySelector(".ps-maker-name").textContent = m.name || "(이름 없음)";
          row.querySelector("summary .ps-muted").textContent = [m.status, m.form, m.region].filter(Boolean).join(" · ");
        }
      };
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    });
    list.querySelectorAll("[data-move]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.closest(".ps-maker-row").getAttribute("data-index"));
        var j = i + Number(btn.getAttribute("data-move"));
        var moved = state.makers.splice(i, 1)[0];
        state.makers.splice(j, 0, moved);
        state.openMaker = j;
        markMakersDirty();
        renderMakers();
      });
    });
    list.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.closest(".ps-maker-row").getAttribute("data-index"));
        var name = state.makers[i].name || "이 제조사";
        if (!confirm(name + "를 목록에서 뺄까요? 저장해야 반영돼요.")) return;
        state.makers.splice(i, 1);
        state.openMaker = -1;
        markMakersDirty();
        renderMakers();
      });
    });
  }

  function markMakersDirty() {
    state.makersDirty = true;
    var note = document.getElementById("makersDirtyNote");
    if (note) note.textContent = "저장 안 됨";
  }

  function saveMakers() {
    if (state.makersSaving) return;
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
    state.makersSaving = true;
    var btn = document.getElementById("saveMakers");
    btn.disabled = true;
    btn.textContent = "저장 중…";
    PS.postJson({ action: "saveMakers", password: getPassword(), makers: makers })
      .then(function (res) {
        state.makers = (res.makers || makers).map(function (m) {
          var copy = blankMaker();
          MAKER_KEYS.forEach(function (k) { copy[k] = m[k] || ""; });
          return copy;
        });
        state.makersDirty = false;
        state.openMaker = -1;
        PS.write(PS.KEYS.cache, "");
        document.getElementById("makersDirtyNote").textContent = "";
        renderMakers();
        PS.toast("제조사를 저장했어요");
      })
      .catch(function (err) {
        if (err.unauthorized) {
          clearPassword();
          renderLogin("비밀번호가 바뀌었거나 맞지 않아요. 다시 로그인하세요.");
          return;
        }
        PS.toast(err.message || "저장하지 못했어요");
      })
      .then(function () {
        state.makersSaving = false;
        var b = document.getElementById("saveMakers");
        if (b) {
          b.disabled = false;
          b.textContent = "저장";
        }
      });
  }

  function markDirty() {
    state.dirty = true;
    var note = document.getElementById("dirtyNote");
    if (note) note.textContent = "저장 안 됨";
  }

  function save() {
    if (state.saving) return;
    var links = state.links
      .map(function (l) { return { label: l.label.trim(), url: l.url.trim(), note: l.note.trim() }; })
      .filter(function (l) { return l.label || l.url; });
    var bad = links.find(function (l) { return !l.label || !/^https:\/\/\S+$/.test(l.url); });
    if (bad) {
      PS.toast("이름과 https:// 주소를 모두 넣어 주세요");
      return;
    }
    state.saving = true;
    var btn = document.getElementById("save");
    btn.disabled = true;
    btn.textContent = "저장 중…";
    PS.postJson({ action: "saveLinks", password: getPassword(), links: links })
      .then(function (res) {
        state.links = res.links || links;
        state.info.links = state.links;
        state.dirty = false;
        PS.write(PS.KEYS.cache, "");
        renderManager();
        PS.toast("저장했어요");
      })
      .catch(function (err) {
        if (err.unauthorized) {
          clearPassword();
          renderLogin("비밀번호가 바뀌었거나 맞지 않아요. 다시 로그인하세요.");
          return;
        }
        PS.toast(err.message || "저장하지 못했어요");
        btn.disabled = false;
        btn.textContent = "저장";
      })
      .then(function () { state.saving = false; });
  }

  window.addEventListener("beforeunload", function (e) {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  if (PS.endpoint() && getPassword()) login();
  else renderLogin();
})();
