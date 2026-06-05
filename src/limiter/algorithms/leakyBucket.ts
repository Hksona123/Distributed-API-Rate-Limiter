/**
 * algorithms/leakyBucket.ts
 * ──────────────────────────
 * Leaky Bucket rate limiter — smooth throughput, zero burst tolerance.
 * See src/lua/leaky_bucket.lua for full algorithm commentary.
 *
 * FIX: Migrated from node:redis API to ioredis API.
 */
import { getRedisClient } from '../../redisClient';
import { LEAKY_BUCKET_SCRIPT } from '../luaLoader';
import { RateLimitResult } from '../types';

let scriptSHA: string | null = null;

/**
 * @param redisKey  Full namespaced Redis key
 * @param capacity  Bucket depth (max queued requests before overflow)
 * @param ratePerMs Drain rate in requests per millisecond
 *                  Example: 10 req/s = 10/1000 = 0.01 req/ms
 * @param cost      Water added by this request (default 1)
 */
export const checkLeakyBucket = async (
  redisKey: string,
  capacity: number,
  ratePerMs: number,
  cost: number = 1
): Promise<RateLimitResult> => {
  const redis = await getRedisClient() as any;
  const nowMs = Date.now();

  const runScript = async (): Promise<unknown> => {
    if (scriptSHA) {
      try {
        // ioredis: evalsha(sha, numkeys, key1, arg1, arg2, ...)
        return await redis.evalsha(
          scriptSHA, 1, redisKey,
          capacity.toString(), ratePerMs.toString(),
          nowMs.toString(), cost.toString()
        );
      } catch (err: any) {
        if (err?.message?.includes('NOSCRIPT')) scriptSHA = null;
        else throw err;
      }
    }
    // ioredis: script('load', script)
    scriptSHA = await redis.script('load', LEAKY_BUCKET_SCRIPT);
    return redis.evalsha(
      scriptSHA, 1, redisKey,
      capacity.toString(), ratePerMs.toString(),
      nowMs.toString(), cost.toString()
    );
  };

  const result = (await runScript()) as [number, number, number];
  const level = result[1];
  return {
    allowed:   result[0] === 1,
    count:     level,
    remaining: Math.max(0, capacity - level),
    resetAt:   result[2],
  };
};
