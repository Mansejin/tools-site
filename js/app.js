const grid = document.getElementById("toolGrid");
const filtersEl = document.getElementById("filters");
const toast = document.getElementById("toast");

const lang = document.documentElement.lang.startsWith("en") ? "en" : "ko";
const dataPath = document.body.dataset.tools || "data/tools.json";
const localeTag = lang === "en" ? "en" : "ko";

const UI = {
  ko: {
    all: "전체",
    loading: "불러오는 중…",
    empty: "해당 태그의 도구가 없습니다.",
    error: "도구 목록을 불러오지 못했습니다.",
    install: "설치",
    platform: "플랫폼",
    shortcut: "단축키",
    copyInstall: "설치 명령 복사",
    copied: "복사됨",
    copyFailed: "복사 실패",
    previewOffline:
      "로컬 미리보기 — 더미 데이터입니다. json 변경을 보려면 preview.bat을 실행하세요.",
    previewFallback: "json 로드 실패 — 더미 데이터로 표시 중입니다.",
  },
  en: {
    all: "All",
    loading: "Loading…",
    empty: "No tools match this tag.",
    error: "Could not load the tool list.",
    install: "Install",
    platform: "Platform",
    shortcut: "Shortcut",
    copyInstall: "Copy install command",
    copied: "Copied",
    copyFailed: "Copy failed",
    previewOffline:
      "Local preview — using dummy data. Run preview.bat to load tools.json.",
    previewFallback: "Could not load json — showing dummy data.",
  },
};

const t = UI[lang];

let tools = [];
let activeTag = "all";
const expandedIds = new Set();

function pickLocalized(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || value.ko || "";
}

function pickTags(tool) {
  const tags = tool.tags;
  if (Array.isArray(tags)) return tags;
  if (tags && typeof tags === "object") {
    return tags[lang] || tags.en || tags.ko || [];
  }
  return [];
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(t.copied);
    return true;
  } catch {
    showToast(t.copyFailed);
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function collectTags(items) {
  const tags = new Set();
  for (const tool of items) {
    for (const tag of pickTags(tool)) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, localeTag));
}

function renderFilters(tags) {
  if (tags.length <= 1) return;

  filtersEl.hidden = false;
  filtersEl.innerHTML = [
    `<button type="button" class="filter-btn active" data-tag="all">${escapeHtml(t.all)}</button>`,
    ...tags.map(
      (tag) =>
        `<button type="button" class="filter-btn" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
    ),
  ].join("");

  filtersEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".filter-btn");
    if (!btn) return;
    activeTag = btn.dataset.tag;
    filtersEl.querySelectorAll(".filter-btn").forEach((el) => {
      el.classList.toggle("active", el === btn);
    });
    renderTools();
  });
}

function filteredTools() {
  if (activeTag === "all") return tools;
  return tools.filter((tool) => pickTags(tool).includes(activeTag));
}

function renderTools() {
  const items = filteredTools();
  if (!items.length) {
    grid.innerHTML = `<p class="empty">${escapeHtml(t.empty)}</p>`;
    return;
  }

  grid.innerHTML = items.map(renderCard).join("");

  grid.querySelectorAll(".tool-details").forEach((details) => {
    if (expandedIds.has(details.dataset.toolId)) {
      details.open = true;
    }
    details.addEventListener("toggle", () => {
      const id = details.dataset.toolId;
      if (details.open) expandedIds.add(id);
      else expandedIds.delete(id);
    });
  });

  grid.querySelectorAll(".tool-details-body").forEach((body) => {
    body.addEventListener("click", (event) => event.stopPropagation());
  });

  grid.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      copyText(btn.dataset.copy);
    });
  });
}

function renderCard(tool) {
  const status = tool.status || "stable";
  const tags = pickTags(tool)
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  const install = tool.install
    ? `<div class="install-block">
        <div class="install-label">${escapeHtml(t.install)}</div>
        <pre>${escapeHtml(tool.install)}</pre>
      </div>`
    : "";

  const actions = [
    tool.github
      ? `<a class="btn btn-primary" href="${escapeHtml(tool.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>`
      : "",
    tool.install
      ? `<button type="button" class="btn btn-secondary" data-copy="${escapeHtml(tool.install)}">${escapeHtml(t.copyInstall)}</button>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<article class="tool-card" id="${escapeHtml(tool.id)}">
    <details class="tool-details" data-tool-id="${escapeHtml(tool.id)}">
      <summary class="tool-summary">
        <div class="tool-summary-text">
          <div class="tool-card-header">
            <h2>${escapeHtml(tool.name)}</h2>
            <span class="status status-${escapeHtml(status)}">${escapeHtml(status)}</span>
          </div>
          <p class="tagline">${escapeHtml(pickLocalized(tool.tagline))}</p>
        </div>
        <span class="tool-chevron" aria-hidden="true"></span>
      </summary>
      <div class="tool-details-body">
        <p class="description">${escapeHtml(pickLocalized(tool.description))}</p>
        <div class="meta">
          ${tool.platform ? `<span>${escapeHtml(t.platform)}: <strong>${escapeHtml(tool.platform)}</strong></span>` : ""}
          ${tool.shortcut ? `<span>${escapeHtml(t.shortcut)}: <strong>${escapeHtml(tool.shortcut)}</strong></span>` : ""}
        </div>
        <div class="tags">${tags}</div>
        ${install}
        <div class="card-actions">${actions}</div>
      </div>
    </details>
  </article>`;
}

function showPreviewBanner(message) {
  const page = document.querySelector(".page");
  if (!page || document.getElementById("previewBanner")) return;

  const banner = document.createElement("div");
  banner.id = "previewBanner";
  banner.className = "preview-banner";
  banner.textContent = message;
  page.insertBefore(banner, page.firstChild);
}

function getFallbackTools(includeDummy) {
  const items = typeof FALLBACK_TOOLS !== "undefined" ? [...FALLBACK_TOOLS] : [];
  if (includeDummy && typeof PREVIEW_DUMMY_TOOL !== "undefined") {
    items.push(PREVIEW_DUMMY_TOOL);
  }
  return items;
}

async function loadTools() {
  if (location.protocol === "file:") {
    showPreviewBanner(t.previewOffline);
    return getFallbackTools(true);
  }

  try {
    const response = await fetch(dataPath);
    if (!response.ok) throw new Error("load failed");
    return await response.json();
  } catch {
    showPreviewBanner(t.previewFallback);
    return getFallbackTools(false);
  }
}

async function init() {
  grid.innerHTML = `<p class="loading">${escapeHtml(t.loading)}</p>`;

  tools = await loadTools();
  if (!tools.length) {
    grid.innerHTML = `<p class="error">${escapeHtml(t.error)}<br><code>data/tools.json</code></p>`;
    return;
  }

  renderFilters(collectTags(tools));
  renderTools();
}

init();
