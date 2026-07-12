/**
 * mansejin.com/pr 수강 신청 → Google Sheet 저장 + 이메일 알림
 *
 * 설정:
 * 1. https://script.google.com → 새 프로젝트 → 이 코드 붙여넣기
 * 2. ENROLL_SECRET, ADMIN_SECRET 값을 변경
 * 3. SPREADSHEET_ID: 새 Google 스프레드시트 만들고 URL의 ID 복사
 * 4. 배포 → 새 배포 → 유형: 웹 앱
 *    - 실행: 나
 *    - 액세스: 모든 사용자
 * 5. 웹 앱 URL을 pr/index.html · pr/admin/index.html 의 data-enroll-endpoint 에 넣기
 * 6. data-enroll-secret (신청용), data-admin-secret (관리자용) 동일하게 설정
 *
 * 스프레드시트 시트명: applications
 * 컬럼: id | submitted_at | cohort | name | phone | email | status | amount | memo | updated_at
 */

const ENROLL_TO = "sea3648@naver.com";
const ENROLL_SECRET = "mansejin-pr-enroll-k9m2x7p4q1w8n5z3";
const ADMIN_SECRET = "O5100jun@@";
const SPREADSHEET_ID = "SPREADSHEET_ID_HERE";
const SHEET_NAME = "applications";

const HEADERS = [
  "id",
  "submitted_at",
  "cohort",
  "name",
  "phone",
  "email",
  "status",
  "amount",
  "memo",
  "updated_at",
];

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

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return jsonOut({ success: true, applications: [], stats: emptyStats() });
    }

    const apps = [];
    for (var i = 1; i < rows.length; i++) {
      apps.push(rowToApp(rows[i]));
    }

    apps.sort(function (a, b) {
      return String(b.submitted_at).localeCompare(String(a.submitted_at));
    });

    return jsonOut({
      success: true,
      applications: apps,
      stats: calcStats(apps),
    });
  } catch (err) {
    return jsonOut({ success: false, message: String(err) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || "submit";

    if (action === "submit") {
      return handleSubmit(payload);
    }
    if (action === "update") {
      return handleUpdate(payload);
    }

    return jsonOut({ success: false, message: "Unknown action" });
  } catch (err) {
    return jsonOut({ success: false, message: String(err) });
  }
}

function doOptions() {
  return ContentService.createTextOutput("").setMimeType(
    ContentService.MimeType.TEXT
  );
}

function handleSubmit(payload) {
  if (!payload.secret || payload.secret !== ENROLL_SECRET) {
    return jsonOut({ success: false, message: "Unauthorized" });
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

  const sheet = getSheet();
  const now = new Date();
  const id = Utilities.getUuid();
  const row = [
    id,
    formatDate(now),
    cohort,
    name,
    phone,
    email,
    "pending_payment",
    amount,
    "",
    formatDate(now),
  ];

  sheet.appendRow(row);

  const subject = "[Pr강의] 수강 신청 — " + name + " (" + cohort + ")";
  const body = [
    "새 수강 신청이 접수되었습니다.",
    "",
    "기수: " + cohort,
    "이름: " + name,
    "연락처: " + phone,
    "이메일: " + (email || "-"),
    "강의료: " + amount.toLocaleString() + "원",
    "상태: 입금대기",
    "신청 ID: " + id,
    "신청 시각: " + formatDate(now),
    "",
    "관리: https://mansejin.com/pr/admin/",
  ].join("\n");

  GmailApp.sendEmail(ENROLL_TO, subject, body);

  return jsonOut({
    success: true,
    id: id,
    message: "신청이 접수되었습니다. 안내 계좌로 입금해주세요.",
  });
}

function handleUpdate(payload) {
  if (!payload.adminSecret || payload.adminSecret !== ADMIN_SECRET) {
    return jsonOut({ success: false, message: "Unauthorized" });
  }

  const id = String(payload.id || "").trim();
  const status = String(payload.status || "").trim();
  const memo = payload.memo !== undefined ? String(payload.memo) : undefined;

  if (!id) {
    return jsonOut({ success: false, message: "ID가 필요합니다." });
  }
  if (status && !STATUS_LABELS[status]) {
    return jsonOut({ success: false, message: "잘못된 상태값입니다." });
  }

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return jsonOut({ success: false, message: "신청 내역을 찾을 수 없습니다." });
  }

  const now = formatDate(new Date());

  if (status) {
    sheet.getRange(rowIndex, 7).setValue(status);
  }
  if (memo !== undefined) {
    sheet.getRange(rowIndex, 9).setValue(memo);
  }
  sheet.getRange(rowIndex, 10).setValue(now);

  return jsonOut({ success: true, message: "업데이트되었습니다." });
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

function rowToApp(row) {
  return {
    id: String(row[0] || ""),
    submitted_at: String(row[1] || ""),
    cohort: String(row[2] || ""),
    name: String(row[3] || ""),
    phone: String(row[4] || ""),
    email: String(row[5] || ""),
    status: String(row[6] || "pending_payment"),
    status_label: STATUS_LABELS[row[6]] || row[6],
    amount: Number(row[7]) || 0,
    memo: String(row[8] || ""),
    updated_at: String(row[9] || ""),
  };
}

function calcStats(apps) {
  var stats = emptyStats();
  stats.total = apps.length;
  apps.forEach(function (a) {
    if (stats[a.status] !== undefined) stats[a.status]++;
  });
  return stats;
}

function emptyStats() {
  return {
    total: 0,
    pending_payment: 0,
    paid: 0,
    confirmed: 0,
    cancelled: 0,
  };
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
