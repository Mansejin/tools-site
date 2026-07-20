function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: envInt("PORT", 8787),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  eventId: process.env.EVENT_ID || "demo",
  seatsTotal: envInt("SEATS_TOTAL", 200),
  admitPerSec: envInt("ADMIT_PER_SEC", 40),
  activeTtlSec: envInt("ACTIVE_TTL_SEC", 180),
  tokenSecret: process.env.TOKEN_SECRET || "dev-secret",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  maxQueue: envInt("MAX_QUEUE", 5000),
  dataDir: process.env.DATA_DIR || new URL("../data", import.meta.url).pathname,
  // Per-IP fixed windows (Cloudflare CF-Connecting-IP when behind Tunnel)
  rateJoinPerMin: envInt("RATE_JOIN_PER_MIN", 20),
  rateBookPerMin: envInt("RATE_BOOK_PER_MIN", 30),
  rateStatusPerMin: envInt("RATE_STATUS_PER_MIN", 180),
  rateAdminPerMin: envInt("RATE_ADMIN_PER_MIN", 10),
};
