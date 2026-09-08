import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { getJob, listJobs } from "./store.js";
import { enqueue, getQueueSnapshot, scanWatchDir } from "./queue.js";

function adminOk(req) {
  if (!config.adminSecret) return true;
  return req.get("x-admin-secret") === config.adminSecret;
}

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin:
        config.corsOrigin === "*"
          ? true
          : config.corsOrigin.split(",").map((s) => s.trim()),
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    const ytOk = Boolean(
      config.youtube.clientId &&
        config.youtube.clientSecret &&
        config.youtube.refreshToken
    );
    res.json({
      ok: true,
      youtubeConfigured: ytOk,
      watchDir: config.watchDir,
      privacyStatus: config.privacyStatus,
      queue: getQueueSnapshot(),
    });
  });

  app.get("/v1/jobs", (req, res) => {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    res.json({ jobs: listJobs({ limit }) });
  });

  app.get("/v1/jobs/:id", (req, res) => {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "not found" });
    res.json(job);
  });

  app.post("/v1/scan", (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: "unauthorized" });
    scanWatchDir();
    res.json({ ok: true, queue: getQueueSnapshot() });
  });

  app.post("/v1/upload", (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: "unauthorized" });
    const filePath = req.body?.filePath;
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "filePath required" });
    }
    enqueue(filePath);
    res.json({ ok: true, queue: getQueueSnapshot() });
  });

  return app;
}
