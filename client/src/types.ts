// ─── SSE Metrics ─────────────────────────────────────────────────────────────
export interface MetricData {
  rps: number
  p99Latency: number
  rejectionRate: number
  activeKeys: number
  timestamp: string
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

// ─── Route & Log ─────────────────────────────────────────────────────────────
export interface RouteMetric {
  route: string
  hits: number
  blocked: number
}

export interface LogEntry {
  ts: string
  ip: string
  route: string
  status: number
  latency: number
}

// ─── Playground ───────────────────────────────────────────────────────────────
export interface PlaygroundConfig {
  identifier: string
  route: string
  burstCount: number
  delayMs: number
}

export type DotStatus = 'allowed' | 'blocked' | 'pending'

export interface PlaygroundResult {
  allowed: number
  blocked: number
  retryAfter: number
  dots: DotStatus[]
}

// ─── Health ───────────────────────────────────────────────────────────────────
export interface HealthStatus {
  status: string
  redis: {
    connected: boolean
    pingLatencyMs?: number
    usedMemory?: string
  }
  uptime: number
  timestamp: string
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export type ActivePage =
  | 'dashboard'
  | 'live-metrics'
  | 'request-log'
  | 'alerts'
  | 'playground'
  | 'load-test'
  | 'rate-rules'
  | 'redis-config'
  | 'api-keys'
  | 'docs'
  | 'settings'
