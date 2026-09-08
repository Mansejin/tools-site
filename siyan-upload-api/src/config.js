function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function envList(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const config = {
  port: envInt("PORT", 8800),
  dataDir: process.env.DATA_DIR || new URL("../data", import.meta.url).pathname,
  watchDir: process.env.WATCH_DIR || "/watch",
  doneDir: process.env.DONE_DIR || "", // empty = leave file in place
  failDir: process.env.FAIL_DIR || "",
  extensions: envList("VIDEO_EXTENSIONS", [
    ".mp4",
    ".mov",
    ".mkv",
    ".m4v",
    ".avi",
    ".webm",
  ]),
  /** Wait until file size is unchanged for this many ms before upload */
  stableMs: envInt("STABLE_MS", 8000),
  /** Synology Docker bind mounts often miss inotify — poll by default */
  usePolling: (process.env.WATCH_POLLING || "1") !== "0",
  pollIntervalMs: envInt("WATCH_POLL_MS", 2000),
  /** Backup rescan even if watcher misses events */
  rescanSec: envInt("WATCH_RESCAN_SEC", 30),
  /** Ignore files smaller than this (bytes) — skip partial / junk */
  minBytes: envInt("MIN_BYTES", 100_000),
  /** Max concurrent YouTube uploads */
  concurrency: envInt("UPLOAD_CONCURRENCY", 1),
  // YouTube: unlisted=일부공개, private=비공개, public=공개
  // 시안 피드백용 — public 금지. 허용: unlisted | private
  privacyStatus: (() => {
    const raw = (process.env.PRIVACY_STATUS || "unlisted").toLowerCase();
    if (raw === "public") {
      console.warn(
        "[siyan] PRIVACY_STATUS=public 은 허용하지 않음 → unlisted(일부 공개)로 강제"
      );
      return "unlisted";
    }
    if (raw === "private" || raw === "unlisted") return raw;
    console.warn(`[siyan] 알 수 없는 PRIVACY_STATUS=${raw} → unlisted`);
    return "unlisted";
  })(),
  categoryId: process.env.CATEGORY_ID || "22", // People & Blogs
  titleTemplate: process.env.TITLE_TEMPLATE || "{name}",
  descriptionTemplate: (
    process.env.DESCRIPTION_TEMPLATE ||
    "시안 자동 업로드\\n원본 파일: {filename}\\n업로드: {uploadedAt}"
  ).replace(/\\n/g, "\n"),
  tags: envList("YOUTUBE_TAGS", ["시안", "피드백"]),
  playlistId: process.env.PLAYLIST_ID || "",
  youtube: {
    clientId: process.env.YT_CLIENT_ID || "",
    clientSecret: process.env.YT_CLIENT_SECRET || "",
    refreshToken: process.env.YT_REFRESH_TOKEN || "",
  },
  adminSecret: process.env.ADMIN_SECRET || "",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
