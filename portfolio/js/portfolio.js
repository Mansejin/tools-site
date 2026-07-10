(function () {
  const LEVEL_LABELS = { top: "최상", high: "상", medium: "중", low: "하" };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function youtubeThumb(url) {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    return null;
  }

  async function loadData() {
    const src = document.body.dataset.portfolio;
    if (!src) return window.FALLBACK_PORTFOLIO;

    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error("fetch failed");
      return await res.json();
    } catch {
      showDummyBanner();
      return window.FALLBACK_PORTFOLIO;
    }
  }

  function showDummyBanner() {
    const banner = document.createElement("div");
    banner.className = "dummy-banner";
    banner.textContent = "로컬 미리보기 모드 — data/portfolio.json 대신 내장 데이터를 사용합니다.";
    document.body.prepend(banner);
  }

  function setMeta(data) {
    document.title = data.meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = data.meta.description;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = data.meta.title;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = data.meta.description;
    if (data.meta.ogImage) {
      const ogImage = document.querySelector('meta[property="og:image"]') || (() => {
        const meta = document.createElement("meta");
        meta.setAttribute("property", "og:image");
        document.head.appendChild(meta);
        return meta;
      })();
      ogImage.content = new URL(data.meta.ogImage, location.href).href;
    }
  }

  let photoLightboxEl;

  function ensurePhotoLightbox() {
    if (photoLightboxEl) return photoLightboxEl;
    photoLightboxEl = document.createElement("div");
    photoLightboxEl.className = "photo-lightbox";
    photoLightboxEl.innerHTML = '<img class="photo-lightbox-image" alt="">';
    photoLightboxEl.addEventListener("click", closePhotoLightbox);
    document.body.appendChild(photoLightboxEl);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePhotoLightbox();
    });
    return photoLightboxEl;
  }

  function openPhotoLightbox(src, alt) {
    const lightbox = ensurePhotoLightbox();
    const img = lightbox.querySelector(".photo-lightbox-image");
    img.src = src;
    img.alt = alt || "";
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closePhotoLightbox() {
    if (!photoLightboxEl?.classList.contains("is-open")) return;
    photoLightboxEl.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function renderHero(data) {
    const el = document.getElementById("hero");
    if (!el) return;
    const photo = data.hero.photo
      ? `<button type="button" class="hero-photo-wrap" aria-label="${escapeHtml(data.hero.photoAlt || "프로필 사진 크게 보기")}"><img class="hero-photo" src="${escapeHtml(data.hero.photo)}" alt="" width="166" height="222" loading="eager"></button>`
      : "";
    el.innerHTML = `
      <div class="hero-inner">
        <div class="hero-content">
          <span class="hero-badge">${escapeHtml(data.hero.role)}</span>
          <h1>${escapeHtml(data.hero.greeting)}</h1>
          <p class="hero-intro">${escapeHtml(data.hero.intro)}</p>
        </div>
        ${photo}
      </div>`;

    const trigger = el.querySelector(".hero-photo-wrap");
    if (trigger && data.hero.photo) {
      trigger.addEventListener("click", () => {
        openPhotoLightbox(data.hero.photo, data.hero.photoAlt || data.hero.name);
      });
    }
  }

  function renderProfile(data) {
    const el = document.getElementById("profileContent");
    if (!el) return;
    const p = data.profile;

    const resumeHtml = p.resumeUrl
      ? `<a class="profile-resume" href="${escapeHtml(p.resumeUrl)}" target="_blank" rel="noopener noreferrer">📄 ${escapeHtml(p.resumeLabel)} →</a>`
      : `<p class="profile-resume" style="color:var(--text-tertiary)">📄 ${escapeHtml(p.resumeLabel)} (링크 준비 중)</p>`;

    const careerHtml = p.career.items
      .map(
        (c) => `
        <div class="career-item">
          <div class="career-header">
            <span class="career-company">${escapeHtml(c.company)}</span>
            <span class="career-period">${escapeHtml(c.period)}</span>
            ${c.note ? `<span class="career-note">(${escapeHtml(c.note)})</span>` : ""}
          </div>
          <p class="career-role">${escapeHtml(c.role)}</p>
          <ul class="career-details">
            ${c.details.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
          </ul>
        </div>`
      )
      .join("");

    el.innerHTML = `
      ${resumeHtml}
      <div class="profile-grid">
        <div class="card">
          <p class="card-title">경력 (총 ${p.career.totalYears}년)</p>
          ${careerHtml}
        </div>
        <div class="card">
          <p class="card-title">학력</p>
          ${p.education
            .map(
              (e) => `
            <div class="edu-item">
              <p class="edu-school">${escapeHtml(e.school)}</p>
              <p class="edu-meta">${escapeHtml(e.status)} · ${escapeHtml(e.period)}</p>
            </div>`
            )
            .join("")}
        </div>
        <div class="card">
          <p class="card-title">기타</p>
          ${
            p.other.length
              ? p.other.map((o) => `<div class="other-item"><p class="edu-school">${escapeHtml(o.title)}</p></div>`).join("")
              : `<p class="profile-empty">—</p>`
          }
        </div>
      </div>`;
  }

  function renderSkills(data) {
    const el = document.getElementById("skillsContent");
    if (!el) return;

    const categoriesHtml = data.skills.categories
      .map(
        (cat) => `
        <div class="skill-category">
          <h3>${escapeHtml(cat.label)}</h3>
          <div class="skill-list">
            ${cat.items
              .map((item, i) => {
                const level = item.level || "medium";
                const detail = item.detail
                  ? escapeHtml(item.detail)
                  : '<span class="skill-detail--empty">상세 설명을 추가해 주세요.</span>';
                return `
                <div class="skill-item" data-skill="${cat.id}-${i}">
                  <button type="button" class="skill-trigger" aria-expanded="false">
                    <span class="skill-name">${escapeHtml(item.name)}</span>
                    <span class="skill-level skill-level--${level}">${LEVEL_LABELS[level] || level}</span>
                    <span class="skill-chevron" aria-hidden="true">▼</span>
                  </button>
                  <div class="skill-detail">${detail}</div>
                </div>`;
              })
              .join("")}
          </div>
        </div>`
      )
      .join("");

    el.innerHTML = `<div class="skills-grid">${categoriesHtml}</div>`;

    el.querySelectorAll(".skill-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".skill-item");
        const open = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open);
      });
    });
  }

  function renderProjectCard(item) {
    const thumb = item.thumbnail || (item.url ? youtubeThumb(item.url) : null);
    const thumbHtml = thumb
      ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy">`
      : "🎬";

    const meta =
      item.client || item.year
        ? `<p class="project-meta">${[item.client, item.year].filter(Boolean).map(escapeHtml).join(" · ")}</p>`
        : "";

    const inner = `
        <div class="project-thumb">${thumbHtml}</div>
        <div class="project-info">
          <p class="project-title">${escapeHtml(item.title)}</p>
          ${meta}
        </div>`;

    if (item.url) {
      return `
      <a class="project-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        ${inner}
      </a>`;
    }

    return `<div class="project-card project-card--static">${inner}</div>`;
  }

  function renderProjects(data) {
    const tabsEl = document.getElementById("projectTabs");
    const gridEl = document.getElementById("projectGrid");
    if (!tabsEl || !gridEl) return;

    const categories = data.projects.categories;
    let activeId = categories[0]?.id;

    function showCategory(id) {
      activeId = id;
      tabsEl.querySelectorAll(".project-tab").forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.category === id);
      });

      const cat = categories.find((c) => c.id === id);
      if (!cat || !cat.items.length) {
        gridEl.innerHTML = `<p class="project-empty">아직 등록된 프로젝트가 없습니다.<br><code>portfolio/data/portfolio.json</code>에 항목을 추가해 주세요.</p>`;
        return;
      }
      gridEl.innerHTML = cat.items.map(renderProjectCard).join("");
    }

    tabsEl.innerHTML = categories
      .map(
        (c) =>
          `<button type="button" class="project-tab${c.id === activeId ? " is-active" : ""}" data-category="${escapeHtml(c.id)}">${escapeHtml(c.label)}</button>`
      )
      .join("");

    tabsEl.querySelectorAll(".project-tab").forEach((tab) => {
      tab.addEventListener("click", () => showCategory(tab.dataset.category));
    });

    showCategory(activeId);
  }

  function renderAbout(data) {
    const el = document.getElementById("aboutContent");
    if (!el) return;

    const icons = { youtube: "▶️", tools: "🧰" };

    el.innerHTML = `
      <div class="channel-grid">
        ${data.about.channels
          .map(
            (ch) => `
          <div class="channel-card">
            <span class="channel-icon">${icons[ch.type] || "🔗"}</span>
            <p class="channel-name">${escapeHtml(ch.name)}</p>
            <p class="channel-desc">${escapeHtml(ch.description)}</p>
            ${ch.type === "tools" ? '<ul class="channel-tools" id="aboutToolsList"></ul>' : ""}
            <a class="channel-link" href="${escapeHtml(ch.url)}" target="_blank" rel="noopener noreferrer">바로가기 →</a>
            ${ch.email ? `<p class="channel-email">${escapeHtml(ch.email)}</p>` : ""}
          </div>`
          )
          .join("")}
      </div>`;

    loadAboutTools();
  }

  async function loadAboutTools() {
    const listEl = document.getElementById("aboutToolsList");
    if (!listEl) return;

    const src = document.body.dataset.tools;
    let tools = [];

    if (src) {
      try {
        const res = await fetch(src);
        if (res.ok) tools = await res.json();
      } catch {
        /* fallback below */
      }
    }

    if (!tools.length && window.FALLBACK_TOOLS) {
      tools = window.FALLBACK_TOOLS.filter((t) => t.id !== "preview-dummy");
    }

    if (!tools.length) {
      listEl.innerHTML = `<li class="channel-tool-item channel-tool-item--empty">도구 목록을 불러오지 못했습니다.</li>`;
      return;
    }

    listEl.innerHTML = tools
      .map((tool) => {
        const tagline = tool.tagline?.ko || tool.tagline || "";
        const href = tool.download || tool.github || "https://mansejin.com/";
        return `
        <li class="channel-tool-item">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
            <span class="channel-tool-name">${escapeHtml(tool.name)}</span>
            <span class="channel-tool-desc">${escapeHtml(tagline)}</span>
          </a>
        </li>`;
      })
      .join("");
  }

  function renderExperience(data) {
    const el = document.getElementById("experienceContent");
    if (!el) return;
    el.innerHTML = `
      <div class="experience-list">
        ${data.experience.items
          .map(
            (item) => `
          <div class="experience-item">
            <span class="experience-emoji">${item.emoji}</span>
            <p class="experience-text">${escapeHtml(item.text)}</p>
          </div>`
          )
          .join("")}
      </div>`;
  }

  function renderHowIWork(data) {
    const el = document.getElementById("howIWorkContent");
    if (!el) return;
    el.innerHTML = `<ul class="work-list">${data.howIWork.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function renderContact(data) {
    const el = document.getElementById("contactContent");
    if (!el) return;
    const c = data.contact;
    el.innerHTML = `
      <div class="card contact-card">
        <h2>Contact</h2>
        <div class="contact-links">
          <p class="contact-item">✉️ <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></p>
          <p class="contact-item">📱 <a href="tel:${escapeHtml(c.phone.replace(/\s/g, ""))}">${escapeHtml(c.phone)}</a></p>
          <p class="contact-item">📍 ${escapeHtml(c.location)}</p>
        </div>
        <a class="contact-cta" href="mailto:${escapeHtml(c.email)}">이메일 보내기</a>
      </div>`;
  }

  async function init() {
    const data = await loadData();
    setMeta(data);
    renderHero(data);
    renderProfile(data);
    renderSkills(data);
    renderProjects(data);
    renderAbout(data);
    renderExperience(data);
    renderHowIWork(data);
    renderContact(data);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
