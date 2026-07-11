(function () {
  "use strict";

  var courseData = null;
  var modalEl = null;

  function getEndpoint() {
    return document.body.getAttribute("data-enroll-endpoint") || "";
  }

  function getSecret() {
    return document.body.getAttribute("data-enroll-secret") || "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatPrice(n) {
    return Number(n).toLocaleString("ko-KR") + "원";
  }

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement("div");
    modalEl.className = "enroll-modal";
    modalEl.id = "enrollModal";
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.innerHTML =
      '<div class="enroll-modal-backdrop" data-enroll-close></div>' +
      '<div class="enroll-modal-panel" role="dialog" aria-modal="true" aria-labelledby="enrollModalTitle">' +
      '<button type="button" class="enroll-modal-close" data-enroll-close aria-label="닫기">×</button>' +
      '<div id="enrollModalBody"></div>' +
      "</div>";
    document.body.appendChild(modalEl);

    modalEl.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-enroll-close")) closeModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalEl.classList.contains("is-open")) closeModal();
    });

    return modalEl;
  }

  function openModal() {
    ensureModal();
    modalEl.classList.add("is-open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove("is-open");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function renderForm() {
    var e = (courseData && courseData.enrollment) || {};
    var cohort = e.cohort || "8월 2기";
    return (
      '<h2 id="enrollModalTitle">수강 신청</h2>' +
      '<p class="enroll-modal-sub">' +
      escapeHtml(cohort) +
      " · 정원 8명 · 선착순</p>" +
      '<form id="enrollForm" class="enroll-form" novalidate>' +
      '<label class="enroll-field">' +
      "<span>이름 <em>*</em></span>" +
      '<input type="text" name="name" required maxlength="40" placeholder="실명 입력" autocomplete="name">' +
      "</label>" +
      '<label class="enroll-field">' +
      "<span>연락처 <em>*</em></span>" +
      '<input type="tel" name="phone" required maxlength="20" placeholder="010-0000-0000" autocomplete="tel">' +
      "</label>" +
      '<label class="enroll-field">' +
      "<span>이메일 <small>(선택)</small></span>" +
      '<input type="email" name="email" maxlength="80" placeholder="sea3648@naver.com" autocomplete="email">' +
      "</label>" +
      '<p class="enroll-form-note">신청 후 안내 계좌로 입금해주시면, 입금 확인 후 수강이 확정됩니다.</p>' +
      '<button type="submit" class="btn btn-primary enroll-submit">신청하기</button>' +
      '<p class="enroll-form-error" id="enrollFormError" hidden></p>' +
      "</form>"
    );
  }

  function renderSuccess() {
    var e = (courseData && courseData.enrollment) || {};
    var pay = e.payment || {};
    return (
      '<div class="enroll-success">' +
      '<p class="enroll-success-icon" aria-hidden="true">✓</p>' +
      "<h2>신청이 접수되었습니다</h2>" +
      '<p class="enroll-modal-sub">아래 계좌로 입금해주시면 확인 후 수강 확정 안내를 드립니다.</p>' +
      '<div class="enroll-bank-card">' +
      '<p class="enroll-bank-amount">' +
      formatPrice(pay.amount || 120000) +
      "</p>" +
      '<dl class="enroll-bank-dl">' +
      "<dt>은행</dt><dd>" +
      escapeHtml(pay.bank || "") +
      "</dd>" +
      "<dt>계좌번호</dt><dd><strong>" +
      escapeHtml(pay.account || "") +
      "</strong></dd>" +
      "<dt>예금주</dt><dd>" +
      escapeHtml(pay.holder || "") +
      "</dd>" +
      "<dt>입금자명</dt><dd>신청하신 <strong>이름</strong>과 동일하게</dd>" +
      "</dl>" +
      (pay.note ? '<p class="enroll-bank-note">' + escapeHtml(pay.note) + "</p>" : "") +
      "</div>" +
      '<p class="enroll-contact">문의: ' +
      escapeHtml(e.phone || "") +
      " · " +
      escapeHtml(e.email || "") +
      "</p>" +
      '<button type="button" class="btn btn-outline" data-enroll-close>닫기</button>' +
      "</div>"
    );
  }

  function renderPendingSetup() {
    return (
      '<h2 id="enrollModalTitle">수강 신청</h2>' +
      '<p class="enroll-modal-sub">온라인 신청 시스템 준비 중입니다.</p>' +
      '<p>아래로 직접 연락해주세요.</p>' +
      '<p class="enroll-contact">' +
      escapeHtml((courseData && courseData.enrollment && courseData.enrollment.contact) || "") +
      "</p>" +
      '<button type="button" class="btn btn-outline" data-enroll-close>닫기</button>'
    );
  }

  function showForm() {
    var body = document.getElementById("enrollModalBody");
    if (!getEndpoint()) {
      body.innerHTML = renderPendingSetup();
      openModal();
      return;
    }
    body.innerHTML = renderForm();
    openModal();

    var form = document.getElementById("enrollForm");
    form.addEventListener("submit", handleSubmit);
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    var form = ev.target;
    var errEl = document.getElementById("enrollFormError");
    var btn = form.querySelector(".enroll-submit");
    var fd = new FormData(form);
    var name = String(fd.get("name") || "").trim();
    var phone = String(fd.get("phone") || "").trim();
    var email = String(fd.get("email") || "").trim();
    var e = courseData.enrollment || {};

    errEl.hidden = true;

    if (!name || name.length < 2) {
      errEl.textContent = "이름을 입력해주세요.";
      errEl.hidden = false;
      return;
    }
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      errEl.textContent = "연락처를 올바르게 입력해주세요.";
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    btn.textContent = "접수 중…";

    fetch(getEndpoint(), {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submit",
        secret: getSecret(),
        name: name,
        phone: phone,
        email: email,
        cohort: e.cohort || "",
        amount: (e.payment && e.payment.amount) || 120000,
      }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (!res.success) throw new Error(res.message || "신청에 실패했습니다.");
        document.getElementById("enrollModalBody").innerHTML = renderSuccess();
      })
      .catch(function (err) {
        errEl.textContent = err.message || "신청 중 오류가 발생했습니다. 전화로 문의해주세요.";
        errEl.hidden = false;
        btn.disabled = false;
        btn.textContent = "신청하기";
      });
  }

  function bindButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-enroll-open]");
      if (btn) {
        e.preventDefault();
        showForm();
      }
    });
  }

  window.PrEnrollment = {
    init: function (data) {
      courseData = data;
      ensureModal();
      bindButtons();
    },
    open: showForm,
  };
})();
