import { config } from "./config.js";

export function startScheduler(queue, eventId = config.eventId) {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await queue.sweepExpiredActive(eventId);
      await queue.admitBatch(eventId, config.admitPerSec);
    } catch (err) {
      console.error("[scheduler]", err.message);
    } finally {
      busy = false;
    }
  }, 1000);

  if (typeof timer.unref === "function") timer.unref();
  return () => clearInterval(timer);
}
