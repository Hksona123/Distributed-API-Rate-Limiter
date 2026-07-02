/**
 * api.ts — single source of truth for the API base URL.
 *
 * In dev:  Vite proxy rewrites /health, /metrics, /api, /test → localhost:3000
 * In prod: Nginx reverse proxy routes those same paths to the api container
 *
 * Either way the frontend always uses relative paths — no hardcoded ports.
 */

/** Base URL for the Express backend — relative in both dev and prod */
export const API_BASE = ''

/** Convenience wrapper: fetch a backend path, return parsed JSON */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

/** Full URL for links that open in a new tab (Prometheus, Swagger, etc.)
 *  In dev: uses localhost:3000 directly (Vite only proxies fetch, not hrefs)
 *  In prod: uses same origin, routed by Nginx
 */
export const BACKEND_HREF = import.meta.env.DEV
  ? 'http://localhost:3000'
  : window.location.origin
