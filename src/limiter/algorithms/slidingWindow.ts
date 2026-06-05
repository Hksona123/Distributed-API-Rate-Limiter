/**
 * algorithms/slidingWindow.ts — UPGRADE 1 (Cluster-safe hash tags)
 * ══════════════════════════════════════════════════════════════════
 *
 * CLUSTER CONSTRAINT:
 *   All KEYS[] touched by a Lua script must map to the same hash slot.
 *   We wrap the meaningful part of the key in {braces} so Redis uses
 *   only that substring for CRC16 slot calculation.
 *
 *   Before:  rl:ip:1.2.3.4:public  → CRC16 of full string → random slot
 *   After:   rl:{ip:1.2.3.4}:public → CRC16 of "ip:1.2.3.4" → deterministic slot
 *
 *   All keys for the same user/IP always land on the same Redis node.
 *   The Lua script never needs to cross node boundaries.
 *
 * EVALSHA STRATEGY (unchanged):
 *   Cache SHA after first SCRIPT LOAD. On NOSCRIPT (Redis restart), fall
 *   back to EVAL and re-cache. This saves ~500 bytes/req at 10k RPS.
 */

import { getRedisClient } from '../../redisClient';
import { SLIDING_WINDOW_SCRIPT } from '../luaLoader';
import { RateLimitResult } from '../types';

// Module-level SHA cache — one per Node.js process lifetime
let scriptSHA: string | null = null;

/**
 * Wraps the identifier portion of a Redis key in hash-tag braces.
 * This forces Redis Cluster to use only the bracketed content for
 * slot calculation — guaranteeing all keys for one user hit one node.
 *
 * Examples:
 *   addHashTag("rl:ip:1.2.3.4:public")  → "rl:{ip:1.2.3.4}:public"
 *   addHashTag("rl:user:42:upload")      → "rl:{user:42}:upload"
 *
 * The pattern: rl:(strategy:identifier):route
 * We keep prefix and suffix outside the braces (cosmetic only — they
 * don't affect slot routing since Redis ignores them when braces exist).
 */
export const addHashTag = (key: string): string => {
  // Key format: rl:strategy:identifier:route
  // We tag "strategy:identifier" as the hash-tag content
  const parts = key.split(':');
  if (parts.length < 3) return key; // malformed — pass through safely

  const prefix     = parts[0];                 // "rl"
  const tagContent = parts.slice(1, -1).join(':'); // "ip:1.2.3.4"
  const suffix     = parts[parts.length - 1];  // "public"

  return `${prefix}:{${tagContent}}:${suffix}`;
};

/**
 * Execute the sliding window Lua script against Redis (cluster-safe).
 *
 * @param redisKey  Namespaced key WITHOUT hash tags — addHashTag applied here
 * @param windowMs  Window size in milliseconds
 * @param limit     Max requests allowed per window
 */
export const slidingWindow = async (
  redisKey: string,
  windowMs: number,
  limit: number
): Promise<RateLimitResult> => {
  const redis  = await getRedisClient();
  const now    = Date.now();
  const reqId  = `${process.pid}-${Math.random().toString(36).slice(2, 9)}`;

  // Apply hash tag so all keys for same user land on same cluster node
  const clusteredKey = addHashTag(redisKey);

  const args = {
    keys:      [clusteredKey],
    arguments: [now.toString(), windowMs.toString(), limit.toString(), reqId],
  };

  const runScript = async (): Promise<RateLimitResult> => {
    let raw: unknown;

    if (scriptSHA) {
      try {
        // ioredis Cluster: evalsha is routed by KEYS[1] hash slot
        raw = await (redis as any).evalsha(scriptSHA, 1, clusteredKey,
          now.toString(), windowMs.toString(), limit.toString(), reqId);
      } catch (err: any) {
        if (err?.message?.includes('NOSCRIPT')) {
          // Redis restarted — reload script, cache new SHA, retry once
          scriptSHA = null;
          raw = await (redis as any).eval(
            SLIDING_WINDOW_SCRIPT, 1, clusteredKey,
            now.toString(), windowMs.toString(), limit.toString(), reqId
          );
        } else {
          throw err;
        }
      }
    } else {
      // First call: load script into Redis and cache SHA
      // In cluster mode, SCRIPT LOAD runs on every node automatically via ioredis
      scriptSHA = await (redis as any).script('load', SLIDING_WINDOW_SCRIPT);
      console.log(`[RateLimiter] Lua SHA cached: ${scriptSHA}`);
      raw = await (redis as any).evalsha(scriptSHA, 1, clusteredKey,
        now.toString(), windowMs.toString(), limit.toString(), reqId);
    }

    const result = raw as [number, number, number, number];
    return {
      allowed:   result[0] === 1,
      count:     result[1],
      remaining: result[2],
      resetAt:   result[3],
    };
  };

  return runScript();
};
