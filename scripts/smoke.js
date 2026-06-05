/**
 * scripts/smoke.js — k6 Smoke Test
 * ====================================
 * Purpose: Sanity check. Verify the system works with minimal load.
 * 1 VU, 30 seconds. If this fails, something is fundamentally broken.
 *
 * Run: k6 run scripts/smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],       // <1% errors
    http_req_duration: ['p(99)<500'],     // p99 under 500ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Hit the demo endpoint — rate limited at 10/min so smoke never trips it
  const res = http.get(`${BASE_URL}/demo`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has X-RateLimit-Limit header': (r) => r.headers['X-Ratelimit-Limit'] !== undefined,
    'has X-RateLimit-Remaining header': (r) => r.headers['X-Ratelimit-Remaining'] !== undefined,
  });
  sleep(1);
}
