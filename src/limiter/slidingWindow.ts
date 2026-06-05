/**
 * slidingWindow.ts (legacy entry point)
 * ──────────────────────────────────────
 * Kept for backward compatibility with older test imports.
 * The production implementation lives in algorithms/slidingWindow.ts.
 *
 * FIX: Migrated from node:redis API to ioredis API.
 *   node:redis: redis.scriptLoad(script), redis.evalSha(sha, { keys, arguments })
 *   ioredis:    redis.script('load', script), redis.evalsha(sha, numkeys, key, ...args)
 */
import { getRedisClient } from '../redisClient';
import { slidingWindowLuaScript } from './slidingWindowLua';

export interface RateLimitDecision {
  allowed: boolean;
  remainingTokens: number;
}

let scriptSHA: string | null = null;

/**
 * Checks if a request is allowed by the exact sliding window log algorithm.
 *
 * @param key      Unique key for the rate limit (e.g., ip or user_id)
 * @param windowMs Time window in milliseconds (e.g., 60000 for 1 minute)
 * @param limit    Maximum requests allowed in the time window
 */
export const checkSlidingWindow = async (
  key: string,
  windowMs: number,
  limit: number
): Promise<RateLimitDecision> => {
  const redis = await getRedisClient() as any;
  const redisKey = `rl:sw:${key}`;
  const now = Date.now();
  const requestId = Math.floor(Math.random() * 1e9).toString();

  if (!scriptSHA) {
    // ioredis: script('load', script) — caches Lua script in Redis, returns SHA
    scriptSHA = await redis.script('load', slidingWindowLuaScript);
    console.log(`[RateLimiter] Lua Script loaded into Redis with SHA: ${scriptSHA}`);
  }

  // ioredis EVALSHA format: evalsha(sha, numkeys, key1, arg1, arg2, ...)
  const result = await redis.evalsha(
    scriptSHA,
    1,           // numkeys = 1 (KEYS[1] = redisKey)
    redisKey,
    now.toString(),
    windowMs.toString(),
    limit.toString(),
    requestId
  ) as [number, number];

  return {
    allowed:        result[0] === 1,
    remainingTokens: result[1],
  };
};
