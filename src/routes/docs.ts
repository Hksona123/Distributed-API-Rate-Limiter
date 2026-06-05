import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Distributed High-Throughput API Rate Limiter',
    version: '2.0.0',
    description: `
## Overview
A production-grade distributed API rate limiter using:
- **Node.js + Express** (TypeScript)
- **Redis 7+** with atomic Lua scripts (Sliding Window Log)
- **Prometheus + Grafana** observability stack

## Rate Limiting Algorithms
| Algorithm | Memory | Accuracy | Burst Tolerance |
|---|---|---|---|
| Sliding Window Log | O(requests) | Exact | No |
| Fixed Window Counter | O(1) | Approximate | Boundary burst |
| Token Bucket | O(1) | Approximate | Yes (configurable) |
| Leaky Bucket | O(1) | Approximate | None |

## RFC Compliance
All responses include:
- \`X-RateLimit-Limit\` — max requests per window
- \`X-RateLimit-Remaining\` — requests left in current window  
- \`X-RateLimit-Reset\` — UNIX timestamp when window resets
- \`Retry-After\` — seconds to wait (only on 429 responses)
    `,
    contact: { name: 'GitHub', url: 'https://github.com' },
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local Development' }],
  paths: {
    '/health': {
      get: {
        summary: 'Deep health check',
        description: 'Returns Redis ping latency, memory usage, and connection status.',
        tags: ['Infrastructure'],
        responses: {
          200: {
            description: 'Service healthy',
            content: {
              'application/json': {
                example: {
                  status: 'healthy',
                  redis: { connected: true, pingLatencyMs: 1, usedMemory: '1.23M' },
                  uptime: 3600,
                  timestamp: '2024-01-01T00:00:00.000Z',
                },
              },
            },
          },
          503: { description: 'Redis unavailable — fail-open active' },
        },
      },
    },
    '/demo': {
      get: {
        summary: 'Live rate-limited demo endpoint',
        description: 'Hit this >10 times per minute to trigger a real 429 response.',
        tags: ['Demo'],
        responses: {
          200: {
            description: 'Request allowed',
            headers: {
              'X-RateLimit-Limit': { schema: { type: 'integer' }, description: '10' },
              'X-RateLimit-Remaining': { schema: { type: 'integer' } },
              'X-RateLimit-Reset': { schema: { type: 'integer' }, description: 'UNIX timestamp' },
            },
            content: {
              'application/json': {
                example: { message: 'You hit the rate-limited demo endpoint!', totalGlobalHits: 42 },
              },
            },
          },
          429: {
            description: 'Rate limit exceeded',
            headers: {
              'Retry-After': { schema: { type: 'integer' }, description: 'Seconds to wait' },
            },
            content: {
              'application/json': {
                example: { error: 'Too Many Requests', retryAfter: 30 },
              },
            },
          },
        },
      },
    },
    '/api/public/data': {
      get: {
        summary: 'Public data endpoint',
        description: 'Rate limited: **30 req/min per IP**. Key type: `rl:ip`.',
        tags: ['API Tiers'],
        responses: {
          200: { description: 'Data returned successfully' },
          429: { description: 'IP rate limit exceeded' },
        },
      },
    },
    '/api/user/profile': {
      get: {
        summary: 'User profile endpoint',
        description: 'Rate limited: **100 req/min per User ID**. Key type: `rl:user`.\n\nPass `X-User-Id` header to simulate different users.',
        tags: ['API Tiers'],
        parameters: [
          { in: 'header', name: 'X-User-Id', schema: { type: 'string' }, description: 'Simulated user ID' },
        ],
        responses: {
          200: { description: 'Profile returned' },
          429: { description: 'User rate limit exceeded' },
        },
      },
    },
    '/api/admin/config': {
      post: {
        summary: 'Admin config endpoint',
        description: 'Rate limited: **1000 req/min**. Pass `X-Role: superadmin` to bypass entirely.',
        tags: ['API Tiers'],
        parameters: [
          { in: 'header', name: 'X-Role', schema: { type: 'string', enum: ['admin', 'superadmin'] } },
        ],
        responses: {
          200: { description: 'Config updated' },
          429: { description: 'Admin rate limit exceeded' },
        },
      },
    },
    '/api/upload': {
      post: {
        summary: 'File upload endpoint (expensive)',
        description: 'Strict rate limit: **5 req/min per IP**. Simulates a costly operation.',
        tags: ['API Tiers'],
        responses: {
          200: { description: 'Upload accepted' },
          429: { description: 'Upload rate limit exceeded' },
        },
      },
    },
    '/metrics': {
      get: {
        summary: 'Prometheus metrics scrape endpoint',
        description: 'Exposes all rate limiter metrics in Prometheus text format. Scraped by Prometheus every 5s.',
        tags: ['Infrastructure'],
        responses: {
          200: { description: 'Prometheus text format', content: { 'text/plain': {} } },
        },
      },
    },
  },
  tags: [
    { name: 'API Tiers', description: 'Rate-limited business API endpoints' },
    { name: 'Demo', description: 'Interactive demo endpoint' },
    { name: 'Infrastructure', description: 'Health, metrics, and observability' },
  ],
};

export const docsRouter = Router();

docsRouter.use('/', swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'Rate Limiter API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));

// Also serve the raw spec as JSON for programmatic use
docsRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});
