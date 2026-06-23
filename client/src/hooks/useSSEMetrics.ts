import { useEffect, useRef, useState, useCallback } from 'react'
import type { MetricData, ConnectionStatus } from '../types'

const MAX_HISTORY = 60
const DEFAULT: MetricData = { rps: 0, p99Latency: 0, rejectionRate: 0, activeKeys: 0, timestamp: new Date().toISOString() }

export function useSSEMetrics() {
  const [current, setCurrent]   = useState<MetricData>(DEFAULT)
  const [history, setHistory]   = useState<MetricData[]>([])
  const [connectionStatus, setStatus] = useState<ConnectionStatus>('connecting')
  const esRef   = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    esRef.current?.close()
    if (retryRef.current) clearTimeout(retryRef.current)
    setStatus('connecting')

    const es = new EventSource('/metrics/stream')
    esRef.current = es

    es.onopen = () => setStatus('connected')

    es.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as MetricData
        const point: MetricData = { ...data, timestamp: new Date().toISOString() }
        setCurrent(point)
        setHistory(prev => {
          const next = [...prev, point]
          return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
        })
      } catch { /* ignore */ }
    }

    es.onerror = () => {
      es.close()
      setStatus('disconnected')
      retryRef.current = setTimeout(connect, 3000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => { esRef.current?.close(); if (retryRef.current) clearTimeout(retryRef.current) }
  }, [connect])

  return { current, history, connectionStatus }
}
