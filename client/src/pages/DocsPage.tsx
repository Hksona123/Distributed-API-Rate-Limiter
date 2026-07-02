import { useState } from 'react'
import { ExternalLink, Copy, CheckCircle } from 'lucide-react'
import { BACKEND_HREF } from '../lib/api'

interface Endpoint {
  method: 'GET' | 'POST'
  path: string
  desc: string
  headers?: string[]
  body?: string
  response: string
  rl: string
}

const ENDPOINTS: Endpoint[] = [
  { method: 'GET',  path: '/health',           desc: 'Deep health check. Returns Redis ping latency, memory, and connection status.', response: '{"status":"healthy","redis":{"connected":true,"pingLatencyMs":1,"usedMemory":"1.2M"},"uptime":600}', rl: 'Not rate-limited' },
  { method: 'GET',  path: '/demo',              desc: 'Rate-limited to 10 req/min per IP. Hit it >10x to see a 429.',                  headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'], response: '{"message":"You hit the rate-limited demo endpoint!"}', rl: '10 req / 60s · IP · Sliding Window' },
  { method: 'GET',  path: '/api/public/data',  desc: 'Public tier API. 30 requests per minute per IP address.',                        response: '{"message":"Public data accessed successfully"}', rl: '30 req / 60s · IP' },
  { method: 'GET',  path: '/api/user/profile', desc: 'User tier API. 100 req/min. Pass X-User-Id header to key by user.',              headers: ['X-User-Id: your-user-id'], response: '{"message":"User profile accessed successfully"}', rl: '100 req / 60s · User-keyed' },
  { method: 'POST', path: '/api/admin/config', desc: 'Admin tier. 1000 req/min. Pass X-Role: superadmin to bypass entirely.',          headers: ['Content-Type: application/json', 'X-Admin-Id: admin-id'], body: '{}', response: '{"message":"Admin config updated"}', rl: '1000 req / 60s · API-key keyed' },
  { method: 'POST', path: '/api/upload',        desc: 'Strict upload endpoint. Only 5 uploads per minute.',                             headers: ['Content-Type: application/json'], body: '{"file":"example.jpg"}', response: '{"message":"Upload accepted"}', rl: '5 req / 60s · IP · Strict' },
  { method: 'POST', path: '/test/fire',          desc: 'Playground: runs a single sliding-window check for identifier + route.',         headers: ['Content-Type: application/json'], body: '{"identifier":"user-42","route":"/demo"}', response: '{"allowed":true,"remaining":9,"retryAfter":null}', rl: '10 req / 60s · playground namespace' },
  { method: 'GET',  path: '/metrics/stream',    desc: 'SSE stream. Emits {rps, p99Latency, rejectionRate, activeKeys} every 1 second.', response: 'data: {"rps":12,"p99Latency":2,"rejectionRate":14,"activeKeys":22}', rl: 'Not rate-limited' },
  { method: 'GET',  path: '/metrics/routes',   desc: 'Per-route aggregated stats — hits and blocked count since server start.',         response: '[{"route":"/demo","hits":189,"blocked":86}]', rl: 'Not rate-limited' },
  { method: 'GET',  path: '/metrics/log',       desc: 'Last N request log entries. Use ?limit=N (default 100).',                        response: '[{"ts":"2024-01-01T00:00:00Z","ip":"127.0.0.1","route":"/demo","status":200,"latency":2}]', rl: 'Not rate-limited' },
]

const HEADERS_429 = `HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700000060000
Retry-After: 57
Content-Type: application/json

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 57
}`

export function DocsPage() {
  const [copied,   setCopied]   = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>('/demo')

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="bg-white rounded-card shadow-card p-5 flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-txt-primary">API Reference</h2>
          <p className="text-[13px] text-txt-secondary mt-0.5">
            Distributed High-Throughput API Rate Limiter · v2.0.0 · Base URL:{' '}
            <code className="bg-page-bg px-1.5 py-0.5 rounded text-[12px] font-mono text-berry">{BACKEND_HREF}</code>
          </p>
        </div>
        <a href={`${BACKEND_HREF}/docs`} target="_blank" rel="noreferrer"
           className="flex items-center gap-1.5 text-[13px] font-semibold text-berry bg-sidebar-act
                      px-3 py-1.5 rounded-badge hover:bg-purple-100 transition-colors">
          <ExternalLink size={13} /> Swagger UI
        </a>
      </div>

      {/* 429 example */}
      <div className="bg-white rounded-card shadow-card p-5">
        <h3 className="text-[14px] font-bold text-txt-primary mb-3">Rate Limit Response (429)</h3>
        <div className="relative">
          <pre className="bg-page-bg rounded-xl text-[11px] font-mono text-txt-primary p-4 overflow-x-auto leading-relaxed">
            {HEADERS_429}
          </pre>
          <button onClick={() => copy(HEADERS_429, '429')}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-border-col text-txt-secondary hover:text-berry transition-colors">
            {copied === '429' ? <CheckCircle size={12} className="text-berry-green" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Endpoint list */}
      <div className="flex flex-col gap-3">
        {ENDPOINTS.map(ep => {
          const isOpen   = expanded === ep.path
          const curlBase = ep.headers?.map(h => `-H "${h}"`).join(' \\\n  ') ?? ''
          const curlCmd  = ep.method === 'GET'
            ? `curl ${BACKEND_HREF}${ep.path}${curlBase ? ` \\\n  ${curlBase}` : ''}`
            : `curl -X POST ${BACKEND_HREF}${ep.path}${curlBase ? ` \\\n  ${curlBase}` : ''}${ep.body ? ` \\\n  -d '${ep.body}'` : ''}`

          return (
            <div key={ep.path} className="bg-white rounded-card shadow-card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-purple-50/30 transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : ep.path)}
              >
                <span className={`px-2.5 py-0.5 rounded-badge text-[11px] font-bold flex-shrink-0 ${
                  ep.method === 'GET' ? 'bg-blue-100 text-berry-blue' : 'bg-green-100 text-berry-green'
                }`}>{ep.method}</span>
                <span className="font-mono text-[13px] font-bold text-txt-primary">{ep.path}</span>
                <span className="text-[12px] text-txt-secondary ml-2 hidden md:block truncate">{ep.desc.slice(0, 55)}…</span>
                <span className="ml-auto text-[11px] text-berry bg-sidebar-act px-2 py-0.5 rounded-badge flex-shrink-0">
                  {ep.rl}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border-col p-5 flex flex-col gap-4 bg-page-bg/30">
                  <p className="text-[13px] text-txt-secondary">{ep.desc}</p>
                  {ep.headers && (
                    <div>
                      <p className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">Headers</p>
                      {ep.headers.map(h => (
                        <span key={h} className="inline-flex items-center bg-blue-50 border border-blue-100 rounded-lg
                                                  text-[12px] font-mono text-berry-blue px-3 py-1 mr-2 mb-1">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">cURL Example</p>
                      <button onClick={() => copy(curlCmd, ep.path + '-curl')}
                        className="flex items-center gap-1 text-[11px] text-berry font-semibold hover:underline">
                        {copied === ep.path + '-curl' ? <CheckCircle size={11} className="text-berry-green" /> : <Copy size={11} />}
                        Copy
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-green-400 rounded-xl text-[11px] font-mono p-3 overflow-x-auto">{curlCmd}</pre>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">Sample Response</p>
                    <pre className="bg-page-bg rounded-xl text-[11px] font-mono text-txt-primary p-3 overflow-x-auto">{ep.response}</pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
