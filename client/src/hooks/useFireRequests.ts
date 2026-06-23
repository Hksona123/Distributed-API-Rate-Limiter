import { useState, useRef, useCallback } from 'react'
import type { PlaygroundConfig, PlaygroundResult, DotStatus } from '../types'

const INITIAL: PlaygroundResult = { allowed: 0, blocked: 0, retryAfter: 0, dots: [] }

export function useFireRequests() {
  const [results,  setResults]  = useState<PlaygroundResult>(INITIAL)
  const [isFiring, setIsFiring] = useState(false)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const reset = useCallback(() => setResults(INITIAL), [])

  const fire = useCallback(async (cfg: PlaygroundConfig) => {
    if (isFiring) return
    const pending: DotStatus[] = Array(cfg.burstCount).fill('pending')
    setResults({ allowed: 0, blocked: 0, retryAfter: 0, dots: pending })
    setIsFiring(true)

    let idx = 0, allowed = 0, blocked = 0, maxRetry = 0

    const sendOne = async (i: number) => {
      try {
        const res  = await fetch('/test/fire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cfg.identifier, route: cfg.route, burstCount: 1 }),
        })
        const data = await res.json() as { allowed: boolean; remaining: number; retryAfter: number | null }
        const status: DotStatus = data.allowed ? 'allowed' : 'blocked'
        if (data.allowed) allowed++; else blocked++
        if (data.retryAfter && data.retryAfter > maxRetry) maxRetry = data.retryAfter

        setResults(prev => {
          const dots = [...prev.dots]
          dots[i] = status
          return { allowed, blocked, retryAfter: maxRetry, dots }
        })
      } catch {
        blocked++
        setResults(prev => {
          const dots = [...prev.dots]; dots[i] = 'blocked'
          return { ...prev, blocked, dots }
        })
      }
    }

    timerRef.current = setInterval(async () => {
      if (idx >= cfg.burstCount) {
        if (timerRef.current) clearInterval(timerRef.current)
        setIsFiring(false)
        if (maxRetry > 0) {
          let cd = maxRetry
          countdownRef.current = setInterval(() => {
            cd--
            setResults(p => ({ ...p, retryAfter: Math.max(0, cd) }))
            if (cd <= 0 && countdownRef.current) clearInterval(countdownRef.current)
          }, 1000)
        }
        return
      }
      await sendOne(idx++)
    }, Math.max(cfg.delayMs, 10))
  }, [isFiring])

  return { fire, results, isFiring, reset }
}
