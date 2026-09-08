import chokidar from "chokidar";
import path from "node:path";
import { config } from "./config.js";
import { scheduleEnqueue, scanWatchDir } from "./queue.js";

export function startWatcher() {
  const watchDir = path.resolve(config.watchDir);
  console.log(
    `[siyan] watching ${watchDir} polling=${config.usePolling} pollMs=${config.pollIntervalMs} rescanSec=${config.rescanSec}`
  );

  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
    // NAS Docker bind mounts: inotify often silent — polling required
    usePolling: config.usePolling,
    interval: config.pollIntervalMs,
    binaryInterval: config.pollIntervalMs,
    awaitWriteFinish: {
      stabilityThreshold: config.stableMs,
      pollInterval: 1000,
    },
    depth: 0,
  });

  watcher.on("add", (filePath) => scheduleEnqueue(filePath));
  watcher.on("change", (filePath) => scheduleEnqueue(filePath));
  watcher.on("error", (err) => console.error("[siyan] watcher error:", err));
  watcher.on("ready", () => {
    console.log("[siyan] watcher ready — scanning existing files");
    scanWatchDir();
  });

  let rescanTimer = null;
  if (config.rescanSec > 0) {
    rescanTimer = setInterval(() => {
      scanWatchDir();
    }, config.rescanSec * 1000);
    if (typeof rescanTimer.unref === "function") rescanTimer.unref();
  }

  const origClose = watcher.close.bind(watcher);
  watcher.close = async () => {
    if (rescanTimer) clearInterval(rescanTimer);
    return origClose();
  };

  return watcher;
}
