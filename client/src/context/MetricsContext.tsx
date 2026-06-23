import React, { createContext, useContext } from 'react'
import type { MetricData, ConnectionStatus } from '../types'
import { useSSEMetrics } from '../hooks/useSSEMetrics'

interface MetricsCtx {
  current: MetricData
  history: MetricData[]
  connectionStatus: ConnectionStatus
}

const MetricsContext = createContext<MetricsCtx | null>(null)

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const metrics = useSSEMetrics()
  return <MetricsContext.Provider value={metrics}>{children}</MetricsContext.Provider>
}

export function useMetrics(): MetricsCtx {
  const ctx = useContext(MetricsContext)
  if (!ctx) throw new Error('useMetrics: missing MetricsProvider')
  return ctx
}
