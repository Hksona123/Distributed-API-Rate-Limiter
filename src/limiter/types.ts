/**
 * Shared types for the rate limiter system.
 *
 * RateLimitResult is the canonical response every algorithm returns.
 * Having a single interface means the middleware can swap algorithms
 * (sliding window, token bucket, etc.) with zero code changes downstream.
 */
export interface RateLimitResult {
  /** Whether this request is allowed through */
  allowed: boolean;

  /**
   * How many requests have been counted in the current window.
   * For token bucket algorithms this is capacity - remaining.
   */
  count: number;

  /** How many more requests are allowed before hitting the limit */
  remaining: number;

  /**
   * Unix epoch in milliseconds when the rate limit window resets.
   * Used to set the X-RateLimit-Reset header (RFC 6585 format: seconds).
   */
  resetAt: number;
}

/**
 * Key naming strategy constants.
 *
 * All keys share the rl: prefix for easy Redis key-space scanning/monitoring.
 * The route suffix means keys are per-route, so a user doesn't exhaust their
 * quota on /api/search by hammering /api/public — limits are independent.
 *
 * Format: rl:{strategy}:{identifier}:{route}
 *
 * Horizontal scaling: this namespace works across N gateway instances because
 * Redis is the single source of truth. Instance A and Instance B reading the
 * same rl:ip:1.2.3.4:/api/public key will agree on the rate limit state.
 */
export const buildRedisKey = (
  strategy: 'ip' | 'user' | 'apikey' | 'composite',
  identifier: string,
  route: string,
  prefix: string = 'rl'
): string => {
  // Sanitize route: remove query params, normalize slashes
  const cleanRoute = route.split('?')[0].replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  return `${prefix}:${strategy}:${identifier}:${cleanRoute}`;
};
