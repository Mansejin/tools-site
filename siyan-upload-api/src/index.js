import fs from "node:fs";
import { config } from "./config.js";
import { createApp } from "./app.js";
import { startWatcher } from "./watcher.js";

fs.mkdirSync(config.dataDir, { recursive: true });
if (config.doneDir) fs.mkdirSync(config.doneDir, { recursive: true });
if (config.failDir) fs.mkdirSync(config.failDir, { recursive: true });

const app = createApp();
const watcher = startWatcher();

const server = app.listen(config.port, () => {
  console.log(
    `[siyan-upload-api] http://127.0.0.1:${config.port} watch=${config.watchDir} privacy=${config.privacyStatus}`
  );
});

async function shutdown() {
  await watcher.close();
  server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
