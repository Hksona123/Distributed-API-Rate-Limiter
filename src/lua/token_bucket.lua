--[[
  TOKEN BUCKET — Atomic Lua Script
  =================================
  Algorithm: Token bucket with burst tolerance.

  Concept:
  ────────
  Imagine a bucket with `capacity` tokens. Tokens refill at `rate` tokens/sec.
  Each request consumes one (or more) tokens. If the bucket is empty → reject.

  Key properties:
  ✅ Allows bursting up to `capacity` requests instantly (good for APIs that
     need to handle sudden legitimate spikes, e.g. app startup fetching config)
  ✅ Enforces long-term average rate via the refill mechanic
  ✅ Works well for user-facing APIs that have natural bursty access patterns
  ❌ More complex state (two fields per key vs one counter)
  ❌ "Starvation" possible if a burst completely drains the bucket

  State stored per key (Redis Hash):
  - tokens    : current token count (float)
  - timestamp : last refill timestamp (seconds, float for sub-second precision)

  KEYS[1]  = rate limit key
  ARGV[1]  = rate            tokens refilled per second
  ARGV[2]  = capacity        max tokens (burst ceiling)
  ARGV[3]  = now             current time in seconds (float)
  ARGV[4]  = requested       tokens consumed by this request (default 1)

  Returns: { allowed (0|1), remaining_tokens_floor, resetAt_ms }
]]

local key       = KEYS[1]
local rate      = tonumber(ARGV[1])
local capacity  = tonumber(ARGV[2])
local now       = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- Calculate TTL: how long until a fully drained bucket refills completely
local fillTime = capacity / rate
local ttl      = math.ceil(fillTime * 2)  -- 2× buffer for safety

-- Read current bucket state from Redis Hash
local lastTokens    = tonumber(redis.call('HGET', key, 'tokens'))
local lastRefreshed = tonumber(redis.call('HGET', key, 'timestamp'))

-- Bootstrap: first request ever for this key
if lastTokens == nil    then lastTokens    = capacity end
if lastRefreshed == nil then lastRefreshed = now end

-- Refill: calculate how many tokens have accumulated since last check
local delta       = math.max(0, now - lastRefreshed)
local filledTokens = math.min(capacity, lastTokens + (delta * rate))

local allowed   = filledTokens >= requested
local newTokens = filledTokens

if allowed then
  newTokens = filledTokens - requested
end

-- Persist updated state atomically
redis.call('HSET', key, 'tokens',    newTokens)
redis.call('HSET', key, 'timestamp', now)
redis.call('EXPIRE', key, ttl)

-- resetAt: time until bucket is full again (for Retry-After header)
local tokensNeeded = requested - newTokens
local secondsToRefill = 0
if not allowed then
  secondsToRefill = tokensNeeded / rate
end
local resetAt = math.floor((now + secondsToRefill) * 1000)  -- convert to ms

return { allowed and 1 or 0, math.floor(newTokens), resetAt }
