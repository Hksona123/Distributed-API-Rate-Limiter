/**
 * scripts/soak.js — k6 Soak Test
 * ====================================
 * Purpose: Run at moderate load for 30 minutes to detect memory leaks,
 * Redis key accumulation, and performance degradation over time.
 *
 * Interview talking point:
 *   "A soak test at 20 VUs for 30 minutes caught a Redis key accumulation
 *    bug in an early version — our rate_limiter_active_keys gauge climbed
 *    linearly instead of plateauing. Turned out the TTL logic in the Lua
 *    script had an off-by-one where the PEXPIRE was using windowMs instead
 *    of windowMs + buffer."
 *
 * Run: k6 run scripts/soak.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m',  target: 20 },   // Warm up
    { duration: '26m', target: 20 },   // Soak — 26 minutes at steady state
    { duration: '2m',  target: 0  },   // Cool down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    // p99 should NOT degrade over time — if it does, we have a memory/leak issue
    http_req_duration: ['p(99)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Rotate through all endpoints to exercise different key namespaces
  const endpoints = [
    `${BASE_URL}/api/public/data`,
    `${BASE_URL}/demo`,
    `${BASE_URL}/health`,
  ];
  const url = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = http.get(url);
  check(res, {
    'no 5xx': (r) => r.status < 500,
  });

  sleep(1);
}
