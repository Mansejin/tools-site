(function () {
  "use strict";

  var surveyData = null;

  function getEndpoint() {
    return document.body.getAttribute("data-survey-endpoint") || "";
  }

  function getSecret() {
    return document.body.getAttribute("data-survey-secret") || "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderRating(q, name) {
    var labels = q.labels || [];
    return (
      '<fieldset class="survey-rating" data-required="' +
      (q.required ? "1" : "0") +
      '">' +
      '<legend>' +
      escapeHtml(q.label) +
      (q.required ? ' <em>*</em>' : "") +
      "</legend>" +
      '<div class="rating-options">' +
      [1, 2, 3, 4, 5]
        .map(function (n) {
          var label = labels[n - 1] || n;
          return (
            '<label class="rating-option">' +
            '<input type="radio" name="' +
            name +
            '" value="' +
            n +
            '"' +
            (q.required ? " required" : "") +
            ">" +
            '<span class="rating-num">' +
            n +
            "</span>" +
            '<span class="rating-label">' +
            escapeHtml(label) +
            "</span>" +
            "</label>"
          );
        })
        .join("") +
      "</div></fieldset>"
    );
  }

  function renderSelect(q, name) {
    return (
      '<label class="survey-field">' +
      "<span>" +
      escapeHtml(q.label) +
      (q.required ? ' <em>*</em>' : "") +
      "</span>" +
      '<select name="' +
      name +
      '"' +
      (q.required ? " required" : "") +
      ">" +
      '<option value="">선택해주세요</option>' +
      (q.options || [])
        .map(function (opt) {
          return '<option value="' + escapeHtml(opt) + '">' + escapeHtml(opt) + "</option>";
        })
        .join("") +
      "</select></label>"
    );
  }

  function renderNps(q, name) {
    return (
      '<fieldset class="survey-nps" data-required="' +
      (q.required ? "1" : "0") +
      '">' +
      '<legend>' +
      escapeHtml(q.label) +
      (q.required ? ' <em>*</em>' : "") +
      (q.hint ? '<small>' + escapeHtml(q.hint) + "</small>" : "") +
      "</legend>" +
      '<div class="nps-options">' +
      Array.from({ length: 11 }, function (_, i) {
        return i;
      })
        .map(function (n) {
          return (
            '<label class="nps-option">' +
            '<input type="radio" name="' +
            name +
            '" value="' +
            n +
            '"' +
            (q.required ? " required" : "") +
            ">" +
            "<span>" +
            n +
            "</span></label>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="nps-scale"><span>추천 안 함</span><span>적극 추천</span></div>' +
      "</fieldset>"
    );
  }

  function renderTextarea(q, name) {
    return (
      '<label class="survey-field">' +
      "<span>" +
      escapeHtml(q.label) +
      (q.required ? ' <em>*</em>' : "") +
      "</span>" +
      '<textarea name="' +
      name +
      '" rows="3" maxlength="2000" placeholder="' +
      escapeHtml(q.placeholder || "") +
      '"' +
      (q.required ? " required" : "") +
      "></textarea></label>"
    );
  }

  function renderQuestion(q) {
    var name = "q_" + q.id;
    if (q.type === "rating") return renderRating(q, name);
    if (q.type === "select") return renderSelect(q, name);
    if (q.type === "nps") return renderNps(q, name);
    if (q.type === "textarea") return renderTextarea(q, name);
    return "";
  }

  function renderForm(data) {
    var fields = data.fields || {};
    var cohortField = fields.cohort || { label: "수강 기수", required: true };
    var nameField = fields.name || { label: "이름", required: false };

    return (
      '<header class="survey-header">' +
      "<h1>" +
      escapeHtml(data.title) +
      "</h1>" +
      '<p class="survey-sub">' +
      escapeHtml(data.subtitle) +
      "</p>" +
      "</header>" +
      '<form id="surveyForm" class="survey-form card" novalidate>' +
      '<label class="survey-field">' +
      "<span>" +
      escapeHtml(cohortField.label) +
      ' <em>*</em></span>' +
      '<select name="cohort" required>' +
      '<option value="">선택해주세요</option>' +
      (data.cohorts || [])
        .map(function (c) {
          return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + "</option>";
        })
        .join("") +
      "</select></label>" +
      '<label class="survey-field">' +
      "<span>" +
      escapeHtml(nameField.label) +
      (nameField.hint ? ' <small>(' + escapeHtml(nameField.hint) + ")</small>" : "") +
      "</span>" +
      '<input type="text" name="name" maxlength="40" placeholder="선택 입력">' +
      "</label>" +
      (data.questions || []).map(renderQuestion).join("") +
      '<button type="submit" class="btn btn-primary survey-submit">제출하기</button>' +
      '<p class="survey-error" id="surveyError" hidden></p>' +
      "</form>" +
      '<p class="survey-footer"><a href="../">← 강의 페이지로</a></p>'
    );
  }

  function renderSuccess() {
    return (
      '<div class="survey-success card">' +
      '<p class="survey-success-icon" aria-hidden="true">✓</p>' +
      "<h1>제출 완료</h1>" +
      "<p>소중한 의견 감사합니다.<br>더 나은 강의를 만드는 데 반영하겠습니다.</p>" +
      '<a class="btn btn-outline" href="../">강의 페이지로</a>' +
      "</div>"
    );
  }

  function renderGoogleRedirect(url) {
    location.replace(url);
  }

  function collectAnswers(form) {
    var answers = {};
    (surveyData.questions || []).forEach(function (q) {
      var input = form.querySelector('[name="q_' + q.id + '"]');
      if (!input) return;
      if (q.type === "rating" || q.type === "nps") {
        var checked = form.querySelector('[name="q_' + q.id + '"]:checked');
        if (checked) answers[q.id] = checked.value;
      } else if (q.type === "select") {
        if (input.value) answers[q.id] = input.value;
      } else if (q.type === "textarea") {
        if (input.value.trim()) answers[q.id] = input.value.trim();
      }
    });
    return answers;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    var form = ev.target;
    var errEl = document.getElementById("surveyError");
    var btn = form.querySelector(".survey-submit");
    var fd = new FormData(form);

    errEl.hidden = true;

    var answers = collectAnswers(form);
    if (!answers.overall) {
      errEl.textContent = "전체 만족도를 선택해주세요.";
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    btn.textContent = "제출 중…";

    fetch(getEndpoint(), {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secret: getSecret(),
        cohort: String(fd.get("cohort") || "").trim(),
        name: String(fd.get("name") || "").trim(),
        answers: answers,
      }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (!res.success) throw new Error(res.message || "제출에 실패했습니다.");
        document.getElementById("surveyApp").innerHTML = renderSuccess();
      })
      .catch(function (err) {
        errEl.textContent = err.message || "제출 중 오류가 발생했습니다.";
        errEl.hidden = false;
        btn.disabled = false;
        btn.textContent = "제출하기";
      });
  }

  function init(data) {
    surveyData = data;
    var app = document.getElementById("surveyApp");

    if (data.googleFormUrl) {
      renderGoogleRedirect(data.googleFormUrl);
      return;
    }

    if (!getEndpoint()) {
      app.innerHTML =
        '<div class="card survey-setup">' +
        "<h1>" +
        escapeHtml(data.title) +
        "</h1>" +
        "<p>설문 시스템 준비 중입니다. Google Apps Script 배포 후 이용 가능합니다.</p>" +
        '<p><a href="../">강의 페이지로</a></p></div>';
      return;
    }

    app.innerHTML = renderForm(data);
    document.getElementById("surveyForm").addEventListener("submit", handleSubmit);
  }

  function load() {
    var src = document.body.getAttribute("data-survey") || "data/survey.json";
    fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then(init)
      .catch(function () {
        document.getElementById("surveyApp").innerHTML =
          '<p class="survey-loading">설문을 불러오지 못했습니다.</p>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
