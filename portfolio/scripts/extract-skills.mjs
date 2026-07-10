import fs from "fs";

const BASE = "https://mansjin.notion.site";
const raw = fs.readFileSync("portfolio/scripts/main-page.json", "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);
const blocks = data.recordMap?.block || {};

function plainText(prop) {
  if (!prop) return "";
  return prop.map((seg) => seg[0]).join("");
}

function getBlock(id) {
  const b = blocks[id]?.value?.value || blocks[id]?.value;
  return b;
}

async function loadBlock(id) {
  const res = await fetch(`${BASE}/api/v3/loadPageChunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pageId: id,
      limit: 100,
      cursor: { stack: [] },
      chunkNumber: 0,
      verticalColumns: false,
    }),
  });
  const json = await res.json();
  const extra = json.recordMap?.block || {};
  for (const [k, v] of Object.entries(extra)) {
    blocks[k] = v;
  }
  return json;
}

const toggles = [];
for (const [id, wrap] of Object.entries(blocks)) {
  const b = wrap.value?.value || wrap.value;
  if (b?.type === "toggle" && b.properties?.title) {
    const title = plainText(b.properties.title).replace(/\s+/g, " ").trim();
    toggles.push({ id, title, children: b.content || [] });
  }
}

for (const t of toggles) {
  for (const childId of t.children) {
    if (!getBlock(childId)) await loadBlock(childId);
  }
}

const skills = {};
for (const t of toggles) {
  const details = [];
  let level = "medium";
  for (const childId of t.children) {
    const b = getBlock(childId);
    if (!b) continue;
    const text = plainText(b.properties?.title);
    if (text) {
      if (/^상$|^중$|^하$/.test(text.trim())) level = { 상: "high", 중: "medium", 하: "low" }[text.trim()] || level;
      else details.push(text);
    }
  }
  skills[t.title] = { level, detail: details.join(" ").trim() };
}

console.log(JSON.stringify(skills, null, 2));
