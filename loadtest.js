import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 50 }, // Ramp up to 50 concurrent users
    { duration: '15s', target: 50 }, // Stay at 50 users
    { duration: '5s', target: 0 },  // Ramp down
  ],
};

export default function () {
  // Hit the standard endpoint which has a sliding window limit of 50 reqs / 10s
  const res = http.get('http://localhost:3000/api/standard');
  
  check(res, {
    'is status 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  // Small sleep to simulate realistic traffic pattern
  sleep(0.1);
}
