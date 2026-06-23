import { Request, Response, NextFunction } from 'express';
import { slidingWindow } from '../limiter/algorithms/slidingWindow';
import {
  rateLimiterRequestsTotal,
  rateLimiterLatencyMs,
  rateLimiterRedisErrorsTotal,
  rateLimiterWindowUtilization,
} from '../metrics';
import { sanitizeIdentifier, RateLimiterError } from '../utils/sanitizeKey';
import { recordRequest } from '../routes/metricsStream';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  /**
   * Generates the Redis key for this request.
   * Use the rl:<type>:<identifier>:<route> naming convention.
   * e.g.  rl:ip:192.168.1.1:public
   *       rl:user:user-42:user_tier
   *       rl:apikey:key-abc:admin_tier
   *
   * UPGRADE 5: The identifier portion is automatically sanitized before
   * it reaches Redis. The keyGenerator only needs to supply the raw value.
   */
  keyGenerator: (req: Request) => string;
  /**
   * The key_type label for Prometheus metrics.
   */
  keyType?: 'ip' | 'user' | 'apikey' | 'composite';
  /**
   * Return true to completely bypass rate limiting for this request.
   * e.g. skip admin users, internal health check IPs, etc.
   */
  skip?: (req: Request) => boolean;
  /**
   * Optional hook called when a request is blocked.
   */
  onLimitReached?: (req: Request, res: Response) => void;
}

/**
 * rateLimit() — Middleware Factory
 * ══════════════════════════════════
 *
 * UPGRADE 1: Uses ioredis Cluster-aware client (via getRedisClient)
 * UPGRADE 5: Sanitizes every user-supplied key identifier before Redis
 *
 * RFC 6585 compliance:
 *   - 429 Too Many Requests
 *   - Retry-After (seconds until window resets)
 *   - X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset
 *
 * Fail-open design:
 *   Redis errors do NOT block requests. The middleware logs the error,
 *   increments the redis_errors counter (so Grafana can alert), then
 *   calls next(). A degraded rate limiter is always better than a dead API.
 */
export const rateLimit = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const routeLabel = req.route?.path || req.path;
    const keyType    = config.keyType || 'ip';

    try {
      // ── 1. Skip check ────────────────────────────────────────────────────
      if (config.skip && config.skip(req)) {
        return next();
      }

      // ── 2. Key generation + SANITIZATION (UPGRADE 5) ────────────────────
      const rawKey = config.keyGenerator(req);

      // Split key into segments and sanitize the user-controlled identifier.
      // Key format: rl:strategy:IDENTIFIER:route — only identifier is user-data.
      let safeKey: string;
      try {
        // sanitizeKey validates the entire constructed key.
        // The keyGenerator already namespaces it, so we validate the full string.
        safeKey = sanitizeIdentifier(rawKey, 'anonymous');
      } catch (err: any) {
        if (err instanceof RateLimiterError) {
          // Malformed key = malicious/broken client. Return 400, don't allow.
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid request identifier.',
            code:    err.code,
          });
          return;
        }
        throw err;
      }

      if (!safeKey) {
        return next();
      }

      // ── 3. Redis Lua execution + latency measurement ─────────────────────
      const startMs  = Date.now();
      const result   = await slidingWindow(safeKey, config.windowMs, config.max);
      const latencyMs = Date.now() - startMs;

      rateLimiterLatencyMs.labels(routeLabel).observe(latencyMs);

      // ── 4. RFC-compliant headers on EVERY response ───────────────────────
      res.setHeader('X-RateLimit-Limit',     config.max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset',     result.resetAt);

      // ── 5. Block path ─────────────────────────────────────────────────────
      if (!result.allowed) {
        rateLimiterRequestsTotal.labels('blocked', routeLabel, keyType).inc();

        if (config.onLimitReached) {
          config.onLimitReached(req, res);
        }

        const retryAfterSec = Math.max(1, Math.floor((result.resetAt - Date.now()) / 1000));
        res.setHeader('Retry-After', retryAfterSec);

        // Record to dashboard metrics
        recordRequest({
          route:     routeLabel || req.path,
          ip:        (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace('::ffff:', ''),
          allowed:   false,
          latencyMs,
          status:    429,
        });

        res.status(429).json({
          error:      'Too Many Requests',
          message:    'Rate limit exceeded. Please try again later.',
          retryAfter: retryAfterSec,
        });
        return;
      }

      // ── 6. Allow path ─────────────────────────────────────────────────────
      rateLimiterRequestsTotal.labels('allowed', routeLabel, keyType).inc();

      const utilization = (config.max - result.remaining) / config.max;
      rateLimiterWindowUtilization.labels(routeLabel).set(utilization);

      // Record to dashboard metrics
      recordRequest({
        route:     routeLabel || req.path,
        ip:        (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace('::ffff:', ''),
        allowed:   true,
        latencyMs,
        status:    200,
      });

      next();

    } catch (error: any) {
      // ── FAIL-OPEN: Redis error handling ───────────────────────────────────
      const errorType =
        error?.message?.includes('NOSCRIPT')    ? 'noscript'   :
        error?.message?.includes('ECONNREFUSED') ? 'connection' :
        error?.message?.includes('timeout')      ? 'timeout'    : 'unknown';

      rateLimiterRedisErrorsTotal.labels(errorType).inc();
      console.error(`[RateLimiter] Redis error (${errorType}): ${error?.message}`);

      // Let the request through — never take down the API over Redis
      next();
    }
  };
};
