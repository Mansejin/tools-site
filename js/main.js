const grid = document.getElementById("toolGrid");
const filtersEl = document.getElementById("filters");
const toast = document.getElementById("toast");

let tools = [];
let activeTag = "all";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("복사됨");
    return true;
  } catch {
    showToast("복사 실패");
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
    for (const tag of tool.tags || []) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "ko"));
}

function renderFilters(tags) {
  if (tags.length <= 1) return;

  filtersEl.hidden = false;
  filtersEl.innerHTML = [
    `<button type="button" class="filter-btn active" data-tag="all">전체</button>`,
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
  return tools.filter((tool) => (tool.tags || []).includes(activeTag));
}

function renderTools() {
  const items = filteredTools();
  if (!items.length) {
    grid.innerHTML = '<p class="empty">해당 태그의 도구가 없습니다.</p>';
    return;
  }

  grid.innerHTML = items.map(renderCard).join("");

  grid.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.dataset.copy));
  });
}

function renderCard(tool) {
  const status = tool.status || "stable";
  const tags = (tool.tags || [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  const install = tool.install
    ? `<div class="install-block">
        <div class="install-label">설치</div>
        <pre>${escapeHtml(tool.install)}</pre>
      </div>`
    : "";

  const actions = [
    tool.github
      ? `<a class="btn btn-primary" href="${escapeHtml(tool.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>`
      : "",
    tool.install
      ? `<button type="button" class="btn btn-secondary" data-copy="${escapeHtml(tool.install)}">설치 명령 복사</button>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<article class="tool-card" id="${escapeHtml(tool.id)}">
    <div class="tool-card-header">
      <h2><a href="${escapeHtml(tool.github || "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(tool.name)}</a></h2>
      <span class="status status-${escapeHtml(status)}">${escapeHtml(status)}</span>
    </div>
    <p class="tagline">${escapeHtml(tool.tagline || "")}</p>
    <p class="description">${escapeHtml(tool.description || "")}</p>
    <div class="meta">
      ${tool.platform ? `<span>플랫폼: <strong>${escapeHtml(tool.platform)}</strong></span>` : ""}
      ${tool.shortcut ? `<span>단축키: <strong>${escapeHtml(tool.shortcut)}</strong></span>` : ""}
    </div>
    <div class="tags">${tags}</div>
    ${install}
    <div class="card-actions">${actions}</div>
  </article>`;
}

async function init() {
  try {
    const response = await fetch("data/tools.json");
    if (!response.ok) throw new Error("load failed");
    tools = await response.json();
    renderFilters(collectTags(tools));
    renderTools();
  } catch {
    grid.innerHTML =
      '<p class="error">도구 목록을 불러오지 못했습니다.<br><code>data/tools.json</code>을 확인하세요.</p>';
  }
}

init();
