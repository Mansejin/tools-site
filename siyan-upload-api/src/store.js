import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

const JOBS_FILE = () => path.join(config.dataDir, "jobs.json");

function ensureDataDir() {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

function readRaw() {
  ensureDataDir();
  const file = JOBS_FILE();
  if (!fs.existsSync(file)) return { jobs: {} };
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { jobs: {} };
  }
}

function writeRaw(data) {
  ensureDataDir();
  const tmp = JOBS_FILE() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, JOBS_FILE());
}

export function listJobs({ limit = 50 } = {}) {
  const { jobs } = readRaw();
  return Object.values(jobs)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit);
}

export function getJob(id) {
  return readRaw().jobs[id] || null;
}

export function findJobByPath(filePath) {
  const { jobs } = readRaw();
  const norm = path.resolve(filePath);
  return (
    Object.values(jobs).find((j) => path.resolve(j.filePath) === norm) || null
  );
}

export function upsertJob(job) {
  const data = readRaw();
  const now = new Date().toISOString();
  const prev = data.jobs[job.id] || {};
  data.jobs[job.id] = {
    ...prev,
    ...job,
    createdAt: prev.createdAt || now,
    updatedAt: now,
  };
  writeRaw(data);
  return data.jobs[job.id];
}

export function markStatus(id, status, extra = {}) {
  const data = readRaw();
  const prev = data.jobs[id];
  if (!prev) return null;
  data.jobs[id] = {
    ...prev,
    ...extra,
    status,
    updatedAt: new Date().toISOString(),
  };
  writeRaw(data);
  return data.jobs[id];
}
