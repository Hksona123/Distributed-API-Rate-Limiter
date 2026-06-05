export const tokenBucketLuaScript = `
local rate_limit_key = KEYS[1]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local fill_time = capacity / rate
local ttl = math.floor(fill_time * 2)

local last_tokens = tonumber(redis.call("HGET", rate_limit_key, "tokens"))
if last_tokens == nil then
  last_tokens = capacity
end

local last_refreshed = tonumber(redis.call("HGET", rate_limit_key, "timestamp"))
if last_refreshed == nil then
  last_refreshed = 0
end

local delta = math.max(0, now - last_refreshed)
local filled_tokens = math.min(capacity, last_tokens + (delta * rate))
local allowed = filled_tokens >= requested

local new_tokens = filled_tokens
if allowed then
  new_tokens = filled_tokens - requested
end

redis.call("HSET", rate_limit_key, "tokens", new_tokens)
redis.call("HSET", rate_limit_key, "timestamp", now)
redis.call("EXPIRE", rate_limit_key, ttl)

return { allowed and 1 or 0, new_tokens }
`;
