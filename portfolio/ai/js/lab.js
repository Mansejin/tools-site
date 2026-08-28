(function () {
  const FALLBACK = window.FALLBACK_LAB || null;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function loadData() {
    const src = document.body.dataset.lab;
    if (!src) return FALLBACK;
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error("fetch failed");
      return await res.json();
    } catch {
      return FALLBACK;
    }
  }

  function setMeta(data) {
    document.title = data.meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = data.meta.description;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = data.meta.title;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = data.meta.description;
  }

  function renderHero(data) {
    const el = document.getElementById("labHero");
    if (!el) return;
    const h = data.hero;
    el.innerHTML = `
      <p class="lab-eyebrow">${escapeHtml(h.eyebrow)}</p>
      <h1>${escapeHtml(h.title)}</h1>
      <p class="lab-lede">${escapeHtml(h.lede)}</p>`;
  }

  function renderStatus(data) {
    const el = document.getElementById("labStatus");
    if (!el) return;
    const s = data.status;
    el.innerHTML = `
      <header class="lab-block-head">
        <h2>현황</h2>
        <p>갱신 ${escapeHtml(s.updated)}</p>
      </header>
      <table class="lab-status">
        <tbody>
          ${s.rows
            .map((row) => {
              const value = row.href
                ? `<a href="${escapeHtml(row.href)}">${escapeHtml(row.value)}</a>`
                : escapeHtml(row.value);
              return `<tr><th>${escapeHtml(row.label)}</th><td>${value}</td></tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  }

  function renderStack(data) {
    const el = document.getElementById("labStack");
    if (!el) return;
    el.innerHTML = `
      <header class="lab-block-head">
        <h2>쓰는 것</h2>
      </header>
      <table class="lab-status">
        <tbody>
          ${data.stack
            .map(
              (row) =>
                `<tr><th>${escapeHtml(row.role)}</th><td><strong>${escapeHtml(row.tool)}</strong> — ${escapeHtml(row.note)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  function renderColumns(data) {
    const el = document.getElementById("labColumns");
    if (!el) return;
    el.innerHTML = data.columns
      .map(
        (col) => `
        <article class="lab-column" id="${escapeHtml(col.id)}">
          <p class="lab-column-date">${escapeHtml(col.date)}</p>
          <h2>${escapeHtml(col.title)}</h2>
          <p class="lab-column-dek">${escapeHtml(col.dek)}</p>
          ${col.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
        </article>`
      )
      .join("");
  }

  async function init() {
    const data = await loadData();
    if (!data) return;
    setMeta(data);
    renderHero(data);
    renderStatus(data);
    renderStack(data);
    renderColumns(data);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
