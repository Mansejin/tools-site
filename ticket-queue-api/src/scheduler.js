import { config } from "./config.js";
import { keys } from "./redis.js";

/**
 * Only one API process runs admit/sweep each tick.
 * SET NX + short TTL so a dead leader is replaced within ~2s.
 */
export function startScheduler(queue, eventId = config.eventId) {
  let busy = false;
  const lockKey = `${keys(eventId).meta}:scheduler-lock`;
  const lockTtlSec = 2;
  const owner = `pid-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const got = await queue.redis.set(lockKey, owner, "EX", lockTtlSec, "NX");
      if (got !== "OK") {
        // renew if we already hold it
        const cur = await queue.redis.get(lockKey);
        if (cur !== owner) return;
        await queue.redis.expire(lockKey, lockTtlSec);
      }
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
