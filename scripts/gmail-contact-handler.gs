/**
 * mansejin.com 문의하기 → sae3648@gmail.com (첨부 포함)
 *
 * 설정:
 * 1. https://script.google.com → 새 프로젝트 → 이 코드 붙여넣기
 * 2. CONTACT_SECRET 값을 아래와 index.html data-contact-secret 과 동일하게 변경
 * 3. 배포 → 새 배포 → 유형: 웹 앱
 *    - 실행: 나
 *    - 액세스: 모든 사용자
 * 4. 웹 앱 URL을 index.html / en/index.html 의 data-contact-endpoint 에 넣기
 */

const CONTACT_TO = "sae3648@gmail.com";
const CONTACT_SECRET = "mansejin-contact-a8f3k2fzvb48w9zvjxw341x";

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (!payload.secret || payload.secret !== CONTACT_SECRET) {
      return jsonOut({ success: false, message: "Unauthorized" });
    }

    const subject = String(payload.subject || "[mansejin] 문의").slice(0, 200);
    const lines = [
      String(payload.message || ""),
      "",
      "---",
      "category: " + (payload.category || ""),
      "product: " + (payload.product || ""),
      "page: " + (payload.page || ""),
      "language: " + (payload.language || ""),
    ];

    if (payload.replyEmail) {
      lines.push("reply-to: " + payload.replyEmail);
    }

    const attachments = [];
    const files = payload.files || [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!f || !f.data || !f.name) continue;
      attachments.push(
        Utilities.newBlob(
          Utilities.base64Decode(f.data),
          f.type || "application/octet-stream",
          f.name
        )
      );
    }

    var options = { attachments: attachments };
    if (payload.replyEmail) {
      options.replyTo = String(payload.replyEmail);
    }

    GmailApp.sendEmail(CONTACT_TO, subject, lines.join("\n"), options);

    return jsonOut({ success: true });
  } catch (err) {
    return jsonOut({ success: false, message: String(err) });
  }
}

function doOptions() {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
