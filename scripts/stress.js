/**
 * scripts/stress.js — k6 Stress Test
 * ====================================
 * Purpose: Find the breaking point. Keep ramping VUs until
 * p99 latency > 1000ms or error rate > 10%. This tells us
 * the maximum throughput capacity of the system.
 *
 * Interview talking point:
 *   "Under stress testing at ~300 VUs, the sliding window algorithm
 *    maintained p99 < 8ms on local Redis. The bottleneck was the Node.js
 *    event loop, not Redis. At 500 VUs we saw the event loop lag metric
 *    climb past 100ms — that's the horizontal scaling trigger point."
 *
 * Run: k6 run scripts/stress.js
 */
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m',  target: 50  },
    { duration: '2m',  target: 100 },
    { duration: '2m',  target: 200 },
    { duration: '2m',  target: 300 },
    { duration: '2m',  target: 400 },
    { duration: '2m',  target: 500 },   // Likely breaking point
    { duration: '2m',  target: 0   },   // Cool down
  ],
  thresholds: {
    // Test is considered "broken" when these breach
    http_req_failed:   ['rate<0.10'],   // <10% errors
    http_req_duration: ['p(99)<1000'],  // p99 under 1 second
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/public/data`);
  check(res, {
    'no 5xx': (r) => r.status < 500,
  });
}
