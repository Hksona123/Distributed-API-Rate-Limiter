--[[
  SLIDING WINDOW LOG — Atomic Lua Script
  ======================================
  Algorithm: Exact Sliding Window Log using a Redis Sorted Set (ZSET).

  Why Lua + not MULTI/EXEC?
  ─────────────────────────
  MULTI/EXEC (Redis transactions) guarantees atomicity at the connection level
  but has a critical flaw: the WATCH/DISCARD retry loop means under high
  contention, many clients will fail and retry — O(N²) work as concurrency grows.

  A Lua script executes as a SINGLE Redis command. Redis is single-threaded
  for command execution, so the entire script runs without interleaving.
  No retries, no race conditions, O(1) contention cost regardless of concurrency.

  Algorithm steps:
  1. ZADD — log this request with timestamp as both score and member
  2. ZREMRANGEBYSCORE — evict timestamps older than (now - windowMs)
  3. ZCARD — count how many requests remain in the current window
  4. PEXPIRE — auto-expire the key when the window slides fully past

  Complexity: O(log N + M) per request where M = evicted entries (amortised O(1))

  KEYS[1]  = rate limit key  e.g. rl:ip:127.0.0.1:/api/public
  ARGV[1]  = now             current epoch in milliseconds
  ARGV[2]  = windowMs        window size in milliseconds
  ARGV[3]  = limit           max allowed requests in window
  ARGV[4]  = requestId       unique ID to avoid ZADD member collision at same ms

  Returns: { allowed (0|1), count, remaining, resetAt_ms }
]]

local key       = KEYS[1]
local now       = tonumber(ARGV[1])
local windowMs  = tonumber(ARGV[2])
local limit     = tonumber(ARGV[3])
local requestId = ARGV[4]

-- The oldest timestamp still in the window
local windowStart = now - windowMs

-- Step 1: Evict all entries that have fallen outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

-- Step 2: Count entries currently in the window (before adding this request)
local count = redis.call('ZCARD', key)

if count < limit then
  -- Step 3a: Allowed — log this request as a unique member
  -- Member = "timestamp-requestId" ensures no collision if two requests
  -- arrive within the same millisecond
  redis.call('ZADD', key, now, now .. '-' .. requestId)

  -- Step 4: Set TTL so idle keys auto-expire from Redis memory
  -- We use windowMs so the key lives exactly as long as the window
  redis.call('PEXPIRE', key, windowMs)

  local newCount   = count + 1
  local remaining  = limit - newCount
  -- resetAt = when the oldest entry in the window will expire
  local resetAt = now + windowMs

  return { 1, newCount, remaining, resetAt }
else
  -- Step 3b: Blocked — do NOT log this request (don't pollute the window)
  -- Still refresh the TTL so it doesn't expire mid-window
  redis.call('PEXPIRE', key, windowMs)

  local remaining = 0
  -- resetAt = the score of the oldest member + windowMs (when it slides out)
  local oldestEntry = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetAt = now + windowMs
  if oldestEntry and oldestEntry[2] then
    resetAt = tonumber(oldestEntry[2]) + windowMs
  end

  return { 0, count, remaining, resetAt }
end
