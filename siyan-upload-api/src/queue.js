import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";
import { findJobByPath, markStatus, upsertJob } from "./store.js";
import { uploadVideo } from "./uploader.js";

const queue = [];
let active = 0;
const pendingStable = new Map(); // filePath -> timeout

function isVideo(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!config.extensions.includes(ext)) return false;
  // Premiere/AME temp: name.56452.27896.m4v
  if (/\.\d{4,}\.\d{4,}\.[^.]+$/i.test(path.basename(filePath))) return false;
  return true;
}

function jobIdFor(filePath) {
  return crypto.createHash("sha1").update(path.resolve(filePath)).digest("hex").slice(0, 16);
}

function ensureDir(dir) {
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
}

function moveFile(src, destDir) {
  if (!destDir) return src;
  ensureDir(destDir);
  const base = path.basename(src);
  let dest = path.join(destDir, base);
  if (fs.existsSync(dest)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = path.extname(base);
    const name = path.basename(base, ext);
    dest = path.join(destDir, `${name}_${stamp}${ext}`);
  }
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    // Docker bind mounts are different devices — copy then remove
    if (err?.code !== "EXDEV") throw err;
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
  }
  return dest;
}

async function waitUntilStable(filePath) {
  let last = -1;
  for (;;) {
    if (!fs.existsSync(filePath)) throw new Error("파일이 사라짐");
    const { size } = fs.statSync(filePath);
    if (size === last && size >= config.minBytes) return size;
    last = size;
    await new Promise((r) => setTimeout(r, config.stableMs));
  }
}

async function processOne(filePath) {
  const id = jobIdFor(filePath);
  const existing = findJobByPath(filePath);
  if (existing?.status === "done") {
    console.log(`[siyan] skip already done: ${filePath}`);
    return;
  }
  if (existing?.status === "uploading") {
    console.log(`[siyan] skip already uploading: ${filePath}`);
    return;
  }
  // 업로드는 됐는데 done 이동만 실패한 경우 — 재업로드 금지
  if (existing?.status === "failed" && existing?.videoId) {
    console.log(`[siyan] skip failed-but-uploaded ${existing.videoId}: ${filePath}`);
    return;
  }

  upsertJob({
    id,
    filePath: path.resolve(filePath),
    filename: path.basename(filePath),
    status: "queued",
  });

  try {
    const size = await waitUntilStable(filePath);
    markStatus(id, "uploading", { sizeBytes: size, progressPct: 0 });

    const result = await uploadVideo(filePath, ({ pct }) => {
      markStatus(id, "uploading", { progressPct: pct });
    });

    let finalPath = filePath;
    let moveError = null;
    if (config.doneDir) {
      try {
        finalPath = moveFile(filePath, config.doneDir);
      } catch (err) {
        moveError = err?.message || String(err);
        console.warn(`[siyan] uploaded but move-to-done failed: ${moveError}`);
      }
    }

    markStatus(id, "done", {
      progressPct: 100,
      videoId: result.videoId,
      url: result.url,
      title: result.title,
      privacyStatus: result.privacyStatus,
      filePath: path.resolve(finalPath),
      error: moveError,
    });
    console.log(`[siyan] uploaded ${result.url} ← ${path.basename(filePath)}`);
  } catch (err) {
    const message = err?.message || String(err);
    console.error(`[siyan] fail ${filePath}:`, message);
    if (config.failDir && fs.existsSync(filePath)) {
      try {
        const moved = moveFile(filePath, config.failDir);
        markStatus(id, "failed", { error: message, filePath: path.resolve(moved) });
        return;
      } catch {
        /* keep original path */
      }
    }
    markStatus(id, "failed", { error: message });
  }
}

function pump() {
  while (active < config.concurrency && queue.length > 0) {
    const filePath = queue.shift();
    active += 1;
    processOne(filePath).finally(() => {
      active -= 1;
      pump();
    });
  }
}

export function enqueue(filePath) {
  const resolved = path.resolve(filePath);
  if (!isVideo(resolved)) return;
  if (!fs.existsSync(resolved)) return;

  const existing = findJobByPath(resolved);
  if (existing?.status === "done" || existing?.status === "uploading") return;
  if (queue.includes(resolved)) return;

  console.log(`[siyan] enqueue ${resolved}`);
  queue.push(resolved);
  pump();
}

/** Debounce: wait for copy/write to settle, then enqueue */
export function scheduleEnqueue(filePath) {
  const resolved = path.resolve(filePath);
  if (!isVideo(resolved)) return;

  if (pendingStable.has(resolved)) {
    clearTimeout(pendingStable.get(resolved));
  }
  const t = setTimeout(() => {
    pendingStable.delete(resolved);
    enqueue(resolved);
  }, config.stableMs);
  pendingStable.set(resolved, t);
}

export function getQueueSnapshot() {
  return {
    queued: queue.length,
    active,
    concurrency: config.concurrency,
  };
}

export function scanWatchDir() {
  const dir = config.watchDir;
  if (!fs.existsSync(dir)) {
    console.warn(`[siyan] watch dir missing: ${dir}`);
    return;
  }
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    try {
      if (fs.statSync(full).isFile()) enqueue(full);
    } catch {
      /* ignore */
    }
  }
}
