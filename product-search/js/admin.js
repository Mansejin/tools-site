(function () {
  "use strict";

  var PS = window.PS;
  var esc = PS.escapeHtml;
  var app = document.getElementById("app");
  var state = { info: null, links: [], dirty: false, saving: false };

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
        renderManager();
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
      "</div></section>";

    renderLinks();
    document.getElementById("logout").addEventListener("click", function () {
      if (state.dirty && !confirm("저장하지 않은 변경이 있어요. 로그아웃할까요?")) return;
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
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  if (PS.endpoint() && getPassword()) login();
  else renderLogin();
})();
