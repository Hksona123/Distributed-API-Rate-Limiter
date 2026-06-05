/**
 * tokenBucket.ts (legacy entry point)
 * ─────────────────────────────────────
 * Kept for backward compatibility. Production implementation is
 * in algorithms/tokenBucket.ts.
 *
 * FIX: Migrated from node:redis API to ioredis API.
 *   node:redis: redis.eval(script, { keys: [], arguments: [] })
 *   ioredis:    redis.eval(script, numkeys, key1, arg1, arg2, ...)
 */
import { getRedisClient } from '../redisClient';
import { tokenBucketLuaScript } from './luaScript';

export interface RateLimitDecision {
  allowed: boolean;
  remainingTokens: number;
}

/**
 * Checks if a request is allowed by the token bucket algorithm.
 *
 * @param key       Unique key for the rate limit (e.g., ip or user_id)
 * @param rate      Refill rate in tokens per second
 * @param capacity  Maximum burst capacity of the bucket
 * @param requested Number of tokens requested (default: 1)
 */
export const checkTokenBucket = async (
  key: string,
  rate: number,
  capacity: number,
  requested: number = 1
): Promise<RateLimitDecision> => {
  const redis = await getRedisClient() as any;
  const redisKey = `rl:tb:${key}`;
  const now = Date.now() / 1000.0;

  // ioredis eval format: eval(script, numkeys, key1, arg1, arg2, ...)
  const result = await redis.eval(
    tokenBucketLuaScript,
    1,           // numkeys = 1
    redisKey,
    rate.toString(),
    capacity.toString(),
    now.toString(),
    requested.toString()
  ) as [number, number];

  return {
    allowed:         result[0] === 1,
    remainingTokens: result[1],
  };
};
