import { Router, Request, Response } from 'express';
import { rateLimit } from '../middleware/rateLimiter';

export const apiRouter = Router();

/**
 * Route Tiers (Phase 3 Implementation)
 * Here we define different rate limiting configurations for different API paths.
 */

// 1. PUBLIC TIER: 30 requests per minute, keyed by IP address
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req: Request) => `rl:ip:${req.ip}:public`,
});

apiRouter.get('/public/data', publicLimiter, (req: Request, res: Response) => {
  res.json({ message: 'Public data accessed successfully' });
});

// 2. USER TIER: 100 requests per minute, keyed by User ID
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => {
    // In a real app, req.user would be populated by auth middleware
    const userId = (req as any).user?.id || req.headers['x-user-id'] || 'anonymous';
    return `rl:user:${userId}:user_tier`;
  }
});

apiRouter.get('/user/profile', userLimiter, (req: Request, res: Response) => {
  res.json({ message: 'User profile accessed successfully' });
});

// 3. ADMIN TIER: 1000 req/min, skipped entirely if user is a superadmin
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  keyGenerator: (req: Request) => {
    const adminId = (req as any).user?.id || req.headers['x-admin-id'] || 'unknown';
    return `rl:apikey:${adminId}:admin_tier`;
  },
  skip: (req: Request) => {
    // Skip rate limiting entirely for super admins
    return req.headers['x-role'] === 'superadmin';
  }
});

apiRouter.post('/admin/config', adminLimiter, (req: Request, res: Response) => {
  res.json({ message: 'Admin config updated' });
});

// 4. EXPENSIVE UPLOAD ENDPOINT: 5 req/min (Strict limit)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => `rl:ip:${req.ip}:upload`,
  onLimitReached: (req: Request, res: Response) => {
    console.warn(`[WARN] IP ${req.ip} has hit the upload rate limit.`);
  }
});

apiRouter.post('/upload', uploadLimiter, (req: Request, res: Response) => {
  res.json({ message: 'File uploaded successfully' });
});
