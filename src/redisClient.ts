/**
 * redisClient.ts — UPGRADE 1: ioredis Cluster-aware Client
 * ══════════════════════════════════════════════════════════
 *
 * WHY CLUSTER?
 *   A single Redis node is a SPOF (Single Point of Failure). Redis Cluster
 *   shards data across N primary nodes, each with M replicas. If a primary
 *   dies, a replica is promoted automatically — zero manual failover. At
 *   10k RPS, cluster also gives horizontal write throughput scaling.
 *
 * CLUSTER vs SENTINEL:
 *   Sentinel gives HA for a single shard (automatic failover, no sharding).
 *   Cluster gives both HA AND sharding. We use Cluster here.
 *
 * LUA + CLUSTER — THE CRITICAL CONSTRAINT:
 *   In Cluster mode, ALL keys touched by a Lua script must hash to the same
 *   slot. Redis Cluster uses CRC16(key) % 16384 to route keys. A Lua script
 *   touching keys on different nodes would require a cross-node transaction —
 *   which Redis does not support.
 *
 *   SOLUTION: Redis Hash Tags — {tag} — force CRC16 to be computed only on
 *   the content inside {}, so:
 *     rl:{ip:1.2.3.4}:public  → slot = CRC16("ip:1.2.3.4") % 16384
 *     rl:{ip:1.2.3.4}:upload  → same slot
 *   All rate-limit keys for one user always land on the same node.
 */

import IORedis from 'ioredis';
import type { Redis as IORedisInstance, Cluster } from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Types ───────────────────────────────────────────────────────────────────

/** Union type so the rest of the codebase doesn't care whether it's cluster or standalone */
export type RedisClient = IORedisInstance | Cluster;

// ─── Singleton Instance ───────────────────────────────────────────────────────

let instance: RedisClient | null = null;

/**
 * Parses a comma-separated REDIS_CLUSTER_NODES env var into ioredis node list.
 * Format: "host1:6379,host2:6380,host3:6381"
 */
function parseClusterNodes(raw: string): Array<{ host: string; port: number }> {
  return raw.split(',').map((entry) => {
    const [host, portStr] = entry.trim().split(':');
    return { host, port: parseInt(portStr || '6379', 10) };
  });
}

/**
 * getRedisClient()
 * ─────────────────
 * Returns a singleton ioredis client. Automatically switches between:
 *   - Cluster mode  when REDIS_CLUSTER_NODES is set
 *   - Standalone    when only REDIS_URL is set (local dev / CI)
 *
 * This means your local `npm run dev` (single Redis) and your K8s deployment
 * (3-node cluster) use exactly the same code path — just different env vars.
 */
export const getRedisClient = async (): Promise<RedisClient> => {
  if (instance) return instance;

  const clusterNodes = process.env.REDIS_CLUSTER_NODES;

  if (clusterNodes) {
    // ── CLUSTER MODE ──────────────────────────────────────────────────────────
    const nodes = parseClusterNodes(clusterNodes);
    console.log(`[Redis] Connecting to cluster: ${clusterNodes}`);

    const clusterClient = new IORedis.Cluster(nodes, {
      redisOptions: {
        password:       process.env.REDIS_PASSWORD || undefined,
        tls:            process.env.REDIS_TLS === 'true' ? {} : undefined,
        connectTimeout: 5000,
      },
      clusterRetryStrategy: (times: number) => {
        if (times > 5) {
          console.error('[Redis] Cluster connection failed after 5 retries');
          return null; // stop retrying → fail-open in middleware
        }
        return Math.min(times * 200, 2000); // exponential back-off
      },
    });

    clusterClient.on('connect',   () => console.log('[Redis] Cluster connected'));
    clusterClient.on('error',     (err: Error) => console.error('[Redis] Cluster error:', err.message));

    instance = clusterClient;

  } else {
    // ── STANDALONE MODE (local dev / Docker single node) ──────────────────────
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`[Redis] Connecting to standalone: ${url}`);

    const standaloneClient = new IORedis(url, {
      password:      process.env.REDIS_PASSWORD || undefined,
      connectTimeout: 5000,
      retryStrategy: (times: number) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    standaloneClient.on('connect', () => console.log('[Redis] Standalone connected'));
    standaloneClient.on('error',   (err: Error) => console.error('[Redis] Standalone error:', err.message));

    instance = standaloneClient;
  }

  return instance;
};

/**
 * Graceful shutdown — call this in SIGTERM/SIGINT handlers.
 */
export const closeRedisClient = async (): Promise<void> => {
  if (instance) {
    await instance.quit();
    instance = null;
    console.log('[Redis] Connection closed gracefully');
  }
};
