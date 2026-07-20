import { config } from "./config.js";
import { createRedis } from "./redis.js";
import { QueueService } from "./queueService.js";
import { createApp } from "./app.js";
import { startScheduler } from "./scheduler.js";
import { closeDb, openDb } from "./db.js";

openDb();

const redis = createRedis();
const queue = new QueueService(redis);
await queue.initEvent(config.eventId);

const app = createApp(queue);
startScheduler(queue, config.eventId);

const server = app.listen(config.port, () => {
  console.log(
    `[ticket-queue-api] http://127.0.0.1:${config.port} event=${config.eventId} seats=${config.seatsTotal} admit/s=${config.admitPerSec} data=${config.dataDir}`
  );
});

async function shutdown() {
  server.close();
  closeDb();
  await redis.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
