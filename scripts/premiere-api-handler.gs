/**
 * mansejin.com/pr 통합 API — 수강 신청 + 만족도 설문
 *
 * ★ 배포 전 체크리스트
 * 1. SPREADSHEET_ID 를 본인 스프레드시트 ID로 변경
 * 2. 아래 3개 SECRET 값이 웹페이지와 동일한지 확인:
 *    - ENROLL_SECRET  ↔ pr/index.html 의 data-enroll-secret
 *    - SURVEY_SECRET  ↔ pr/survey/index.html 의 data-survey-secret
 *    - ADMIN_SECRET   ↔ 관리자 로그인 비밀번호
 * 3. 배포 → 새 배포 → 웹 앱 (실행: 나 / 액세스: 모든 사용자)
 * 4. URL을 pr/index.html · pr/admin · pr/survey · pr/survey/admin 에 입력
 */

const NOTIFY_TO = "sea3648@naver.com";
const ENROLL_SECRET = "mansejin-pr-enroll-k9m2x7p4q1w8n5z3";
const SURVEY_SECRET = "mansejin-pr-survey-p3k8m2x7n1w5z9q4";
const ADMIN_SECRET = "O5100jun@@";
const SPREADSHEET_ID = "SPREADSHEET_ID_HERE";

const ENROLL_SHEET = "applications";
const SURVEY_SHEET = "surveys";

const ENROLL_HEADERS = [
  "id", "submitted_at", "cohort", "name", "phone", "email",
  "status", "amount", "memo", "updated_at",
];

const SURVEY_HEADERS = ["id", "submitted_at", "cohort", "name", "answers_json"];

const STATUS_LABELS = {
  pending_payment: "입금대기",
  paid: "입금확인",
  confirmed: "수강확정",
  cancelled: "취소",
};

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    if (!params.adminSecret || params.adminSecret !== ADMIN_SECRET) {
      return jsonOut({ success: false, message: "Unauthorized" });
    }

    if (params.type === "survey") {
      return jsonOut(listSurveys());
    }
    return jsonOut(listApplications());
  } catch (err) {
    return jsonOut({ success: false, message: String(err) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload.action === "update") {
      return handleEnrollUpdate(payload);
    }
    if (payload.answers) {
      return handleSurveySubmit(payload);
    }
    return handleEnrollSubmit(payload);
  } catch (err) {
    return jsonOut({ success: false, message: String(err) });
  }
}

function doOptions() {
  return ContentService.createTextOutput("").setMimeType(
    ContentService.MimeType.TEXT
  );
}

// ── 수강 신청 ──

function handleEnrollSubmit(payload) {
  if (!payload.secret || payload.secret !== ENROLL_SECRET) {
    return jsonOut({
      success: false,
      message: "Unauthorized — ENROLL_SECRET 불일치. GAS와 pr/index.html data-enroll-secret 을 확인하세요.",
    });
  }

  const name = String(payload.name || "").trim();
  const phone = normalizePhone(String(payload.phone || "").trim());
  const email = String(payload.email || "").trim();
  const cohort = String(payload.cohort || "미지정").trim();
  const amount = Number(payload.amount) || 120000;

  if (!name || name.length < 2) {
    return jsonOut({ success: false, message: "이름을 입력해주세요." });
  }
  if (!phone || phone.length < 10) {
    return jsonOut({ success: false, message: "연락처를 올바르게 입력해주세요." });
  }

  const sheet = getSheet(ENROLL_SHEET, ENROLL_HEADERS);
  const now = new Date();
  const id = Utilities.getUuid();

  sheet.appendRow([
    id, formatDate(now), cohort, name, phone, email,
    "pending_payment", amount, "", formatDate(now),
  ]);

  GmailApp.sendEmail(
    NOTIFY_TO,
    "[Pr강의] 수강 신청 — " + name + " (" + cohort + ")",
    [
      "새 수강 신청이 접수되었습니다.", "",
      "기수: " + cohort, "이름: " + name, "연락처: " + phone,
      "이메일: " + (email || "-"), "강의료: " + amount.toLocaleString() + "원",
      "상태: 입금대기", "신청 ID: " + id,
      "신청 시각: " + formatDate(now), "",
      "관리: https://mansejin.com/pr/admin/",
    ].join("\n")
  );

  return jsonOut({
    success: true,
    id: id,
    message: "신청이 접수되었습니다. 안내 계좌로 입금해주세요.",
  });
}

function handleEnrollUpdate(payload) {
  if (!payload.adminSecret || payload.adminSecret !== ADMIN_SECRET) {
    return jsonOut({ success: false, message: "Unauthorized" });
  }

  const id = String(payload.id || "").trim();
  const status = String(payload.status || "").trim();
  const memo = payload.memo !== undefined ? String(payload.memo) : undefined;

  if (!id) return jsonOut({ success: false, message: "ID가 필요합니다." });
  if (status && !STATUS_LABELS[status]) {
    return jsonOut({ success: false, message: "잘못된 상태값입니다." });
  }

  const sheet = getSheet(ENROLL_SHEET, ENROLL_HEADERS);
  const data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) {
    return jsonOut({ success: false, message: "신청 내역을 찾을 수 없습니다." });
  }

  const now = formatDate(new Date());
  if (status) sheet.getRange(rowIndex, 7).setValue(status);
  if (memo !== undefined) sheet.getRange(rowIndex, 9).setValue(memo);
  sheet.getRange(rowIndex, 10).setValue(now);

  return jsonOut({ success: true, message: "업데이트되었습니다." });
}

