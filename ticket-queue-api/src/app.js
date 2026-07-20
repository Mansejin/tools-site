import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { verifyToken } from "./queueService.js";
import { createRateLimiter } from "./rateLimit.js";

function eventIdParam(req) {
  return req.params.eventId || config.eventId;
}

function requireAdmin(req, res) {
  if (process.env.NODE_ENV === "production" && req.get("x-admin-secret") !== config.tokenSecret) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

function corsOriginOption() {
  if (config.corsOrigin === "*") {
    // Browsers only: still allow * in local/dev. Prefer locking in production .env.
    return true;
  }
  const allowed = config.corsOrigin.split(",").map((s) => s.trim()).filter(Boolean);
  return (origin, cb) => {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(null, false);
  };
}

export function createApp(queue) {
  const app = express();
  // Cloudflare Tunnel / reverse proxies
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: corsOriginOption(),
    })
  );
  app.use(express.json({ limit: "32kb" }));

  const limitJoin = createRateLimiter({
    windowMs: 60_000,
    max: config.rateJoinPerMin,
    name: "join",
  });
  const limitBook = createRateLimiter({
    windowMs: 60_000,
    max: config.rateBookPerMin,
    name: "book",
  });
  const limitStatus = createRateLimiter({
    windowMs: 60_000,
    max: config.rateStatusPerMin,
    name: "status",
  });
  const limitAdmin = createRateLimiter({
    windowMs: 60_000,
    max: config.rateAdminPerMin,
    name: "admin",
  });

  app.get("/health", async (_req, res) => {
    try {
      const pong = await queue.redis.ping();
      res.json({ ok: true, redis: pong === "PONG" });
    } catch (err) {
      res.status(503).json({ ok: false, error: err.message });
    }
  });

  app.get("/v1/events/:eventId/stats", async (req, res) => {
    try {
      res.json(await queue.stats(eventIdParam(req)));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/v1/events/:eventId/bookings", async (req, res) => {
    try {
      const limit = Number(req.query.limit || 100);
      res.json({
        eventId: eventIdParam(req),
        items: queue.listBookings(eventIdParam(req), limit),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/v1/events/:eventId/join", limitJoin, async (req, res) => {
    try {
      const clientId = req.body?.clientId || req.query.clientId;
      const out = await queue.join(eventIdParam(req), clientId);
      res.status(out.resumed ? 200 : 201).json(out);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  app.get("/v1/events/:eventId/status", limitStatus, async (req, res) => {
    try {
      const eventId = eventIdParam(req);
      const { userId, token } = req.query;
      if (!verifyToken(eventId, userId, token)) {
        return res.status(401).json({ error: "invalid_token" });
      }
      res.json(await queue.status(eventId, String(userId)));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/v1/events/:eventId/book", limitBook, async (req, res) => {
    try {
      const eventId = eventIdParam(req);
      const { userId, token, seats } = req.body || {};
      if (!verifyToken(eventId, userId, token)) {
        return res.status(401).json({ error: "invalid_token" });
      }
      const want = Number(seats);
      if (!Number.isInteger(want) || want < 1 || want > 5) {
        return res.status(400).json({ error: "invalid_seats" });
      }
      const out = await queue.book(eventId, String(userId), want);
      res.json(out);
    } catch (err) {
      res.status(err.status || 500).json({
        error: err.message,
        seatsLeft: err.seatsLeft,
      });
    }
  });

  app.post("/v1/events/:eventId/admin/seats", limitAdmin, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const seats = req.body?.seats ?? req.body?.seatsTotal;
      res.json(await queue.setSeats(eventIdParam(req), seats));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  app.post("/v1/events/:eventId/admin/reset", limitAdmin, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const seats = req.body?.seats ?? req.body?.seatsTotal;
      res.json(await queue.reset(eventIdParam(req), seats));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  return app;
}
