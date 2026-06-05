--[[
  LEAKY BUCKET — Atomic Lua Script
  ==================================
  Algorithm: Leaky bucket for smooth throughput enforcement.

  Concept:
  ────────
  Unlike token bucket (which allows bursts), leaky bucket "leaks" at a constant
  rate regardless of input. Think of a bucket with a hole: water drips out at
  a fixed rate. If water fills faster than it leaks → overflow → reject.

  This is the algorithm CDNs and network hardware use for traffic shaping,
  because it guarantees a perfectly smooth output rate.

  Key properties:
  ✅ Zero burst tolerance — enforces strict smooth throughput
  ✅ Prevents thundering herd from overwhelming downstream services
  ✅ Ideal for: payment APIs, SMS sending, email dispatch, rate-limited 3rd party calls
  ❌ Legitimately bursty-but-valid traffic (e.g. app startup) will be rejected
  ❌ More complex to reason about than fixed window

  State stored per key (Redis Hash):
  - water     : current "water level" in the bucket (float)
  - timestamp : last check timestamp (ms)

  KEYS[1]  = rate limit key
  ARGV[1]  = capacity        max bucket size (queue depth before overflow)
  ARGV[2]  = leakRate        requests drained per millisecond
  ARGV[3]  = now             current epoch milliseconds
  ARGV[4]  = cost            water added by this request (default 1)

  Returns: { allowed (0|1), current_level, resetAt_ms }
]]

local key      = KEYS[1]
local capacity = tonumber(ARGV[1])
local leakRate = tonumber(ARGV[2])  -- requests/ms drained
local now      = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])

-- Read current bucket state
local lastWater    = tonumber(redis.call('HGET', key, 'water'))
local lastChecked  = tonumber(redis.call('HGET', key, 'timestamp'))

-- Bootstrap
if lastWater   == nil then lastWater   = 0   end
if lastChecked == nil then lastChecked = now end

-- Leak: drain water that has flowed out since last check
local elapsed   = math.max(0, now - lastChecked)
local leaked    = elapsed * leakRate
local newWater  = math.max(0, lastWater - leaked)

-- Try to add this request's cost to the bucket
local allowed = (newWater + cost) <= capacity

if allowed then
  newWater = newWater + cost
end

-- Persist
local ttlMs = math.ceil((capacity / leakRate) * 2)  -- 2× fill time in ms
redis.call('HSET', key, 'water',     newWater)
redis.call('HSET', key, 'timestamp', now)
redis.call('PEXPIRE', key, ttlMs)

-- resetAt: when enough water will have leaked that we could accept 1 more request
local overflow   = newWater - capacity
local resetAt    = now
if not allowed then
  -- Time for the bucket to drain enough to accept cost=1
  local drainTime = (newWater - capacity + cost) / leakRate
  resetAt = now + math.ceil(drainTime)
end

return { allowed and 1 or 0, math.floor(newWater), resetAt }
