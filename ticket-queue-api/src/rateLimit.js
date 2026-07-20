/**
 * Tiny in-memory fixed-window rate limiter (no extra deps).
 * Enough to blunt casual abuse; not a substitute for Cloudflare WAF.
 */

export function createRateLimiter({ windowMs, max, name = "rate" }) {
  const hits = new Map();

  function prune(now) {
    if (hits.size < 2000) return;
    for (const [key, entry] of hits) {
      if (now - entry.start >= windowMs) hits.delete(key);
    }
  }

  return function rateLimit(req, res, next) {
    const ip =
      req.get("cf-connecting-ip") ||
      String(req.get("x-forwarded-for") || "")
        .split(",")[0]
        .trim() ||
      req.ip ||
      "unknown";
    const now = Date.now();
    prune(now);
    let entry = hits.get(ip);
    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
      hits.set(ip, entry);
    }
    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    if (entry.count > max) {
      const retrySec = Math.ceil((windowMs - (now - entry.start)) / 1000);
      res.setHeader("Retry-After", String(Math.max(1, retrySec)));
      return res.status(429).json({ error: "rate_limited", limit: name });
    }
    next();
  };
}
