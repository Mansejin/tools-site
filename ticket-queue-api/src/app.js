import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { verifyToken } from "./queueService.js";

function eventIdParam(req) {
  return req.params.eventId || config.eventId;
}

export function createApp(queue) {
  const app = express();
  app.use(
    cors({
      origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","),
    })
  );
  app.use(express.json({ limit: "32kb" }));

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

  app.post("/v1/events/:eventId/join", async (req, res) => {
    try {
      const out = await queue.join(eventIdParam(req));
      res.status(201).json(out);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  app.get("/v1/events/:eventId/status", async (req, res) => {
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

  app.post("/v1/events/:eventId/book", async (req, res) => {
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

  app.post("/v1/events/:eventId/admin/reset", async (req, res) => {
    if (process.env.NODE_ENV === "production" && req.get("x-admin-secret") !== config.tokenSecret) {
      return res.status(403).json({ error: "forbidden" });
    }
    try {
      res.json(await queue.reset(eventIdParam(req)));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}
