(function () {
  "use strict";

  var FALLBACK = {
    title: "만세진의 주옥 같은 프리미어 강의",
    tagline: "4주 만에 끝내는 실전 프리미어 영상편집",
    instructor: {
      name: "만세진",
      headline: "프리미어 영상편집 13년차",
      bio: "[자료 입력 필요] 강사 소개를 입력해주세요."
    },
    pricing: {
      original: 150000,
      discounted: 120000,
      description: "4주 완성 프리미어 강의 (주 1회 2시간, 총 8시간)"
    },
    format: { weeks: 4, hoursPerSession: 2, sessionsPerWeek: 1, totalHours: 8 },
    curriculum: [],
    assets: {
      driveUrl: "https://drive.google.com/drive/folders/1HT19mXiDryytN-_qaqutnYM2S1bTH5K7"
    }
  };

  function formatPrice(n) {
    return n.toLocaleString("ko-KR") + "원";
  }

  function isPlaceholder(text) {
    return typeof text === "string" && text.indexOf("[자료 입력 필요]") === 0;
  }

  function renderList(items, placeholderItems) {
    var list = items && items.length ? items : placeholderItems || [];
    if (!list.length) return "";
    return (
      '<ul class="check-list">' +
      list
        .map(function (item) {
          var cls = isPlaceholder(item) ? " placeholder-item" : "";
          return '<li class="' + cls.trim() + '">' + escapeHtml(item) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderHero(data) {
    var discount = Math.round((1 - data.pricing.discounted / data.pricing.original) * 100);
    var el = document.getElementById("heroContent");
    el.innerHTML =
      '<div class="hero-inner">' +
      '<span class="hero-badge">' +
      escapeHtml(data.instructor.headline) +
      "</span>" +
      "<h1>" +
      escapeHtml(data.title) +
      "</h1>" +
      '<p class="hero-tagline">' +
      escapeHtml(data.tagline) +
      "</p>" +
      '<div class="hero-stats">' +
      '<div class="stat-pill"><strong>' +
      data.format.weeks +
      "주</strong>과정</div>" +
      '<div class="stat-pill"><strong>주 ' +
      data.format.sessionsPerWeek +
      "회</strong>" +
      data.format.hoursPerSession +
      "시간</div>" +
      '<div class="stat-pill"><strong>총 ' +
      data.format.totalHours +
      "시간</strong>완성</div>" +
      "</div>" +
      '<div class="price-card">' +
      '<p class="price-label">강의료</p>' +
      '<p class="price-original">' +
      formatPrice(data.pricing.original) +
      "</p>" +
      '<p class="price-discounted">' +
      formatPrice(data.pricing.discounted) +
      "</p>" +
      '<p class="price-desc">' +
      escapeHtml(data.pricing.description) +
      "</p>" +
      '<span class="price-badge">' +
      discount +
      "% 할인</span>" +
      "</div>" +
      '<div class="hero-cta">' +
      '<a class="btn btn-primary" href="#enroll">' +
      escapeHtml(data.enrollment && data.enrollment.ctaText ? data.enrollment.ctaText : "수강 신청하기") +
      "</a>" +
      "</div>" +
      "</div>";
  }

  function renderInstructor(data) {
    var el = document.getElementById("instructorContent");
    var badge = isPlaceholder(data.instructor.bio) ? '<span class="placeholder-badge">자료 입력 필요</span>' : "";
    el.innerHTML =
      '<div class="card">' +
      "<h3>" +
      escapeHtml(data.instructor.name) +
      " · " +
      escapeHtml(data.instructor.headline) +
      badge +
      "</h3>" +
      '<p style="margin-top:12px;color:var(--text-secondary)">' +
      escapeHtml(data.instructor.bio) +
      "</p>" +
      "</div>";
  }

  function renderSchedule(data) {
    var el = document.getElementById("scheduleContent");
    var s = data.schedule || {};
    el.innerHTML =
      '<dl class="info-grid">' +
      infoItem("다음 기수", s.nextCohort) +
      infoItem("모집 마감", s.registrationDeadline) +
      infoItem("정원", s.capacity) +
      infoItem("수업 방식", data.format.mode) +
      infoItem("장소 / 플랫폼", data.format.location) +
      "</dl>";
  }

  function infoItem(label, value) {
    var badge = isPlaceholder(value) ? ' <span class="placeholder-badge">자료 입력 필요</span>' : "";
    return (
      '<div class="info-item"><dt>' +
      escapeHtml(label) +
      badge +
      "</dt><dd>" +
      escapeHtml(value || "-") +
      "</dd></div>"
    );
  }

  function renderCurriculum(data) {
    var el = document.getElementById("curriculumContent");
    el.innerHTML = data.curriculum
      .map(function (week) {
        return (
          '<article class="week-card">' +
          '<span class="week-label">' +
          week.week +
          "주차</span>" +
          "<h3>" +
          escapeHtml(week.title) +
          "</h3>" +
          '<ul class="week-topics">' +
          week.topics.map(function (t) {
            return "<li>" + escapeHtml(t) + "</li>";
          }).join("") +
          "</ul>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderFaq(data) {
    var el = document.getElementById("faqContent");
    var items = data.faq && data.faq.length ? data.faq : data.faqPlaceholder || [];
    el.innerHTML =
      '<div class="faq-list">' +
      items
        .map(function (item) {
          var badge = isPlaceholder(item.a) ? ' <span class="placeholder-badge">자료 입력 필요</span>' : "";
          return (
            '<details class="faq-item">' +
            "<summary>" +
            escapeHtml(item.q) +
            badge +
            "</summary>" +
            "<p>" +
            escapeHtml(item.a) +
            "</p>" +
            "</details>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderTestimonials(data) {
    var el = document.getElementById("testimonialsContent");
    var items = data.testimonials && data.testimonials.length ? data.testimonials : data.testimonialsPlaceholder || [];
    el.innerHTML =
      '<div class="testimonial-grid">' +
      items
        .map(function (item) {
          return (
            '<div class="testimonial-card">' +
            "<blockquote>" +
            escapeHtml(item.text) +
            "</blockquote>" +
            "<cite>— " +
            escapeHtml(item.author) +
            "</cite>" +
            "</div>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderEnrollment(data) {
    var el = document.getElementById("enrollmentContent");
    var e = data.enrollment || {};
    var linkHtml = e.link
      ? '<a class="btn btn-primary" href="' + escapeHtml(e.link) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(e.ctaText || "수강 신청하기") + "</a>"
      : '<a class="btn btn-primary" href="#">' + escapeHtml(e.ctaText || "수강 신청하기") + "</a>";
    var badge = isPlaceholder(e.contact) ? '<span class="placeholder-badge">자료 입력 필요</span>' : "";
    el.innerHTML =
      "<h2>수강 신청" +
      badge +
      "</h2>" +
      "<p>관심 있으시면 아래로 연락 주세요.</p>" +
      linkHtml +
      '<p class="cta-contact">' +
      escapeHtml(e.contact || "") +
      "</p>" +
      (e.note ? '<p class="cta-contact" style="margin-top:8px;font-size:0.85rem">' + escapeHtml(e.note) + "</p>" : "");
  }

  function renderTips(data) {
    var el = document.getElementById("tipsContent");
    if (!data.subscriptionTips) return;
    el.innerHTML =
      '<div class="tips-grid">' +
      data.subscriptionTips
        .map(function (tip) {
          return (
            '<div class="tip-card"><h4>' +
            escapeHtml(tip.title) +
            "</h4><p>" +
            escapeHtml(tip.body) +
            "</p></div>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderPage(data) {
    renderHero(data);
    renderInstructor(data);
    renderSchedule(data);

    document.getElementById("targetContent").innerHTML = renderList(data.targetAudience, data.targetAudiencePlaceholder);
    document.getElementById("outcomesContent").innerHTML = renderList(data.outcomes, data.outcomesPlaceholder);
    document.getElementById("prerequisitesContent").innerHTML = renderList(data.prerequisites);
    document.getElementById("equipmentContent").innerHTML = renderList(data.equipment, data.equipmentPlaceholder);

    renderCurriculum(data);
    renderTips(data);
    renderFaq(data);
    renderTestimonials(data);
    renderEnrollment(data);

    var assets = data.assets || {};
    document.getElementById("driveDescription").textContent = assets.description || "";
    document.getElementById("driveLink").href = assets.driveUrl || "#";

    document.title = data.title + " · 만세진";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = data.tagline;
  }

  function load() {
    var src = document.body.getAttribute("data-course") || "data/course.json";
    fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then(renderPage)
      .catch(function () {
        renderPage(FALLBACK);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
