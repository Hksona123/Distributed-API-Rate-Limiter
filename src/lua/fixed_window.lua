--[[
  FIXED WINDOW COUNTER — Atomic Lua Script
  =========================================
  Algorithm: Simple counter that resets at fixed clock boundaries.

  Tradeoff vs Sliding Window:
  ───────────────────────────
  ✅ O(1) space per key (single integer, no ZSET)
  ✅ ~3x faster than sliding window (INCR vs ZADD+ZREMRANGE+ZCARD)
  ❌ Boundary burst problem: a user can fire limit×2 requests in 2×window
     if they send limit at end of window N and limit at start of window N+1.
     This is why sliding window is preferred for strict enforcement.

  Example: limit=100/min
  - 99 requests at 00:59 → allowed
  - 100 requests at 01:01 → all allowed (new window)
  - Effective 199 requests in ~2 seconds at the boundary — not production safe.

  When to use: High-throughput internal APIs where approximate fairness is
  acceptable and you need minimal Redis memory footprint.

  KEYS[1]  = rate limit key  e.g. rl:fw:ip:127.0.0.1:/api/public
  ARGV[1]  = limit           max requests per window
  ARGV[2]  = windowMs        window size in milliseconds (used for PEXPIRE)

  Returns: { allowed (0|1), count, remaining, resetAt_ms }
]]

local key      = KEYS[1]
local limit    = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local now      = tonumber(ARGV[3])

-- INCR is atomic: creates key at 0 if not exists, then increments
local count = redis.call('INCR', key)

if count == 1 then
  -- First request in this window — set expiry
  -- PEXPIRE = millisecond-precision expiry (better than EXPIRE for sub-second windows)
  redis.call('PEXPIRE', key, windowMs)
end

-- Calculate when this window resets
-- We use PTTL to read the remaining TTL and derive resetAt
local pttl    = redis.call('PTTL', key)
local resetAt = now + math.max(0, pttl)

if count <= limit then
  return { 1, count, limit - count, resetAt }
else
  return { 0, count, 0, resetAt }
end
