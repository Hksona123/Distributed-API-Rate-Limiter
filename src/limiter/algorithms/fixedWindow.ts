/**
 * algorithms/fixedWindow.ts
 * ──────────────────────────
 * Fixed Window Counter rate limiter — fast, minimal memory, slight boundary flaw.
 * See src/lua/fixed_window.lua for full algorithm commentary.
 *
 * FIX: Migrated from node:redis API to ioredis API.
 *   node:redis: redis.evalSha(sha, { keys: [], arguments: [] })
 *   ioredis:    redis.evalsha(sha, numkeys, key1, arg1, arg2, ...)
 *               redis.script('load', script)  (not scriptLoad)
 */
import { getRedisClient } from '../../redisClient';
import { FIXED_WINDOW_SCRIPT } from '../luaLoader';
import { RateLimitResult } from '../types';

let scriptSHA: string | null = null;

/**
 * @param redisKey  Full namespaced Redis key (uses rl:fw: prefix convention)
 * @param windowMs  Window size in milliseconds (one fixed window duration)
 * @param limit     Max requests per window
 */
export const checkFixedWindow = async (
  redisKey: string,
  windowMs: number,
  limit: number
): Promise<RateLimitResult> => {
  const redis = await getRedisClient() as any;
  const now = Date.now();

  const runScript = async (): Promise<unknown> => {
    if (scriptSHA) {
      try {
        // ioredis: evalsha(sha, numkeys, key1, arg1, arg2, ...)
        return await redis.evalsha(
          scriptSHA, 1, redisKey,
          limit.toString(), windowMs.toString(), now.toString()
        );
      } catch (err: any) {
        if (err?.message?.includes('NOSCRIPT')) scriptSHA = null;
        else throw err;
      }
    }
    // ioredis: script('load', script) — not scriptLoad()
    scriptSHA = await redis.script('load', FIXED_WINDOW_SCRIPT);
    return redis.evalsha(
      scriptSHA, 1, redisKey,
      limit.toString(), windowMs.toString(), now.toString()
    );
  };

  const result = (await runScript()) as [number, number, number, number];
  return {
    allowed:   result[0] === 1,
    count:     result[1],
    remaining: result[2],
    resetAt:   result[3],
  };
};
