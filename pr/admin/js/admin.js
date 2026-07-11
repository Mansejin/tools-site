(function () {
  "use strict";

  var applications = [];
  var currentFilter = "all";

  function getEndpoint() {
    return document.body.getAttribute("data-enroll-endpoint") || "";
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

  function statusBadge(status) {
    var map = {
      pending_payment: "badge-pending",
      paid: "badge-paid",
      confirmed: "badge-confirmed",
      cancelled: "badge-cancelled",
    };
    var labels = {
      pending_payment: "입금대기",
      paid: "입금확인",
      confirmed: "수강확정",
      cancelled: "취소",
    };
    return (
      '<span class="admin-badge ' +
      (map[status] || "") +
      '">' +
      escapeHtml(labels[status] || status) +
      "</span>"
    );
  }

  function renderLogin() {
    document.getElementById("adminApp").innerHTML =
      '<div class="admin-login card">' +
      "<h1>Pr 강의 · 신청 관리</h1>" +
      "<p>관리자 비밀번호를 입력하세요.</p>" +
      '<form id="loginForm">' +
      '<input type="password" id="adminSecretInput" placeholder="관리자 비밀번호" required autocomplete="current-password">' +
      '<button type="submit" class="btn btn-primary">로그인</button>' +
      '<p class="admin-error" id="loginError" hidden></p>' +
      "</form>" +
      '<p class="admin-hint">Google Apps Script 배포 후 <code>data-admin-secret</code>과 동일한 값을 사용합니다.</p>' +
      "</div>";

    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var val = document.getElementById("adminSecretInput").value.trim();
      if (!val) return;
      setAdminSecret(val);
      loadApplications();
    });
  }

  function renderStats(stats) {
    stats = stats || {};
    return (
      '<div class="admin-stats">' +
      statBox("전체", stats.total) +
      statBox("입금대기", stats.pending_payment, "pending") +
      statBox("입금확인", stats.paid, "paid") +
      statBox("수강확정", stats.confirmed, "confirmed") +
      statBox("취소", stats.cancelled, "cancelled") +
      "</div>"
    );
  }

  function statBox(label, count, type) {
    return (
      '<div class="admin-stat' +
      (type ? " admin-stat--" + type : "") +
      '"><span class="admin-stat-num">' +
      (count || 0) +
      '</span><span class="admin-stat-label">' +
      escapeHtml(label) +
      "</span></div>"
    );
  }

  function renderFilters() {
    var filters = [
      { id: "all", label: "전체" },
      { id: "pending_payment", label: "입금대기" },
      { id: "paid", label: "입금확인" },
      { id: "confirmed", label: "수강확정" },
      { id: "cancelled", label: "취소" },
    ];
    return (
      '<div class="admin-filters">' +
      filters
        .map(function (f) {
          var active = currentFilter === f.id ? " is-active" : "";
          return (
            '<button type="button" class="admin-filter' +
            active +
            '" data-filter="' +
            f.id +
            '">' +
            escapeHtml(f.label) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function filteredApps() {
    if (currentFilter === "all") return applications;
    return applications.filter(function (a) {
      return a.status === currentFilter;
    });
  }

  function renderTable() {
    var rows = filteredApps();
    if (!rows.length) {
      return '<p class="admin-empty">표시할 신청 내역이 없습니다.</p>';
    }

    return (
      '<div class="admin-table-wrap">' +
      '<table class="admin-table">' +
      "<thead><tr>" +
      "<th>신청일</th><th>기수</th><th>이름</th><th>연락처</th><th>이메일</th><th>상태</th><th>관리</th>" +
      "</tr></thead><tbody>" +
      rows
        .map(function (a) {
          var actions = "";
          if (a.status === "pending_payment") {
            actions +=
              '<button type="button" class="admin-action" data-action="paid" data-id="' +
              escapeHtml(a.id) +
              '">입금확인</button>';
          }
          if (a.status === "paid") {
            actions +=
              '<button type="button" class="admin-action admin-action--primary" data-action="confirmed" data-id="' +
              escapeHtml(a.id) +
              '">수강확정</button>';
          }
          if (a.status !== "cancelled" && a.status !== "confirmed") {
            actions +=
              '<button type="button" class="admin-action admin-action--danger" data-action="cancelled" data-id="' +
              escapeHtml(a.id) +
              '">취소</button>';
          }
          return (
            "<tr>" +
            "<td>" +
            escapeHtml(a.submitted_at) +
            "</td>" +
            "<td>" +
            escapeHtml(a.cohort) +
            "</td>" +
            "<td><strong>" +
            escapeHtml(a.name) +
            "</strong></td>" +
            "<td>" +
            escapeHtml(a.phone) +
            "</td>" +
            "<td>" +
            escapeHtml(a.email || "-") +
            "</td>" +
            "<td>" +
            statusBadge(a.status) +
            "</td>" +
            '<td class="admin-actions">' +
            actions +
            "</td>" +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function renderDashboard(stats) {
    document.getElementById("adminApp").innerHTML =
      '<header class="admin-header">' +
      "<div><h1>Pr 강의 · 신청 관리</h1>" +
      '<p class="admin-sub">Google Sheet 연동 · 실시간 신청 내역</p></div>' +
      '<div class="admin-header-actions">' +
      '<button type="button" class="btn btn-outline" id="refreshBtn">새로고침</button>' +
      '<button type="button" class="btn btn-outline" id="logoutBtn">로그아웃</button>' +
      "</div></header>" +
      renderStats(stats) +
      renderFilters() +
      '<div id="adminTable">' +
      renderTable() +
      "</div>" +
      '<p class="admin-footer-note" id="adminStatus"></p>';

    document.getElementById("refreshBtn").addEventListener("click", loadApplications);
    document.getElementById("logoutBtn").addEventListener("click", function () {
      sessionStorage.removeItem("pr-admin-secret");
      renderLogin();
    });

    bindFilterAndActions();
    bindActions();
  }

  function bindFilterAndActions() {
    document.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentFilter = btn.getAttribute("data-filter");
        document.querySelectorAll(".admin-filter").forEach(function (b) {
          b.classList.toggle("is-active", b.getAttribute("data-filter") === currentFilter);
        });
        document.getElementById("adminTable").innerHTML = renderTable();
        bindActions();
      });
    });
  }

  function bindActions() {
    document.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        updateStatus(btn.getAttribute("data-id"), btn.getAttribute("data-action"));
      });
    });
  }

  function updateStatus(id, status) {
    var labels = { paid: "입금확인", confirmed: "수강확정", cancelled: "취소" };
    if (!confirm(labels[status] + " 처리할까요?")) return;

    fetch(getEndpoint(), {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "update",
        adminSecret: getAdminSecret(),
        id: id,
        status: status,
      }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (!res.success) throw new Error(res.message);
        loadApplications();
      })
      .catch(function (err) {
        alert(err.message || "업데이트 실패");
      });
  }

  function loadApplications() {
    var secret = getAdminSecret();
    var endpoint = getEndpoint();

    if (!secret) {
      renderLogin();
      return;
    }
    if (!endpoint) {
      document.getElementById("adminApp").innerHTML =
        '<div class="admin-login card"><h1>설정 필요</h1><p><code>data-enroll-endpoint</code>가 아직 설정되지 않았습니다. Google Apps Script 배포 후 URL을 넣어주세요.</p></div>';
      return;
    }

    document.getElementById("adminApp").innerHTML = '<p class="admin-loading">불러오는 중…</p>';

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
        applications = res.applications || [];
        renderDashboard(res.stats);
      })
      .catch(function (err) {
        document.getElementById("adminApp").innerHTML =
          '<div class="admin-login card"><h1>오류</h1><p>' +
          escapeHtml(err.message) +
          '</p><button type="button" class="btn btn-outline" onclick="location.reload()">다시 시도</button></div>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadApplications);
  } else {
    loadApplications();
  }
})();
