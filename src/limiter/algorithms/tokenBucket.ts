/**
 * algorithms/tokenBucket.ts
 * ──────────────────────────
 * Token Bucket rate limiter — allows bursts up to capacity.
 * See src/lua/token_bucket.lua for full algorithm commentary.
 *
 * FIX: Migrated from node:redis API to ioredis API.
 */
import { getRedisClient } from '../../redisClient';
import { TOKEN_BUCKET_SCRIPT } from '../luaLoader';
import { RateLimitResult } from '../types';

let scriptSHA: string | null = null;

/**
 * @param redisKey     Full namespaced Redis key
 * @param rate         Tokens refilled per second (e.g. 10 = 10 req/s sustained rate)
 * @param capacity     Burst ceiling — max tokens ever in the bucket
 * @param tokensNeeded Tokens consumed by this request (default 1; use >1 for costly ops)
 */
export const checkTokenBucket = async (
  redisKey: string,
  rate: number,
  capacity: number,
  tokensNeeded: number = 1
): Promise<RateLimitResult> => {
  const redis = await getRedisClient() as any;
  const nowSeconds = Date.now() / 1000;

  const runScript = async (): Promise<unknown> => {
    if (scriptSHA) {
      try {
        // ioredis: evalsha(sha, numkeys, key1, arg1, arg2, ...)
        return await redis.evalsha(
          scriptSHA, 1, redisKey,
          rate.toString(), capacity.toString(),
          nowSeconds.toString(), tokensNeeded.toString()
        );
      } catch (err: any) {
        if (err?.message?.includes('NOSCRIPT')) scriptSHA = null;
        else throw err;
      }
    }
    // ioredis: script('load', script)
    scriptSHA = await redis.script('load', TOKEN_BUCKET_SCRIPT);
    return redis.evalsha(
      scriptSHA, 1, redisKey,
      rate.toString(), capacity.toString(),
      nowSeconds.toString(), tokensNeeded.toString()
    );
  };

  const result = (await runScript()) as [number, number, number];
  const remaining = result[1];
  return {
    allowed:   result[0] === 1,
    count:     capacity - remaining,
    remaining: remaining,
    resetAt:   result[2],
  };
};
