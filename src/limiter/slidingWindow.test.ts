import { checkSlidingWindow } from './slidingWindow';
import { getRedisClient } from '../redisClient';

describe('Sliding Window Rate Limiter', () => {
  beforeAll(async () => {
    // Ensure Redis is connected before tests
    const redis = await getRedisClient();
    await redis.flushDb(); // Clean DB before testing
  });

  afterAll(async () => {
    const redis = await getRedisClient();
    await redis.quit(); // Close connection after tests
  });

  it('should allow requests within the limit', async () => {
    const result = await checkSlidingWindow('test_key_1', 1000, 5);
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(4);
  });

  it('should block requests that exceed the limit', async () => {
    // Limit is 2 requests per 500ms
    const key = 'test_key_2';
    
    // Request 1
    let result = await checkSlidingWindow(key, 500, 2);
    expect(result.allowed).toBe(true);
    
    // Request 2
    result = await checkSlidingWindow(key, 500, 2);
    expect(result.allowed).toBe(true);
    
    // Request 3 (should be blocked)
    result = await checkSlidingWindow(key, 500, 2);
    expect(result.allowed).toBe(false);
  });

  it('should slide the window and allow requests after time passes', async () => {
    const key = 'test_key_3';
    
    // Request 1 and 2 (max out capacity)
    await checkSlidingWindow(key, 1000, 2);
    await checkSlidingWindow(key, 1000, 2);
    
    // Blocked
    let result = await checkSlidingWindow(key, 1000, 2);
    expect(result.allowed).toBe(false);

    // Wait for the window to slide (1.1 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Request should be allowed again
    result = await checkSlidingWindow(key, 1000, 2);
    expect(result.allowed).toBe(true);
  }, 10000); // Extended timeout for setTimeout
});
