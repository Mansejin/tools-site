import crypto from "node:crypto";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import { config } from "./config.js";
import { BOOK_LUA, keys } from "./redis.js";
import { clearBookings, countBookings, insertBooking, listBookings } from "./db.js";

function sign(userId, eventId) {
  return crypto
    .createHmac("sha256", config.tokenSecret)
    .update(`${eventId}:${userId}`)
    .digest("base64url");
}

export function verifyToken(eventId, userId, token) {
  if (!userId || !token) return false;
  const expected = sign(userId, eventId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)));
  } catch {
    return false;
  }
}

function pollTtlSec(ahead) {
  if (ahead > 500) return 3;
  if (ahead > 100) return 2;
  return 1;
}

function resolveUserId(clientId) {
  if (clientId && uuidValidate(String(clientId))) return String(clientId);
  return uuidv4();
}

export class QueueService {
  constructor(redis) {
    this.redis = redis;
    this.bookSha = null;
  }

  async initEvent(eventId = config.eventId) {
    const k = keys(eventId);
    const exists = await this.redis.exists(k.seats);
    if (!exists) {
      await this.redis.set(k.seats, String(config.seatsTotal));
      await this.redis.hset(k.meta, {
        seatsTotal: String(config.seatsTotal),
        createdAt: String(Date.now()),
      });
    }
    if (!this.bookSha) {
      this.bookSha = await this.redis.script("LOAD", BOOK_LUA);
    }
  }

  async join(eventId, clientId) {
    await this.initEvent(eventId);
    const k = keys(eventId);
    const userId = resolveUserId(clientId);
    const token = sign(userId, eventId);

    const booked = await this.redis.hget(k.booked, userId);
    if (booked) {
      return {
        eventId,
        userId,
        token,
        phase: "booked",
        seatsTaken: Number(booked),
        resumed: true,
      };
    }

    const activeScore = await this.redis.zscore(k.active, userId);
    if (activeScore != null) {
      const expiresAt = Number(activeScore) + config.activeTtlSec * 1000;
      if (Date.now() <= expiresAt) {
        return {
          eventId,
          userId,
          token,
          phase: "active",
          activeExpiresAt: expiresAt,
          resumed: true,
        };
      }
      await this.redis.zrem(k.active, userId);
    }

    const existingRank = await this.redis.zrank(k.wait, userId);
    if (existingRank != null) {
      return {
        eventId,
        userId,
        token,
        phase: "waiting",
        resumed: true,
      };
    }

    const size = await this.redis.zcard(k.wait);
    const activeCount = await this.redis.zcard(k.active);
    if (size + activeCount >= config.maxQueue) {
      const err = new Error("queue_full");
      err.status = 503;
      throw err;
    }

    const seq = await this.redis.incr(k.seq);
    const score = Date.now() + seq / 1e9;
    // NX: same clientId cannot create a second line
    const added = await this.redis.zadd(k.wait, "NX", score, userId);
    return {
      eventId,
      userId,
      token,
      phase: "waiting",
      resumed: added === 0,
    };
  }

  async status(eventId, userId) {
    await this.initEvent(eventId);
    const k = keys(eventId);
    const activeScore = await this.redis.zscore(k.active, userId);
    const seatsLeft = Number((await this.redis.get(k.seats)) || 0);
    const booked = await this.redis.hget(k.booked, userId);

    if (booked) {
      return {
        phase: "booked",
        seatsTaken: Number(booked),
        seatsLeft,
        pollTtlSec: 5,
      };
    }

    if (activeScore != null) {
      const enteredAt = Number(activeScore);
      const expiresAt = enteredAt + config.activeTtlSec * 1000;
      if (Date.now() > expiresAt) {
        await this.redis.zrem(k.active, userId);
        return {
          phase: "expired",
          seatsLeft,
          pollTtlSec: 2,
        };
      }
      return {
        phase: "active",
        activeExpiresAt: expiresAt,
        seatsLeft,
        pollTtlSec: 1,
      };
    }

    const rank = await this.redis.zrank(k.wait, userId);
    if (rank == null) {
      return { phase: "unknown", seatsLeft, pollTtlSec: 2 };
    }

    const total = await this.redis.zcard(k.wait);
    const ahead = rank;
    const behind = Math.max(0, total - rank - 1);
    return {
      phase: "waiting",
      rank: rank + 1,
      ahead,
      behind,
      total,
      seatsLeft,
      pollTtlSec: pollTtlSec(ahead),
    };
  }

  async admitBatch(eventId, n) {
    const k = keys(eventId);
    if (n <= 0) return 0;
    const popped = await this.redis.zpopmin(k.wait, n);
    if (!popped.length) return 0;
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    for (let i = 0; i < popped.length; i += 2) {
      const userId = popped[i];
      pipeline.zadd(k.active, now, userId);
    }
    await pipeline.exec();
    return popped.length / 2;
  }

  async sweepExpiredActive(eventId) {
    const k = keys(eventId);
    const cutoff = Date.now() - config.activeTtlSec * 1000;
    return this.redis.zremrangebyscore(k.active, "-inf", cutoff);
  }

  async book(eventId, userId, want) {
    await this.initEvent(eventId);
    const k = keys(eventId);

    const activeScore = await this.redis.zscore(k.active, userId);
    if (activeScore == null) {
      const err = new Error("not_active");
      err.status = 403;
      throw err;
    }
    const enteredAt = Number(activeScore);
    if (Date.now() > enteredAt + config.activeTtlSec * 1000) {
      await this.redis.zrem(k.active, userId);
      const err = new Error("active_expired");
      err.status = 403;
      throw err;
    }

    const result = await this.redis.evalsha(
      this.bookSha,
      2,
      k.seats,
      k.booked,
      userId,
      userId,
      String(want)
    );

    const ok = Number(result[0]) === 1;
    const reason = result[1];
    const seatsLeft = Number(result[2]);
    if (!ok) {
      const err = new Error(reason);
      err.status = 409;
      err.seatsLeft = seatsLeft;
      throw err;
    }

    const seatsTaken = Number(result[3]);
    await this.redis.zrem(k.active, userId);

    // Durable record (survives Redis flush / restart)
    const record = insertBooking({
      eventId,
      userId,
      seats: seatsTaken,
      seatsLeft,
    });

    return {
      ok: true,
      seatsTaken,
      seatsLeft,
      booking: record,
    };
  }

  async stats(eventId) {
    await this.initEvent(eventId);
    const k = keys(eventId);
    const [waiting, active, seatsLeft, booked] = await Promise.all([
      this.redis.zcard(k.wait),
      this.redis.zcard(k.active),
      this.redis.get(k.seats),
      this.redis.hlen(k.booked),
    ]);
    return {
      eventId,
      waiting,
      active,
      seatsLeft: Number(seatsLeft || 0),
      booked,
      persistedBookings: countBookings(eventId),
      admitPerSec: config.admitPerSec,
      activeTtlSec: config.activeTtlSec,
      maxQueue: config.maxQueue,
    };
  }

  listBookings(eventId, limit) {
    return listBookings(eventId, limit);
  }

  async reset(eventId) {
    const k = keys(eventId);
    await this.redis.del(k.wait, k.active, k.seats, k.booked, k.seq, k.meta);
    clearBookings(eventId);
    await this.initEvent(eventId);
    return this.stats(eventId);
  }
}
