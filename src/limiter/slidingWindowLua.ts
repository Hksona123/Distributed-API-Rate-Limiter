export const slidingWindowLuaScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local request_id = ARGV[4]

-- Remove entries older than the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count remaining entries
local count = redis.call('ZCARD', key)

if count < limit then
  -- Add current request with timestamp as both score and member
  redis.call('ZADD', key, now, now .. '-' .. request_id)
  -- Set expiry to window size to auto-clean memory
  redis.call('PEXPIRE', key, window)
  return { 1, limit - count - 1 }
else
  return { 0, 0 }
end
`;
