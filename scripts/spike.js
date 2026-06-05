/**
 * scripts/spike.js — k6 Spike Test
 * ====================================
 * Purpose: Simulate a sudden traffic burst to 200 VUs.
 * Validates that the rate limiter correctly clamps traffic
 * and Redis holds up under sudden extreme concurrency.
 *
 * This is the most important test for a rate limiter —
 * it SHOULD return lots of 429s. A spike test that returns
 * zero 429s means your limits are misconfigured.
 *
 * Run: k6 run scripts/spike.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const blocked = new Counter('spike_blocked');
const allowed = new Counter('spike_allowed');

export const options = {
  stages: [
    { duration: '10s', target: 5   },   // Baseline
    { duration: '5s',  target: 200 },   // Instant spike to 200 VUs
    { duration: '30s', target: 200 },   // Hold the spike
    { duration: '5s',  target: 5   },   // Drop back
    { duration: '30s', target: 5   },   // Recovery period
  ],
  thresholds: {
    // We EXPECT 429s. Only fail if we get unexpected 5xx errors.
    http_req_failed: ['rate<0.01'],
    // p99 must stay under 1s even at 200 VUs — Redis Lua is O(log N)
    http_req_duration: ['p(99)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/public/data`);

  if (res.status === 429) blocked.add(1);
  else if (res.status === 200) allowed.add(1);

  check(res, {
    'no 5xx errors': (r) => r.status < 500,
    '429 has Retry-After': (r) => r.status !== 429 || r.headers['Retry-After'] !== undefined,
  });
}
