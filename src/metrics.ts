import client from 'prom-client';

/**
 * metrics.ts — Phase 4 Observability
 * =====================================
 * 
 * Why prom-client?
 *   It's the de-facto standard Node.js Prometheus client. It auto-handles
 *   text serialization in the /metrics exposition format that Prometheus scrapes.
 *
 * Why collectDefaultMetrics()?
 *   This registers ~30 OS/Node metrics for free: event loop lag, GC pauses,
 *   heap usage, CPU usage, file descriptors. Senior engineers always include
 *   this — it catches memory leaks and CPU spikes without extra code.
 *
 * Interview talking point:
 *   "We expose /metrics as a pull-based endpoint. Prometheus scrapes it every 15s.
 *    This is better than push-based telemetry because metrics survive if the app
 *    crashes — Prometheus records the gap rather than missing the crash."
 */

// Prometheus registry — single source of truth for all metrics.
// Using the default global registry so collectDefaultMetrics also publishes there.
const register = client.register;

// Automatically collect: event loop lag, GC, heap, memory, CPU, open file descriptors
client.collectDefaultMetrics({ register });

// ─────────────────────────────────────────────────────────────────────────────
// 1. COUNTER — Total requests processed by the rate limiter
//    Labels let Grafana split by route, key_type, and status in one query.
//
//    status    = "allowed" | "blocked"
//    route     = "/api/public/data" | "/api/upload" | etc.
//    key_type  = "ip" | "user" | "apikey" | "composite"
//
//    Interview: "Counters only ever go up. We never reset them. Grafana uses
//    rate() to compute req/sec which makes them monotonic-safe across restarts."
// ─────────────────────────────────────────────────────────────────────────────
export const rateLimiterRequestsTotal = new client.Counter({
  name: 'rate_limiter_requests_total',
  help: 'Total requests processed by the rate limiter, labelled by status, route and key_type',
  labelNames: ['status', 'route', 'key_type'],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. HISTOGRAM — End-to-end latency of the Redis Lua execution
//
//    Buckets are chosen to capture:
//      - Sub-millisecond (0.5ms, 1ms)  → fast local Redis
//      - Typical range   (2ms–10ms)    → network latency to managed Redis
//      - Slow tail       (25ms–100ms)  → overloaded Redis or slow Lua
//      - Very slow       (250ms+)      → something is wrong
//
//    Interview: "We use a histogram not a gauge because we care about the
//    distribution across all requests, not just the current value. p99 latency
//    from a histogram is far more informative than an average."
// ─────────────────────────────────────────────────────────────────────────────
export const rateLimiterLatencyMs = new client.Histogram({
  name: 'rate_limiter_latency_ms',
  help: 'Latency of Redis Lua script execution in milliseconds (p50, p95, p99)',
  buckets: [0.5, 1, 2, 5, 10, 25, 50, 100, 250],
  labelNames: ['route'],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. COUNTER — Redis errors (connection timeouts, NOSCRIPT, etc.)
//
//    This counter going up is a PagerDuty-level alert in production.
//    We separate error types so we can triage: is this a Lua error or
//    a network partition?
//
//    Interview: "We alert if redis_errors > 0 for 2 consecutive scrape
//    intervals. Combined with our fail-open design, this means the API stays
//    alive but engineers are immediately notified of the degraded state."
// ─────────────────────────────────────────────────────────────────────────────
export const rateLimiterRedisErrorsTotal = new client.Counter({
  name: 'rate_limiter_redis_errors_total',
  help: 'Total Redis errors encountered during rate limit checks',
  labelNames: ['error_type'], // e.g. "connection", "noscript", "timeout"
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GAUGE — Number of unique rate limit keys currently tracked in Redis
//
//    This is approximate — we sample it every 30s via the refreshActiveKeys()
//    function below. It is a useful capacity planning metric.
//
//    Interview: "If active_keys is growing unboundedly, our TTL logic is broken
//    or we have a key explosion from untrusted user input. This gauge lets us
//    catch that before Redis OOMs."
// ─────────────────────────────────────────────────────────────────────────────
export const rateLimiterActiveKeys = new client.Gauge({
  name: 'rate_limiter_active_keys',
  help: 'Approximate number of unique rate limit keys currently tracked in Redis',
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GAUGE — Window utilization per route (avg % of limit consumed)
//
//    Updated on every allowed request. If a route's utilization consistently
//    hits 90%+, it's time to raise the limit or investigate abuse.
//
//    Interview: "This gauge drives our capacity planning. When utilization
//    trends above 80%, we proactively scale or re-tune limits before users
//    start hitting 429s."
// ─────────────────────────────────────────────────────────────────────────────
export const rateLimiterWindowUtilization = new client.Gauge({
  name: 'rate_limiter_window_utilization',
  help: 'Fraction of rate limit window consumed (0.0 to 1.0) per route',
  labelNames: ['route'],
  registers: [register],
});

/**
 * getMetrics()
 * Returns the full Prometheus text exposition format string.
 * Called by the /metrics route in index.ts.
 */
export const getMetrics = async (): Promise<string> => {
  return await register.metrics();
};

export const metricsContentType = register.contentType;
