/**
 * mansejin.com/pr/survey 만족도 조사 → Google Sheet 저장
 *
 * 설정:
 * 1. https://script.google.com → 새 프로젝트 (또는 enrollment와 같은 스프레드시트 사용 가능)
 * 2. SURVEY_SECRET, ADMIN_SECRET 변경
 * 3. SPREADSHEET_ID 입력
 * 4. 웹 앱 배포 (실행: 나 / 액세스: 모든 사용자)
 * 5. pr/survey/index.html · pr/survey/admin/index.html 의 data-survey-endpoint 에 URL 입력
 *
 * 시트명: surveys
 * 컬럼: id | submitted_at | cohort | name | answers_json
 */

const SURVEY_TO = "sea3648@naver.com";
const SURVEY_SECRET = "mansejin-pr-survey-p3k8m2x7n1w5z9q4";
const ADMIN_SECRET = "mansejin-pr-admin-h6j3v9r2t8c5m1k4";
const SPREADSHEET_ID = "SPREADSHEET_ID_HERE";
const SHEET_NAME = "surveys";

const HEADERS = ["id", "submitted_at", "cohort", "name", "answers_json"];

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    if (!params.adminSecret || params.adminSecret !== ADMIN_SECRET) {
      return jsonOut({ success: false, message: "Unauthorized" });
    }

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return jsonOut({ success: true, responses: [], stats: emptyStats() });
    }

    const responses = [];
    for (var i = 1; i < rows.length; i++) {
      responses.push(rowToResponse(rows[i]));
    }

    responses.sort(function (a, b) {
      return String(b.submitted_at).localeCompare(String(a.submitted_at));
    });

    return jsonOut({
      success: true,
      responses: responses,
      stats: calcStats(responses),
    });
  } catch (err) {
    return jsonOut({ success: false, message: String(err) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (!payload.secret || payload.secret !== SURVEY_SECRET) {
      return jsonOut({ success: false, message: "Unauthorized" });
    }

    const cohort = String(payload.cohort || "").trim();
    const name = String(payload.name || "").trim();
    const answers = payload.answers || {};

    if (!cohort) {
      return jsonOut({ success: false, message: "수강 기수를 선택해주세요." });
    }
    if (!answers.overall) {
      return jsonOut({ success: false, message: "전체 만족도를 선택해주세요." });
    }

    const sheet = getSheet();
    const now = new Date();
    const id = Utilities.getUuid();
    const row = [
      id,
      formatDate(now),
      cohort,
      name || "(익명)",
      JSON.stringify(answers),
    ];

    sheet.appendRow(row);

    const subject = "[Pr강의] 만족도 조사 — " + cohort + (name ? " (" + name + ")" : "");
    const body = [
      "새 만족도 조사 응답이 접수되었습니다.",
      "",
      "기수: " + cohort,
      "이름: " + (name || "익명"),
      "전체 만족도: " + (answers.overall || "-") + "/5",
      "추천 의향(NPS): " + (answers.recommend !== undefined ? answers.recommend : "-"),
      "",
      "응답 상세:",
      JSON.stringify(answers, null, 2),
      "",
      "관리: https://mansejin.com/pr/survey/admin/",
    ].join("\n");

    GmailApp.sendEmail(SURVEY_TO, subject, body);

    return jsonOut({ success: true, message: "소중한 의견 감사합니다!" });
  } catch (err) {
    return jsonOut({ success: false, message: String(err) });
  }
}

function doOptions() {
  return ContentService.createTextOutput("").setMimeType(
    ContentService.MimeType.TEXT
  );
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowToResponse(row) {
  var answers = {};
  try {
    answers = JSON.parse(row[4] || "{}");
  } catch (e) {
    answers = {};
  }
  return {
    id: String(row[0] || ""),
    submitted_at: String(row[1] || ""),
    cohort: String(row[2] || ""),
    name: String(row[3] || ""),
    answers: answers,
  };
}

function calcStats(responses) {
  var stats = emptyStats();
  stats.total = responses.length;

  var sumOverall = 0;
  var sumNps = 0;
  var npsCount = 0;
  var overallCount = 0;

  responses.forEach(function (r) {
    var a = r.answers || {};
    if (a.overall) {
      sumOverall += Number(a.overall);
      overallCount++;
    }
    if (a.recommend !== undefined && a.recommend !== "") {
      sumNps += Number(a.recommend);
      npsCount++;
    }
  });

  stats.avg_overall = overallCount
    ? Math.round((sumOverall / overallCount) * 10) / 10
    : 0;
  stats.avg_nps = npsCount ? Math.round((sumNps / npsCount) * 10) / 10 : 0;

  return stats;
}

function emptyStats() {
  return { total: 0, avg_overall: 0, avg_nps: 0 };
}

function formatDate(d) {
  return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
