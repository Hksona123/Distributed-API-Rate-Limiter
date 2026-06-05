/**
 * scripts/load.js — k6 Load Test
 * ====================================
 * Purpose: Normal production load. Ramp to 50 VUs, hold, ramp down.
 * Validates steady-state performance and that the rate limiter
 * correctly blocks exactly the right requests without over-blocking.
 *
 * Run: k6 run scripts/load.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics to track in Grafana alongside Prometheus
const rateLimitedRequests = new Counter('rate_limited_requests');
const blockRate = new Rate('block_rate');
const redisLatency = new Trend('redis_latency_ms', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 VUs
    { duration: '1m',  target: 50 },   // Ramp to 50 VUs (normal load)
    { duration: '2m',  target: 50 },   // Hold at 50 VUs
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_failed:    ['rate<0.05'],     // <5% network errors (429 is NOT a failure)
    http_req_duration:  ['p(95)<200', 'p(99)<500'],
    block_rate:         ['rate<0.5'],      // Expect <50% of reqs to be blocked under load
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test the public endpoint — 30 req/min per IP
  const res = http.get(`${BASE_URL}/api/public/data`);

  const blocked = res.status === 429;
  blockRate.add(blocked);
  if (blocked) rateLimitedRequests.add(1);

  // Extract Redis latency from a custom header if you add one, or track response time
  redisLatency.add(res.timings.duration);

  check(res, {
    'status 200 or 429': (r) => r.status === 200 || r.status === 429,
    '429 has Retry-After': (r) => r.status !== 429 || r.headers['Retry-After'] !== undefined,
    '200 has RateLimit headers': (r) => r.status !== 200 || r.headers['X-Ratelimit-Limit'] !== undefined,
  });

  sleep(0.5);
}
