import express, { Request, Response } from 'express';
import { getRedisClient } from './redisClient';
import { getMetrics, metricsContentType } from './metrics';
import { apiRouter } from './routes/api';
import { docsRouter } from './routes/docs';
import { rateLimit } from './middleware/rateLimiter';
import { metricsRouter } from './routes/metricsStream';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Allow frontend dev server (Vite on :4000) to reach the backend
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOT: Connect to Redis on startup
// ─────────────────────────────────────────────────────────────────────────────
getRedisClient()
  .then(() => console.log('[Boot] Redis connected'))
  .catch((err) => console.error('[Boot] Redis connection failed (fail-open active):', err));

// ─────────────────────────────────────────────────────────────────────────────
// /metrics — Prometheus scrape endpoint
// Must be unauthenticated so Prometheus can reach it.
// In production, protect with network policy (only Prometheus pod can reach it).
// ─────────────────────────────────────────────────────────────────────────────
app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', metricsContentType);
  res.send(await getMetrics());
});

// ─────────────────────────────────────────────────────────────────────────────
// /health — Deep health check
// Returns Redis ping latency, memory usage, and connection status.
//
// Interview talking point:
//   "We distinguish between liveness (is the process up?) and readiness (is it
//    ready to serve traffic?). /health covers both here. In Kubernetes, you'd
//    split these into /healthz/live and /healthz/ready."
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  const start = Date.now();
  try {
    const redis = await getRedisClient();
    await redis.ping();
    const pingLatencyMs = Date.now() - start;

    // Redis INFO memory section
    const info = await redis.info('memory');
    const usedMemoryMatch = info.match(/used_memory_human:(.+)/);
    const usedMemory = usedMemoryMatch ? usedMemoryMatch[1].trim() : 'unknown';

    res.json({
      status: 'healthy',
      redis: {
        connected: true,
        pingLatencyMs,
        usedMemory,
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'degraded',
      redis: { connected: false, error: err.message },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// /demo — Live counter visitors can hammer to see rate limiting in action
// Rate limited to 10 req/min by IP so anyone visiting the demo page
// can trigger a real 429 within seconds.
// ─────────────────────────────────────────────────────────────────────────────
const demoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyType: 'ip',
  keyGenerator: (req: Request) => `rl:ip:${req.ip}:demo`,
});

let demoHitCount = 0; // global counter just for fun display

app.get('/demo', demoLimiter, (_req: Request, res: Response) => {
  demoHitCount++;
  res.json({
    message: 'You hit the rate-limited demo endpoint!',
    totalGlobalHits: demoHitCount,
    tip: 'Hit this endpoint >10 times in a minute to trigger a 429.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/* — All tiered API routes (defined in routes/api.ts)
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─────────────────────────────────────────────────────────────────────────────
// /metrics/stream, /metrics/routes, /metrics/log — SSE + dashboard data
// /test/fire — playground single-request endpoint
// ─────────────────────────────────────────────────────────────────────────────
app.use('/metrics', metricsRouter);
app.use('/test',    metricsRouter);

// ─────────────────────────────────────────────────────────────────────────────
// /docs — Swagger API documentation
// ─────────────────────────────────────────────────────────────────────────────
app.use('/docs', docsRouter);

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Distributed High-Throughput API Rate Limiter',
    version: '2.0.0',
    endpoints: {
      docs: 'GET /docs        (Interactive Swagger API Documentation)',
      health: 'GET /health      (Deep Redis infrastructure health status)',
      metrics: 'GET /metrics     (Prometheus performance telemetry metrics)',
      demo: 'GET /demo        (10 req/min, IP-keyed interactive test endpoint)',
      public: 'GET /api/public/data  (30 req/min, IP-keyed)',
      user: 'GET /api/user/profile  (100 req/min, user-keyed)',
      admin: 'POST /api/admin/config (1000 req/min, skippable)',
      upload: 'POST /api/upload       (5 req/min, strict)',
    },
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Metrics at http://localhost:${PORT}/metrics`);
  console.log(`[Server] Health at http://localhost:${PORT}/health`);
});
