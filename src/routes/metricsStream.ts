/**
 * src/routes/metricsStream.ts
 * ─────────────────────────────
 * 3 endpoints for the frontend dashboard:
 *   GET  /metrics/stream   — SSE stream (1s interval)
 *   GET  /metrics/routes   — per-route aggregated stats
 *   POST /test/fire        — single rate-limit check for playground
 */
import { Router, Request, Response } from 'express'
import { getRedisClient } from '../redisClient'
import { sanitizeKey } from '../utils/sanitizeKey'

export const metricsRouter = Router()

// ─── In-memory state ─────────────────────────────────────────────────────────

interface SecondBucket {
  allowed: number
  blocked: number
  latencies: number[]  // ms per request
}

// Rolling 60-second window of per-second stats
const rollingWindow: SecondBucket[] = []
const MAX_WINDOW = 60

// Per-route stats — written by request middleware
export const routeStats = new Map<string, { hits: number; blocked: number }>()

// Log entries (last 200)
export const requestLog: Array<{
  ts: string; ip: string; route: string; status: number; latency: number
}> = []
const MAX_LOG = 200

/**
 * Called by the rate-limiter middleware on every request.
 * Records the outcome for SSE streaming.
 */
export function recordRequest(opts: {
  route: string
  ip: string
  allowed: boolean
  latencyMs: number
  status: number
}) {
  const now = Date.now()

  // 1. Rolling window (current second bucket)
  const lastBucket = rollingWindow[rollingWindow.length - 1]
  const bucketTs = lastBucket ? parseInt((lastBucket as any)._ts ?? '0') : 0
  const currentSec = Math.floor(now / 1000)

  if (!lastBucket || bucketTs < currentSec) {
    const bucket: SecondBucket & { _ts: number } = {
      allowed: opts.allowed ? 1 : 0,
      blocked: opts.allowed ? 0 : 1,
      latencies: [opts.latencyMs],
      _ts: currentSec,
    }
    rollingWindow.push(bucket as any)
    if (rollingWindow.length > MAX_WINDOW) rollingWindow.shift()
  } else {
    if (opts.allowed) lastBucket.allowed++
    else lastBucket.blocked++
    lastBucket.latencies.push(opts.latencyMs)
  }

  // 2. Route stats
  const prev = routeStats.get(opts.route) ?? { hits: 0, blocked: 0 }
  routeStats.set(opts.route, {
    hits:    prev.hits + 1,
    blocked: prev.blocked + (opts.allowed ? 0 : 1),
  })

  // 3. Log
  requestLog.push({ ts: new Date(now).toISOString(), ip: opts.ip, route: opts.route, status: opts.status, latencyMs: opts.latencyMs } as any)
  if (requestLog.length > MAX_LOG) requestLog.shift()
}

// ─── SSE — GET /metrics/stream ───────────────────────────────────────────────

metricsRouter.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = async () => {
    // Compute current-second RPS
    const lastSec = rollingWindow[rollingWindow.length - 1] as any
    const rps = lastSec ? (lastSec.allowed + lastSec.blocked) : 0

    // P99 from last 5 buckets
    const recentLatencies: number[] = []
    rollingWindow.slice(-5).forEach(b => recentLatencies.push(...b.latencies))
    recentLatencies.sort((a, b) => a - b)
    const p99idx = Math.floor(recentLatencies.length * 0.99)
    const p99Latency = recentLatencies[p99idx] ?? 0

    // Rejection rate (last 5s)
    let totalReqs = 0, totalBlocked = 0
    rollingWindow.slice(-5).forEach(b => { totalReqs += b.allowed + b.blocked; totalBlocked += b.blocked })
    const rejectionRate = totalReqs > 0 ? Math.round((totalBlocked / totalReqs) * 100) : 0

    // Active keys from Redis
    let activeKeys = 0
    try {
      const redis = await getRedisClient() as any
      activeKeys = await redis.dbsize()
    } catch { /* ignore */ }

    const payload = JSON.stringify({ rps, p99Latency: Number(p99Latency.toFixed(2)), rejectionRate, activeKeys })
    res.write(`data: ${payload}\n\n`)
  }

  const interval = setInterval(send, 1000)
  send() // immediate first send

  req.on('close', () => clearInterval(interval))
})

// ─── Route stats — GET /metrics/routes ───────────────────────────────────────

metricsRouter.get('/routes', (_req: Request, res: Response) => {
  const result = Array.from(routeStats.entries()).map(([route, s]) => ({
    route,
    hits:    s.hits,
    blocked: s.blocked,
  }))
  res.json(result)
})

// ─── Request log — GET /metrics/log ──────────────────────────────────────────

metricsRouter.get('/log', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? '100'), 200)
  res.json(requestLog.slice(-limit).map(l => ({
    ts:      (l as any).ts,
    ip:      (l as any).ip,
    route:   (l as any).route,
    status:  (l as any).status,
    latency: (l as any).latencyMs,
  })))
})

// ─── Flush — POST /metrics/flush ─────────────────────────────────────────────
// Clears the in-memory request log and route stats (not Redis keys)

metricsRouter.post('/flush', (_req: Request, res: Response) => {
  requestLog.splice(0, requestLog.length)
  routeStats.clear()
  rollingWindow.splice(0, rollingWindow.length)
  res.json({ ok: true, message: 'In-memory metrics flushed' })
})

// ─── Fire — POST /test/fire ───────────────────────────────────────────────────

import { slidingWindow } from '../limiter/algorithms/slidingWindow'
import { RateLimiterError } from '../utils/sanitizeKey'

metricsRouter.post('/fire', async (req: Request, res: Response) => {
  const { identifier, route } = req.body as { identifier: string; route: string; burstCount: number }

  try {
    const safeIdentifier = sanitizeKey(identifier ?? 'playground', { maxLength: 128 })
    const safeRoute = (route ?? '/demo').replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, 64) || '/demo'

    const key = `rl:{playground:${safeIdentifier}}:${safeRoute.replace(/\//g, '_')}`
    const start = Date.now()
    const result = await slidingWindow(key, 60_000, 10)
    const latencyMs = Date.now() - start
    const status = result.allowed ? 200 : 429

    recordRequest({
      route: safeRoute,
      ip: safeIdentifier,
      allowed: result.allowed,
      latencyMs,
      status,
    })

    res.json({
      allowed:   result.allowed,
      remaining: result.remaining ?? 0,
      retryAfter: result.allowed ? null : 60,
    })
  } catch (err) {
    if (err instanceof RateLimiterError) {
      res.status(400).json({ error: err.message, code: err.code })
    } else {
      res.status(500).json({ error: 'Internal error' })
    }
  }
})
