import { LRUCache } from 'lru-cache';

interface BucketState {
  tokens: number;
  lastRefreshed: number;
}

// Store up to 100,000 active keys in local memory
const localCache = new LRUCache<string, BucketState>({
  max: 100000,
  ttl: 1000 * 60 * 5, // 5 minutes TTL
});

export const checkLocalTokenBucket = (
  key: string,
  rate: number,
  capacity: number,
  requested: number = 1
): { allowed: boolean; remainingTokens: number } => {
  const now = Date.now() / 1000.0;
  
  let state = localCache.get(key);
  if (!state) {
    state = { tokens: capacity, lastRefreshed: now };
  }

  const delta = Math.max(0, now - state.lastRefreshed);
  const filledTokens = Math.min(capacity, state.tokens + (delta * rate));
  
  const allowed = filledTokens >= requested;
  const newTokens = allowed ? filledTokens - requested : filledTokens;

  localCache.set(key, { tokens: newTokens, lastRefreshed: now });

  return { allowed, remainingTokens: newTokens };
};
