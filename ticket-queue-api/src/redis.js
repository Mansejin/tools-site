import Redis from "ioredis";
import { config } from "./config.js";

export function createRedis() {
  const redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  redis.on("error", (err) => {
    console.error("[redis]", err.message);
  });
  return redis;
}

export function keys(eventId) {
  const p = `tq:${eventId}`;
  return {
    wait: `${p}:wait`,
    active: `${p}:active`,
    seats: `${p}:seats`,
    booked: `${p}:booked`,
    seq: `${p}:seq`,
    meta: `${p}:meta`,
  };
}

/** Check remaining seats + deduct + mark user booked — atomic */
export const BOOK_LUA = `
local seatsKey = KEYS[1]
local bookedKey = KEYS[2]
local userId = ARGV[1]
local want = tonumber(ARGV[3])
local bookedField = ARGV[2]

if redis.call('HEXISTS', bookedKey, bookedField) == 1 then
  return {0, 'already', tonumber(redis.call('GET', seatsKey) or '0')}
end

local left = tonumber(redis.call('GET', seatsKey) or '0')
if left < want then
  return {0, 'soldout', left}
end

local nextLeft = redis.call('DECRBY', seatsKey, want)
redis.call('HSET', bookedKey, bookedField, want)
return {1, 'ok', nextLeft, want}
`;