function listApplications() {
  const sheet = getSheet(ENROLL_SHEET, ENROLL_HEADERS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return { success: true, applications: [], stats: emptyEnrollStats() };
  }

  const apps = [];
  for (var i = 1; i < rows.length; i++) {
    apps.push({
      id: String(rows[i][0] || ""),
      submitted_at: String(rows[i][1] || ""),
      cohort: String(rows[i][2] || ""),
      name: String(rows[i][3] || ""),
      phone: String(rows[i][4] || ""),
      email: String(rows[i][5] || ""),
      status: String(rows[i][6] || "pending_payment"),
      status_label: STATUS_LABELS[rows[i][6]] || rows[i][6],
      amount: Number(rows[i][7]) || 0,
      memo: String(rows[i][8] || ""),
      updated_at: String(rows[i][9] || ""),
    });
  }

  apps.sort(function (a, b) {
    return String(b.submitted_at).localeCompare(String(a.submitted_at));
  });

  const stats = emptyEnrollStats();
  stats.total = apps.length;
  apps.forEach(function (a) {
    if (stats[a.status] !== undefined) stats[a.status]++;
  });

  return { success: true, applications: apps, stats: stats };
}

// ── 만족도 설문 ──

function handleSurveySubmit(payload) {
  if (!payload.secret || payload.secret !== SURVEY_SECRET) {
    return jsonOut({
      success: false,
      message: "Unauthorized — SURVEY_SECRET 불일치. GAS와 pr/survey/index.html data-survey-secret 을 확인하세요.",
    });
  }

  const cohort = String(payload.cohort || "").trim();
  const name = String(payload.name || "").trim();
  const answers = payload.answers || {};

  if (!cohort) return jsonOut({ success: false, message: "수강 기수를 선택해주세요." });
  if (!answers.overall) return jsonOut({ success: false, message: "전체 만족도를 선택해주세요." });

  const sheet = getSheet(SURVEY_SHEET, SURVEY_HEADERS);
  const now = new Date();
  const id = Utilities.getUuid();

  sheet.appendRow([id, formatDate(now), cohort, name || "(익명)", JSON.stringify(answers)]);

  GmailApp.sendEmail(
    NOTIFY_TO,
    "[Pr강의] 만족도 조사 — " + cohort + (name ? " (" + name + ")" : ""),
    [
      "새 만족도 조사 응답이 접수되었습니다.", "",
      "기수: " + cohort, "이름: " + (name || "익명"),
      "전체 만족도: " + (answers.overall || "-") + "/5",
      "추천 의향(NPS): " + (answers.recommend !== undefined ? answers.recommend : "-"), "",
      JSON.stringify(answers, null, 2), "",
      "관리: https://mansejin.com/pr/survey/admin/",
    ].join("\n")
  );

  return jsonOut({ success: true, message: "소중한 의견 감사합니다!" });
}

function listSurveys() {
  const sheet = getSheet(SURVEY_SHEET, SURVEY_HEADERS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return { success: true, responses: [], stats: emptySurveyStats() };
  }

  const responses = [];
  for (var i = 1; i < rows.length; i++) {
    var answers = {};
    try { answers = JSON.parse(rows[i][4] || "{}"); } catch (e) { answers = {}; }
    responses.push({
      id: String(rows[i][0] || ""),
      submitted_at: String(rows[i][1] || ""),
      cohort: String(rows[i][2] || ""),
      name: String(rows[i][3] || ""),
      answers: answers,
    });
  }

  responses.sort(function (a, b) {
    return String(b.submitted_at).localeCompare(String(a.submitted_at));
  });

  const stats = emptySurveyStats();
  stats.total = responses.length;
  var sumOverall = 0, sumNps = 0, oc = 0, nc = 0;

  responses.forEach(function (r) {
    var a = r.answers || {};
    if (a.overall) { sumOverall += Number(a.overall); oc++; }
    if (a.recommend !== undefined && a.recommend !== "") {
      sumNps += Number(a.recommend); nc++;
    }
  });

  stats.avg_overall = oc ? Math.round((sumOverall / oc) * 10) / 10 : 0;
  stats.avg_nps = nc ? Math.round((sumNps / nc) * 10) / 10 : 0;

  return { success: true, responses: responses, stats: stats };
}

// ── 공통 ──

function getSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function emptyEnrollStats() {
  return { total: 0, pending_payment: 0, paid: 0, confirmed: 0, cancelled: 0 };
}

function emptySurveyStats() {
  return { total: 0, avg_overall: 0, avg_nps: 0 };
}

function normalizePhone(phone) {
  return phone.replace(/[^\d+]/g, "");
}

function formatDate(d) {
  return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
