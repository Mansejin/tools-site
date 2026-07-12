(function () {
  "use strict";

  var responses = [];

  function getEndpoint() {
    return document.body.getAttribute("data-survey-endpoint") || "";
  }

  function getAdminSecret() {
    return sessionStorage.getItem("pr-admin-secret") || "";
  }

  function setAdminSecret(val) {
    sessionStorage.setItem("pr-admin-secret", val);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var LABELS = {
    overall: "전체 만족도",
    clarity: "설명 이해도",
    pace: "진행 속도",
    practice: "실습 분량",
    online: "온라인 환경",
    best_week: "도움된 주차",
    recommend: "추천 의향",
    improve: "개선점",
    comment: "자유 의견",
  };

  function renderLogin() {
    document.getElementById("surveyAdminApp").innerHTML =
      '<div class="admin-login card">' +
      "<h1>만족도 조사 · 관리</h1>" +
      "<p>관리자 비밀번호를 입력하세요.</p>" +
      '<form id="loginForm">' +
      '<input type="password" id="adminSecretInput" placeholder="관리자 비밀번호" required>' +
      '<button type="submit" class="btn btn-primary">로그인</button>' +
      '<p class="admin-error" id="loginError" hidden></p>' +
      "</form>" +
      '<p class="admin-hint"><a href="../">← 설문 페이지</a> · <a href="../../admin/">신청 관리</a></p>' +
      "</div>";

    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      setAdminSecret(document.getElementById("adminSecretInput").value.trim());
      loadResponses();
    });
  }

  function renderStats(stats) {
    stats = stats || {};
    return (
      '<div class="admin-stats">' +
      '<div class="admin-stat"><span class="admin-stat-num">' +
      (stats.total || 0) +
      '</span><span class="admin-stat-label">응답 수</span></div>' +
      '<div class="admin-stat admin-stat--paid"><span class="admin-stat-num">' +
      (stats.avg_overall || "-") +
      '</span><span class="admin-stat-label">평균 만족도 /5</span></div>' +
      '<div class="admin-stat admin-stat--confirmed"><span class="admin-stat-num">' +
      (stats.avg_nps || "-") +
      '</span><span class="admin-stat-label">평균 NPS /10</span></div>' +
      "</div>"
    );
  }

  function formatAnswers(answers) {
    var keys = Object.keys(answers || {});
    if (!keys.length) return "-";
    return keys
      .map(function (k) {
        return (
          "<dt>" +
          escapeHtml(LABELS[k] || k) +
          "</dt><dd>" +
          escapeHtml(String(answers[k])) +
          "</dd>"
        );
      })
      .join("");
  }

  function renderList() {
    if (!responses.length) {
      return '<p class="admin-empty">아직 응답이 없습니다.</p>';
    }

    return (
      '<div class="survey-response-list">' +
      responses
        .map(function (r) {
          return (
            '<article class="survey-response-card card">' +
            '<header class="survey-response-head">' +
            "<div><strong>" +
            escapeHtml(r.cohort) +
            "</strong>" +
            (r.name && r.name !== "(익명)"
              ? " · " + escapeHtml(r.name)
              : " · 익명") +
            "</div>" +
            '<time>' +
            escapeHtml(r.submitted_at) +
            "</time></header>" +
            '<dl class="survey-response-dl">' +
            formatAnswers(r.answers) +
            "</dl></article>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderDashboard(stats) {
    document.getElementById("surveyAdminApp").innerHTML =
      '<header class="admin-header">' +
      "<div><h1>만족도 조사 · 관리</h1>" +
      '<p class="admin-sub">응답 ' +
      (stats.total || 0) +
      "건</p></div>" +
      '<div class="admin-header-actions">' +
      '<button type="button" class="btn btn-outline" id="refreshBtn">새로고침</button>' +
      '<button type="button" class="btn btn-outline" id="logoutBtn">로그아웃</button>' +
      "</div></header>" +
      renderStats(stats) +
      renderList() +
      '<p class="admin-footer-note"><a href="../">설문 페이지</a> · Google Sheet <code>surveys</code> 탭</p>';

    document.getElementById("refreshBtn").addEventListener("click", loadResponses);
    document.getElementById("logoutBtn").addEventListener("click", function () {
      sessionStorage.removeItem("pr-admin-secret");
      renderLogin();
    });
  }

  function loadResponses() {
    var secret = getAdminSecret();
    var endpoint = getEndpoint();

    if (!secret) {
      renderLogin();
      return;
    }
    if (!endpoint) {
      document.getElementById("surveyAdminApp").innerHTML =
        '<div class="admin-login card"><h1>설정 필요</h1><p><code>data-survey-endpoint</code>를 설정해주세요.</p></div>';
      return;
    }

    document.getElementById("surveyAdminApp").innerHTML =
      '<p class="admin-loading">불러오는 중…</p>';

    fetch(endpoint + "?adminSecret=" + encodeURIComponent(secret))
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (!res.success) {
          if (res.message === "Unauthorized") {
            sessionStorage.removeItem("pr-admin-secret");
            renderLogin();
            var err = document.getElementById("loginError");
            if (err) {
              err.textContent = "비밀번호가 올바르지 않습니다.";
              err.hidden = false;
            }
            return;
          }
          throw new Error(res.message);
        }
        responses = res.responses || [];
        renderDashboard(res.stats || {});
      })
      .catch(function (err) {
        document.getElementById("surveyAdminApp").innerHTML =
          '<div class="admin-login card"><h1>오류</h1><p>' +
          escapeHtml(err.message) +
          '</p><button class="btn btn-outline" onclick="location.reload()">다시 시도</button></div>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadResponses);
  } else {
    loadResponses();
  }
})();
